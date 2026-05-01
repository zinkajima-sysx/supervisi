import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/auth";
import { getSpreadsheet } from "@/lib/google";
import { getRows, invalidateRowsCache } from "@/lib/sheets";

export const runtime = "nodejs";

const ENTITY_TO_SHEET: Record<string, string> = {
  users: "Data_User",
  klinik: "Data_Klinik",
  upt: "Data_UPT",
};

function normalizeHeader(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[.,]/g, "")
    .replace(/\s+/g, " ");
}

const headerRowIndexCache = new Map<string, number>();

async function loadBestHeaderRow(sheet: any, required: string[] = []): Promise<string[]> {
  const requiredNormalized = required.map(normalizeHeader).filter(Boolean);
  const cacheKey = `${String(sheet?.title ?? "")}::${requiredNormalized.join("|")}`;
  const cachedIndex = headerRowIndexCache.get(cacheKey);
  if (cachedIndex) {
    try {
      await sheet.loadHeaderRow(cachedIndex);
      const headers = (sheet.headerValues ?? []) as string[];
      const normalized = headers.map(normalizeHeader).filter(Boolean);
      const hasAny = normalized.length > 0;
      const satisfies =
        requiredNormalized.length === 0 ||
        requiredNormalized.every((req) => normalized.includes(req));
      if (hasAny && satisfies) return headers;
    } catch {
    }
    headerRowIndexCache.delete(cacheKey);
  }

  for (let rowIndex = 1; rowIndex <= 10; rowIndex++) {
    try {
      await sheet.loadHeaderRow(rowIndex);
      const headers = (sheet.headerValues ?? []) as string[];
      const normalized = headers.map(normalizeHeader).filter(Boolean);
      const hasAny = normalized.length > 0;
      const satisfies =
        requiredNormalized.length === 0 ||
        requiredNormalized.every((req) => normalized.includes(req));
      if (hasAny && satisfies) {
        headerRowIndexCache.set(cacheKey, rowIndex);
        return headers;
      }
    } catch {
    }
  }
  await sheet.loadHeaderRow();
  return (sheet.headerValues ?? []) as string[];
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ entity: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { entity } = await params;
  const sheetTitle = ENTITY_TO_SHEET[entity];
  if (!sheetTitle) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  const doc = await getSpreadsheet();
  const sheet = doc.sheetsByTitle[sheetTitle];
  if (!sheet) {
    return NextResponse.json({ error: `Sheet "${sheetTitle}" not found` }, { status: 404 });
  }
  const headers = await loadBestHeaderRow(
    sheet,
    entity === "users"
      ? ["username", "password", "role"]
      : entity === "klinik"
        ? ["klinik"]
        : ["upt", "unit_kerja"]
  );

  const rows = await getRows(sheetTitle);
  return NextResponse.json({ headers, rows });
}

function requireAdmin(role?: string) {
  return (role ?? "").toUpperCase() === "ADMIN";
}

