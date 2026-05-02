import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/auth";
import { getSpreadsheet } from "@/lib/google";
import {
  getRows,
  invalidateRowsCache,
  loadBestHeaderRow,
  normalizeHeader,
  REQUIRED_HEADERS_BY_ENTITY,
  rowToPlainObject,
} from "@/lib/sheets";

export const runtime = "nodejs";

const ENTITY_TO_SHEET: Record<string, string> = {
  users: "Data_User",
  klinik: "Data_Klinik",
  upt: "Data_UPT",
};

// Role yang hanya bisa akses UPT (bukan users/klinik) dan difilter by klinik
const SCOPED_ROLES = new Set(["KEPALA_KLINIK", "DOKTER_FUNGSIONAL"]);

function isScopedRole(role?: string) {
  return SCOPED_ROLES.has((role ?? "").toUpperCase());
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
  const role = (session.user.role ?? "").toUpperCase();

  // KEPALA_KLINIK & DOKTER_FUNGSIONAL tidak boleh akses users dan klinik
  if (isScopedRole(role) && (entity === "users" || entity === "klinik")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sheetTitle = ENTITY_TO_SHEET[entity];
  if (!sheetTitle) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  const doc = await getSpreadsheet();
  const sheet = doc.sheetsByTitle[sheetTitle];

  if (!sheet) {
    return NextResponse.json({ error: `Sheet "${sheetTitle}" not found` }, { status: 404 });
  }

  const headers = await loadBestHeaderRow(sheet, REQUIRED_HEADERS_BY_ENTITY[entity]);
  const rows = await getRows(sheetTitle);

  // Filter UPT berdasarkan klinik untuk role terbatas
  if (isScopedRole(role) && entity === "upt") {
    const wilayahKerja = (session.user.wilayahKerja ?? "").trim();
    if (wilayahKerja && wilayahKerja.toUpperCase() !== "ALL") {
      const filteredRows = rows.filter(
        (r) => String((r as any).klinik ?? "").trim().toLowerCase() === wilayahKerja.toLowerCase()
      );
      return NextResponse.json({ headers, rows: filteredRows });
    }
  }

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

  const { entity } = await params;
  const role = (session.user.role ?? "").toUpperCase();

  // KEPALA_KLINIK & DOKTER_FUNGSIONAL hanya boleh CRUD UPT
  if (isScopedRole(role) && entity !== "upt") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  // Selain scoped role, harus ADMIN
  if (!isScopedRole(role) && !requireAdmin(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sheetTitle = ENTITY_TO_SHEET[entity];
  if (!sheetTitle) return NextResponse.json({ error: "Not Found" }, { status: 404 });

  const body = (await request.json().catch(() => null)) as { data?: Record<string, unknown> } | null;
  const data = body?.data ?? null;
  if (!data) return NextResponse.json({ error: "Missing data" }, { status: 400 });

  const doc = await getSpreadsheet();
  const sheet = doc.sheetsByTitle[sheetTitle];

  if (!sheet) return NextResponse.json({ error: `Sheet "${sheetTitle}" not found` }, { status: 404 });

  const headers = await loadBestHeaderRow(sheet, REQUIRED_HEADERS_BY_ENTITY[entity]);

  const normalizedToRaw: Record<string, string> = {};
  for (const h of headers) {
    normalizedToRaw[normalizeHeader(h)] = h;
  }

  const row: Record<string, string> = {};
  for (const h of headers) {
    if (h === "_rowNumber") continue;
    const nh = normalizeHeader(h);
    if (!nh) continue;
    const v = data[h] !== undefined ? data[h] : data[nh];
    row[h] = typeof v === "string" ? v : v == null ? "" : String(v);
  }

  // Auto-fill kolom 'klinik' untuk role terbatas
  if (isScopedRole(role) && entity === "upt") {
    const wilayahKerja = (session.user.wilayahKerja ?? "").trim();
    const klinikKey = normalizedToRaw["klinik"] ?? "klinik";
    if (wilayahKerja && wilayahKerja.toUpperCase() !== "ALL") {
      row[klinikKey] = wilayahKerja;
    }
  }

  if (entity === "users") {
    const idKey = normalizedToRaw["id"] || "id";
    console.log(`[ID GEN] Entity: users, idKey: ${idKey}`);
    console.time(`[POST] users existing rows fetch for ID gen`);
    const existing = await sheet.getRows();
    console.timeEnd(`[POST] users existing rows fetch for ID gen`);
    console.log(`[ID GEN] Found ${existing.length} existing rows`);
    
    let max = 0;
    for (const r of existing) {
      const v = r.get(idKey);
      const n = parseUserId(v);
      if (n !== null && n > max) max = n;
    }
    
    row[idKey] = formatUserId(max + 1);
    console.log(`[ID GEN] New ID: ${row[idKey]} (max was ${max})`);
  }

  try {
    console.log(`[POST] Adding row to ${sheetTitle}:`, row);
    console.time(`[POST] ${entity} addRow operation`);
    await sheet.addRow(row as any);
    console.timeEnd(`[POST] ${entity} addRow operation`);
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

  const { entity } = await params;
  const role = (session.user.role ?? "").toUpperCase();

  // KEPALA_KLINIK & DOKTER_FUNGSIONAL hanya boleh CRUD UPT
  if (isScopedRole(role) && entity !== "upt") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!isScopedRole(role) && !requireAdmin(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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
  const headers = await loadBestHeaderRow(sheet, REQUIRED_HEADERS_BY_ENTITY[entity]);

  const rows = await sheet.getRows();
  const row = rows.find((r) => r.rowNumber === rowNumber);

  if (!row) return NextResponse.json({ error: "Row not found" }, { status: 404 });

  // Untuk role terbatas, pastikan row yang diedit memang milik kliniknya
  if (isScopedRole(role) && entity === "upt") {
    const wilayahKerja = (session.user.wilayahKerja ?? "").trim();
    if (wilayahKerja && wilayahKerja.toUpperCase() !== "ALL") {
      const rowKlinik = String(row.get("klinik") ?? "").trim().toLowerCase();
      if (rowKlinik !== wilayahKerja.toLowerCase()) {
        return NextResponse.json({ error: "Forbidden: bukan data klinik Anda" }, { status: 403 });
      }
    }
  }

  const normalizedToRaw: Record<string, string> = {};
  for (const h of headers) {
    normalizedToRaw[normalizeHeader(h)] = h;
  }

  const updates: Record<string, string> = {};
  for (const [k, v] of Object.entries(data)) {
    if (k === "_rowNumber") continue;
    const nk = normalizeHeader(k);
    const rawKey = normalizedToRaw[nk];
    
    if (!rawKey) {
      console.warn(`[PATCH] Key "${k}" (normalized: "${nk}") not found in headers`);
      continue;
    }
    
    // Don't allow changing ID for users
    if (entity === "users" && nk === "id") continue;

    const val = typeof v === "string" ? v : v == null ? "" : String(v);
    updates[rawKey] = val;
  }

  console.log(`[PATCH] Applying updates to row ${rowNumber}:`, updates);

  try {
    // In google-spreadsheet v5, row.assign is the preferred way
    row.assign(updates);
    await row.save();
    
    console.log(`[PATCH] Row ${rowNumber} saved successfully`);
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

  const { entity } = await params;
  const role = (session.user.role ?? "").toUpperCase();

  // KEPALA_KLINIK & DOKTER_FUNGSIONAL hanya boleh CRUD UPT
  if (isScopedRole(role) && entity !== "upt") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!isScopedRole(role) && !requireAdmin(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sheetTitle = ENTITY_TO_SHEET[entity];
  if (!sheetTitle) return NextResponse.json({ error: "Not Found" }, { status: 404 });

  const body = (await request.json().catch(() => null)) as { rowNumber?: unknown } | null;
  const rowNumber = toNumber(body?.rowNumber);
  if (!rowNumber) return NextResponse.json({ error: "Missing rowNumber" }, { status: 400 });

  const doc = await getSpreadsheet();
  const sheet = doc.sheetsByTitle[sheetTitle];
  if (!sheet) return NextResponse.json({ error: `Sheet "${sheetTitle}" not found` }, { status: 404 });
  await loadBestHeaderRow(sheet, REQUIRED_HEADERS_BY_ENTITY[entity]);
  const rows = await sheet.getRows<Record<string, string>>();
  const row = rows.find((r) => (r as any).rowNumber === rowNumber);
  if (!row) return NextResponse.json({ error: "Row not found" }, { status: 404 });

  // Untuk role terbatas, pastikan row yang dihapus memang milik kliniknya
  if (isScopedRole(role) && entity === "upt") {
    const wilayahKerja = (session.user.wilayahKerja ?? "").trim();
    if (wilayahKerja && wilayahKerja.toUpperCase() !== "ALL") {
      const rowKlinik = String((row as any).get?.("klinik") ?? (row as any)["klinik"] ?? "").trim().toLowerCase();
      if (rowKlinik !== wilayahKerja.toLowerCase()) {
        return NextResponse.json({ error: "Forbidden: bukan data klinik Anda" }, { status: 403 });
      }
    }
  }

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

