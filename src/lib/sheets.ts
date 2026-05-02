import { getSpreadsheet } from "@/lib/google";

export function normalizeHeader(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export const REQUIRED_HEADERS_BY_ENTITY: Record<string, string[]> = {
  users: ["username", "password", "role"],
  klinik: ["klinik"],
  upt: ["upt", "unitkerja"],
  Master_Data: ["daftardaop", "daftarunitkerja", "daftarupt"],
};

const REQUIRED_HEADERS_BY_SHEET: Record<string, string[]> = {
  Master_Data: REQUIRED_HEADERS_BY_ENTITY.Master_Data,
  Data_User: REQUIRED_HEADERS_BY_ENTITY.users,
  Data_Klinik: REQUIRED_HEADERS_BY_ENTITY.klinik,
  Data_UPT: REQUIRED_HEADERS_BY_ENTITY.upt,
  Data_APD: [
    "timestamp", "tanggal_supervisi", "id_klinik", "daop", "unit_kerja", "upt",
    "helemet_type_general_g", "helemet_type_electric_e", "helemet_type_conductive_c",
    "safety_spectales", "safety_goggles", "ear_plug", "ear_muff",
    "masker", "respirator", "apron",
    "sarung_tangan_katun", "sarung_tangan_kulit", "sarung_tangan_karet", "sarung_tangan_electrical",
    "sepatu_pelindung", "apd_lainnya", "kodisi_apd_lainnya", "catatan", "foto_url",
  ],
  Data_P3K: [
    "tanggal_supervisi", "id_klinik", "daop", "unit_kerja", "upt",
    "kelas_kotak", "kondisi_kotak_p3k",
    "kasa_steril", "perban_5cm", "perban_10cm", "perban_1.2cm",
    "plester_cepat", "kapas_25gram", "kain_mitela", "gunting", "peniti",
    "sarung_tangan_disposible", "bidai", "masker", "pinset", "lampu_senter",
    "gelas_cucimata", "kantong_plastik_bersih", "aquades_100ml", "betadine_60ml",
    "alkohol_70", "buku_panduan_p3k", "buku_catatan", "buku_daftar_isikotak",
    "hasil_pemeriksaan", "keterangan", "tindak_lanjut", "foto_url",
  ],
};

// Sheet yang menggunakan header row bukan di row 1
const HEADER_ROW_OVERRIDE: Record<string, number> = {
  Data_P3K: 2,
};

// Header manual untuk sheet dengan struktur multi-row header
// Key = nama sheet, Value = array nama kolom sesuai urutan posisi di sheet
const MANUAL_HEADERS: Record<string, string[]> = {
  Data_APD: [
    "id_klinik", "id", "daop", "tanggal_supervisi", "unit_kerja", "upt",
    "helemet_type_general_g", "helemet_type_electric_e", "helemet_type_conductive_c",
    "safety_spectales", "safety_goggles",
    "ear_plug", "ear_muff",
    "masker", "respirator",
    "apron",
    "sarung_tangan_katun", "sarung_tangan_kulit", "sarung_tangan_karet", "sarung_tangan_electrical",
    "sepatu_pelindung",
    "apd_lainnya", "kodisi_apd_lainnya", "catatan", "foto_url",
  ],
};

type CachedRows = { expiresAt: number; rows: Record<string, any>[] };

const headerRowIndexCache = new Map<string, number>();
const headerRowScanFailed = new Set<string>();
const rowsCache = new Map<string, CachedRows>();

function isRetryableGoogleError(err: unknown): boolean {
  const anyErr = err as any;
  const status =
    (typeof anyErr?.code === "number" ? anyErr.code : null) ??
    (typeof anyErr?.response?.status === "number" ? anyErr.response.status : null);
  if (status === 429 || status === 500 || status === 502 || status === 503 || status === 504) return true;
  const msg = String(anyErr?.message ?? "");
  return /quota|rate limit|429|too many requests|userRateLimitExceeded/i.test(msg);
}

async function withGoogleRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  const delaysMs = [250, 600, 1200] as const;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= delaysMs.length; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isRetryableGoogleError(err) || attempt === delaysMs.length) break;
      const base = delaysMs[attempt] ?? 0;
      const jitter = Math.floor(Math.random() * 150);
      await new Promise((r) => setTimeout(r, base + jitter));
      console.warn(`[SHEETS] Retry ${attempt + 1}/${delaysMs.length} for ${label}`);
    }
  }
  throw lastErr;
}