function toNumber(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function parseUserId(value: unknown): number | null {
  const raw = String(value ?? "").trim();
  const m = /^USR-(\d+)$/.exec(raw);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function formatUserId(n: number): string {
  const num = Math.max(1, Math.floor(n));
  return `USR-${String(num).padStart(4, "0")}`;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ entity: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!requireAdmin(session.user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { entity } = await params;
  const sheetTitle = ENTITY_TO_SHEET[entity];
  if (!sheetTitle) return NextResponse.json({ error: "Not Found" }, { status: 404 });

  const body = (await request.json().catch(() => null)) as { data?: Record<string, unknown> } | null;
  const data = body?.data ?? null;
  if (!data) return NextResponse.json({ error: "Missing data" }, { status: 400 });

  const doc = await getSpreadsheet();
  const sheet = doc.sheetsByTitle[sheetTitle];
  if (!sheet) return NextResponse.json({ error: `Sheet "${sheetTitle}" not found` }, { status: 404 });
  const headers = await loadBestHeaderRow(
    sheet,
    entity === "users"
      ? ["username", "password", "role"]
      : entity === "klinik"
        ? ["klinik"]
        : ["upt", "unit_kerja"]
  );

  const row: Record<string, string> = {};
  for (const h of headers) {
    if (h === "_rowNumber") continue;
    if (!String(h ?? "").trim()) continue;
    const v = data[h];
    row[h] = typeof v === "string" ? v : v == null ? "" : String(v);
  }

  if (entity === "users") {
    const existing = await sheet.getRows<Record<string, string>>();
    let max = 0;
    for (const r of existing) {
      const obj = ((r as any).toObject?.() ?? {}) as Record<string, unknown>;
      const n = parseUserId(obj.id);
      if (n && n > max) max = n;
    }
    row.id = formatUserId(max + 1);
  }

  try {
    await sheet.addRow(row as any);
    invalidateRowsCache(sheetTitle);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("master POST failed", { entity, sheetTitle }, err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ entity: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!requireAdmin(session.user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { entity } = await params;
  const sheetTitle = ENTITY_TO_SHEET[entity];
  if (!sheetTitle) return NextResponse.json({ error: "Not Found" }, { status: 404 });

  const body = (await request.json().catch(() => null)) as
    | { rowNumber?: unknown; data?: Record<string, unknown> }
    | null;
  const rowNumber = toNumber(body?.rowNumber);
  const data = body?.data ?? null;
  if (!rowNumber || !data) return NextResponse.json({ error: "Missing rowNumber/data" }, { status: 400 });

  const doc = await getSpreadsheet();
  const sheet = doc.sheetsByTitle[sheetTitle];
  if (!sheet) return NextResponse.json({ error: `Sheet "${sheetTitle}" not found` }, { status: 404 });
  const headers = await loadBestHeaderRow(
    sheet,
    entity === "users"
      ? ["username", "password", "role"]
      : entity === "klinik"
        ? ["klinik"]
        : ["upt", "unit_kerja"]
  );
  const rows = await sheet.getRows<Record<string, string>>();
  const row = rows.find((r) => (r as any).rowNumber === rowNumber);
  if (!row) return NextResponse.json({ error: "Row not found" }, { status: 404 });

  const headerSet = new Set((headers ?? []).map((h) => String(h ?? "").trim()).filter(Boolean));
  for (const [k, v] of Object.entries(data)) {
    if (k === "_rowNumber") continue;
    if (entity === "users" && k === "id") continue;
    if (!headerSet.has(k)) continue;
    (row as any)[k] = typeof v === "string" ? v : v == null ? "" : String(v);
  }
  try {
    await (row as any).save();
    invalidateRowsCache(sheetTitle);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("master PATCH failed", { entity, sheetTitle, rowNumber }, err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ entity: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!requireAdmin(session.user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { entity } = await params;
  const sheetTitle = ENTITY_TO_SHEET[entity];
  if (!sheetTitle) return NextResponse.json({ error: "Not Found" }, { status: 404 });

  const body = (await request.json().catch(() => null)) as { rowNumber?: unknown } | null;
  const rowNumber = toNumber(body?.rowNumber);
  if (!rowNumber) return NextResponse.json({ error: "Missing rowNumber" }, { status: 400 });

  const doc = await getSpreadsheet();
  const sheet = doc.sheetsByTitle[sheetTitle];
  if (!sheet) return NextResponse.json({ error: `Sheet "${sheetTitle}" not found` }, { status: 404 });
  await loadBestHeaderRow(
    sheet,
    entity === "users"
      ? ["username", "password", "role"]
      : entity === "klinik"
        ? ["klinik"]
        : ["upt", "unit_kerja"]
  );
  const rows = await sheet.getRows<Record<string, string>>();
  const row = rows.find((r) => (r as any).rowNumber === rowNumber);
  if (!row) return NextResponse.json({ error: "Row not found" }, { status: 404 });
  try {
    await (row as any).delete();
    invalidateRowsCache(sheetTitle);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("master DELETE failed", { entity, sheetTitle, rowNumber }, err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
