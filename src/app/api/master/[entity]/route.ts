import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/auth";
import { getSpreadsheet } from "@/lib/google";
import { getRows } from "@/lib/sheets";

export const runtime = "nodejs";

const ENTITY_TO_SHEET: Record<string, string> = {
  users: "Data_User",
  klinik: "Data_Klinik",
  upt: "Data_UPT",
};

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
  await sheet.loadHeaderRow();
  const headers = sheet.headerValues ?? [];

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
  await sheet.loadHeaderRow();
  const headers = sheet.headerValues ?? [];

  const row: Record<string, string> = {};
  for (const h of headers) {
    if (h === "_rowNumber") continue;
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

  await sheet.addRow(row as any);
  return NextResponse.json({ ok: true });
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
  const rows = await sheet.getRows<Record<string, string>>();
  const row = rows.find((r) => (r as any).rowNumber === rowNumber);
  if (!row) return NextResponse.json({ error: "Row not found" }, { status: 404 });

  for (const [k, v] of Object.entries(data)) {
    if (k === "_rowNumber") continue;
    if (entity === "users" && k === "id") continue;
    (row as any)[k] = typeof v === "string" ? v : v == null ? "" : String(v);
  }
  await (row as any).save();
  return NextResponse.json({ ok: true });
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
  const rows = await sheet.getRows<Record<string, string>>();
  const row = rows.find((r) => (r as any).rowNumber === rowNumber);
  if (!row) return NextResponse.json({ error: "Row not found" }, { status: 404 });
  await (row as any).delete();
  return NextResponse.json({ ok: true });
}