export async function loadBestHeaderRow(sheet: any, required: string[] = []): Promise<string[]> {
  const startTime = Date.now();
  const requiredNormalized = required.map(normalizeHeader).filter(Boolean);
  const cacheKey = `${String(sheet?.title ?? "")}::${requiredNormalized.join("|")}`;
  const cachedIndex = headerRowIndexCache.get(cacheKey);
  
  if (typeof cachedIndex === "number") {
    try {
      console.log(`[SHEETS] Loading cached header at row ${cachedIndex} for ${sheet.title}`);
      await withGoogleRetry(() => sheet.loadHeaderRow(cachedIndex), `${sheet.title}.loadHeaderRow(${cachedIndex})`);
      const headers = (sheet.headerValues ?? []) as string[];
      const normalized = headers.map(normalizeHeader).filter(Boolean);
      const satisfies =
        requiredNormalized.length === 0 ||
        requiredNormalized.every((req) => normalized.includes(req));
      if (normalized.length > 0 && satisfies) return headers;
    } catch (err) {
      console.warn(`[SHEETS] Cached header load failed for ${sheet.title}`, err);
    }
    headerRowIndexCache.delete(cacheKey);
  }

  if (requiredNormalized.length === 0) {
    console.log(`[SHEETS] Loading header row 1 for ${sheet.title} (no required headers)`);
    await withGoogleRetry(() => sheet.loadHeaderRow(1), `${sheet.title}.loadHeaderRow(1)`);
    headerRowIndexCache.set(cacheKey, 1);
    return (sheet.headerValues ?? []) as string[];
  }

  if (headerRowScanFailed.has(cacheKey)) {
    console.warn(`[SHEETS] Skipping header scan for ${sheet.title} (previous scan failed). Using row 1.`);
    await withGoogleRetry(() => sheet.loadHeaderRow(1), `${sheet.title}.loadHeaderRow(1)`);
    return (sheet.headerValues ?? []) as string[];
  }

  console.log(`[SHEETS] Scanning for headers in ${sheet.title} (required: ${requiredNormalized.join(", ")})`);
  for (let rowIndex = 1; rowIndex <= 5; rowIndex++) {
    try {
      await withGoogleRetry(() => sheet.loadHeaderRow(rowIndex), `${sheet.title}.loadHeaderRow(${rowIndex})`);
      const headers = (sheet.headerValues ?? []) as string[];
      const normalized = headers.map(normalizeHeader).filter(Boolean);
      const satisfies =
        requiredNormalized.length === 0 ||
        requiredNormalized.every((req) => normalized.includes(req));
      
      if (normalized.length > 0 && satisfies) {
        console.log(`[SHEETS] Found headers at row ${rowIndex} for ${sheet.title} in ${Date.now() - startTime}ms`);
        headerRowIndexCache.set(cacheKey, rowIndex);
        return headers;
      }
    } catch (err) {
      console.warn(`[SHEETS] Failed to load header row ${rowIndex} for ${sheet.title}`);
    }
  }

  console.warn(`[SHEETS] No suitable header row found for ${sheet.title} in first 5 rows. Falling back to row 1.`);
  await withGoogleRetry(() => sheet.loadHeaderRow(1), `${sheet.title}.loadHeaderRow(1)`);
  headerRowScanFailed.add(cacheKey);
  return (sheet.headerValues ?? []) as string[];
}

export function invalidateRowsCache(sheetTitle: string) {
  rowsCache.delete(sheetTitle);
  for (const key of headerRowIndexCache.keys()) {
    if (key.startsWith(`${sheetTitle}::`)) headerRowIndexCache.delete(key);
  }
  for (const key of headerRowScanFailed.values()) {
    if (key.startsWith(`${sheetTitle}::`)) headerRowScanFailed.delete(key);
  }
}

