import { getSpreadsheet } from "@/lib/google";

function normalizeHeader(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[.,]/g, "")
    .replace(/\s+/g, " ");
}

const REQUIRED_HEADERS_BY_SHEET: Record<string, string[]> = {
  Master_Data: ["daftar_daop", "daftar_unit_kerja", "daftar_upt"],
  Data_User: ["username", "password", "role"],
  Data_Klinik: ["klinik"],
  Data_UPT: ["upt", "unit_kerja"],
};

type CachedRows = { expiresAt: number; rows: Record<string, any>[] };

const headerRowIndexCache = new Map<string, number>();
const rowsCache = new Map<string, CachedRows>();

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

export function invalidateRowsCache(sheetTitle: string) {
  rowsCache.delete(sheetTitle);
}

export async function getMasterData() {
  const doc = await getSpreadsheet();
  const sheet = doc.sheetsByTitle["Master_Data"];
  if (!sheet) {
    throw new Error('Sheet "Master_Data" not found');
  }
  await loadBestHeaderRow(sheet, REQUIRED_HEADERS_BY_SHEET["Master_Data"]);

  const rows = await sheet.getRows<Record<string, string>>();
  const daftar_daop: string[] = [];
  const daftar_unit_kerja: string[] = [];
  const daftar_upt: string[] = [];

  for (const row of rows) {
    const obj = (row as any).toObject?.() as Record<string, string> | undefined;
    const daop = (obj?.daftar_daop ?? "").trim();
    const unit = (obj?.daftar_unit_kerja ?? "").trim();
    const upt = (obj?.daftar_upt ?? "").trim();
    if (daop) daftar_daop.push(daop);
    if (unit) daftar_unit_kerja.push(unit);
    if (upt) daftar_upt.push(upt);
  }

  return {
    daftar_daop: Array.from(new Set(daftar_daop)).sort(),
    daftar_unit_kerja: Array.from(new Set(daftar_unit_kerja)).sort(),
    daftar_upt: Array.from(new Set(daftar_upt)).sort(),
  };
}

export async function appendRow(
  sheetTitle: string,
  data: Record<string, string | number | boolean | Date>
) {
  const doc = await getSpreadsheet();
  const sheet = doc.sheetsByTitle[sheetTitle];
  if (!sheet) {
    throw new Error(`Sheet "${sheetTitle}" not found`);
  }
  await loadBestHeaderRow(sheet, REQUIRED_HEADERS_BY_SHEET[sheetTitle] ?? []);
  await sheet.addRow(data as any);
  invalidateRowsCache(sheetTitle);
}

export async function getRows(sheetTitle: string): Promise<Record<string, any>[]> {
  const now = Date.now();
  const cached = rowsCache.get(sheetTitle);
  if (cached && cached.expiresAt > now) return cached.rows;

  const doc = await getSpreadsheet();
  const sheet = doc.sheetsByTitle[sheetTitle];
  if (!sheet) {
    throw new Error(`Sheet "${sheetTitle}" not found`);
  }
  await loadBestHeaderRow(sheet, REQUIRED_HEADERS_BY_SHEET[sheetTitle] ?? []);
  const rows = await sheet.getRows<Record<string, string>>();
  const result = rows.map((r) => {
    const obj = ((r as any).toObject?.() ?? ({ ...(r as any) })) as Record<string, any>;
    obj._rowNumber = (r as any).rowNumber;
    return obj;
  });
  rowsCache.set(sheetTitle, { expiresAt: now + 5_000, rows: result } satisfies CachedRows);
  return result;
}