export async function getMasterData() {
  const doc = await getSpreadsheet();
  const sheet = doc.sheetsByTitle["Master_Data"];
  if (!sheet) {
    throw new Error('Sheet "Master_Data" not found');
  }
  const headers = await loadBestHeaderRow(sheet, REQUIRED_HEADERS_BY_SHEET["Master_Data"]);
  const normToRaw: Record<string, string> = {};
  for (const h of headers) {
    normToRaw[normalizeHeader(h)] = h;
  }

  const rows = await sheet.getRows<Record<string, string>>();
  const daftar_daop: string[] = [];
  const daftar_unit_kerja: string[] = [];
  const daftar_upt: string[] = [];

  const keyDaop = normToRaw["daftardaop"];
  const keyUnit = normToRaw["daftarunitkerja"];
  const keyUpt = normToRaw["daftarupt"];

  for (const row of rows) {
    const daop = keyDaop ? (row as any)[keyDaop] : "";
    const unit = keyUnit ? (row as any)[keyUnit] : "";
    const upt = keyUpt ? (row as any)[keyUpt] : "";
    
    if (daop && String(daop).trim()) daftar_daop.push(String(daop).trim());
    if (unit && String(unit).trim()) daftar_unit_kerja.push(String(unit).trim());
    if (upt && String(upt).trim()) daftar_upt.push(String(upt).trim());
  }

  return {
    daftar_daop: Array.from(new Set(daftar_daop)).sort(),
    daftar_unit_kerja: Array.from(new Set(daftar_unit_kerja)).sort(),
    daftar_upt: Array.from(new Set(daftar_upt)).sort(),
  };
}

export async function updateRow(
  sheetTitle: string,
  rowNumber: number,
  data: Record<string, string>
) {
  const doc = await getSpreadsheet();
  const sheet = doc.sheetsByTitle[sheetTitle];
  if (!sheet) throw new Error(`Sheet "${sheetTitle}" not found`);

  const headerRowIndex = HEADER_ROW_OVERRIDE[sheetTitle] ?? 1;
  await withGoogleRetry(
    () => sheet.loadHeaderRow(headerRowIndex),
    `${sheetTitle}.loadHeaderRow(${headerRowIndex})`
  );

  const rows = await withGoogleRetry(() => sheet.getRows(), `${sheetTitle}.getRows`);
  const row = rows.find((r) => r.rowNumber === rowNumber);
  if (!row) throw new Error(`Row ${rowNumber} tidak ditemukan di sheet "${sheetTitle}"`);

  // Gunakan manual headers jika tersedia untuk normalized matching
  const headers = (MANUAL_HEADERS[sheetTitle] ?? sheet.headerValues ?? []) as string[];
  const normToRaw: Record<string, string> = {};
  for (const h of headers) {
    if (h) normToRaw[normalizeHeader(h)] = h;
  }

  const updates: Record<string, string> = {};
  for (const [k, v] of Object.entries(data)) {
    const rawKey = normToRaw[normalizeHeader(k)] ?? k;
    updates[rawKey] = v;
  }

  row.assign(updates);
  await withGoogleRetry(() => row.save(), `${sheetTitle}.row.save`);
  invalidateRowsCache(sheetTitle);
}

export async function deleteRow(sheetTitle: string, rowNumber: number) {
  const doc = await getSpreadsheet();
  const sheet = doc.sheetsByTitle[sheetTitle];
  if (!sheet) throw new Error(`Sheet "${sheetTitle}" not found`);

  const headerRowIndex = HEADER_ROW_OVERRIDE[sheetTitle] ?? 1;
  await withGoogleRetry(
    () => sheet.loadHeaderRow(headerRowIndex),
    `${sheetTitle}.loadHeaderRow(${headerRowIndex})`
  );

  const rows = await withGoogleRetry(() => sheet.getRows(), `${sheetTitle}.getRows`);
  const row = rows.find((r) => r.rowNumber === rowNumber);
  if (!row) throw new Error(`Row ${rowNumber} tidak ditemukan di sheet "${sheetTitle}"`);

  await withGoogleRetry(() => (row as any).delete(), `${sheetTitle}.row.delete`);
  invalidateRowsCache(sheetTitle);
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

  let headers: string[];

  if (MANUAL_HEADERS[sheetTitle]) {
    // Gunakan header manual untuk sheet dengan struktur multi-row header
    headers = MANUAL_HEADERS[sheetTitle];
    console.log(`[SHEETS] appendRow(${sheetTitle}): menggunakan manual headers (${headers.length} kolom)`);
  } else {
    // Load header row dari sheet
    const headerRowIndex = HEADER_ROW_OVERRIDE[sheetTitle] ?? 1;
    await withGoogleRetry(
      () => sheet.loadHeaderRow(headerRowIndex),
      `${sheetTitle}.loadHeaderRow(${headerRowIndex})`
    );
    headers = sheet.headerValues as string[];
    console.log(
      `[SHEETS] appendRow(${sheetTitle}) headerRow=${headerRowIndex}: ${headers.length} headers:`,
      headers.filter(Boolean).join(", ")
    );
  }

  // Bangun array nilai berdasarkan posisi kolom
  const rowAsArray: (string | number | boolean | Date)[] = headers.map((header) => {
    if (!header || !header.trim()) return "";

    // Exact match
    if (data[header] !== undefined) return data[header];

    // Normalized match
    const normHeader = normalizeHeader(header);
    const matchedKey = Object.keys(data).find(
      (k) => normalizeHeader(k) === normHeader
    );
    return matchedKey !== undefined ? data[matchedKey] : "";
  });

  const filledCount = rowAsArray.filter((v) => v !== "" && v !== undefined).length;
  console.log(`[SHEETS] appendRow(${sheetTitle}): ${filledCount}/${headers.length} kolom terisi`);

  // Untuk sheet dengan manual headers, kita perlu set loadHeaderRow dulu
  // agar addRow tahu posisi kolom yang benar
  if (MANUAL_HEADERS[sheetTitle]) {
    // Gunakan row 1 sebagai anchor untuk addRow, tapi kirim sebagai array
    // sehingga posisi kolom ditentukan oleh urutan array, bukan nama header
    await withGoogleRetry(() => sheet.loadHeaderRow(1), `${sheetTitle}.loadHeaderRow(1)`);
  }

  await withGoogleRetry(() => sheet.addRow(rowAsArray as any), `${sheetTitle}.addRow`);
  invalidateRowsCache(sheetTitle);
}

export function rowToPlainObject(row: any, headers: string[]): Record<string, any> {
  let obj: Record<string, any> = {};
  try {
    obj = row.toObject?.() ?? {};
  } catch {
    obj = {};
  }

  // Ensure all headers are checked if toObject is incomplete or fails
  for (const h of headers) {
    if (obj[h] === undefined) {
      obj[h] = row[h] !== undefined ? row[h] : row.get?.(h);
    }
  }
  
  obj._rowNumber = row.rowNumber;
  return obj;
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

  // Tentukan header row yang digunakan
  const headerRowIndex = HEADER_ROW_OVERRIDE[sheetTitle] ?? 1;
  await withGoogleRetry(
    () => sheet.loadHeaderRow(headerRowIndex),
    `${sheetTitle}.loadHeaderRow(${headerRowIndex})`
  );

  const rows = await withGoogleRetry(
    () => sheet.getRows<Record<string, string>>(),
    `${sheetTitle}.getRows`
  );

  // Gunakan manual headers jika tersedia, fallback ke headerValues dari sheet
  const headers = (MANUAL_HEADERS[sheetTitle] ?? sheet.headerValues ?? []) as string[];

  const result = rows.map((r) => rowToPlainObject(r, headers));
  rowsCache.set(sheetTitle, { expiresAt: now + 5_000, rows: result } satisfies CachedRows);
  return result;
}
