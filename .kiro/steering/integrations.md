# Integrations — Google Sheets & Cloudinary

## Google Sheets Integration

### Library
- `google-spreadsheet` v5.x — wrapper untuk Google Sheets API v4
- `google-auth-library` — JWT auth untuk service account

### Konfigurasi Auth
```typescript
// src/lib/google.ts
const jwt = createJwt(["https://www.googleapis.com/auth/spreadsheets"]);
const doc = new GoogleSpreadsheet(GOOGLE_SHEETS_ID, jwt);
```
- Scope: hanya `spreadsheets` — tidak perlu `drive` lagi
- Credentials dari env: `GOOGLE_CLIENT_EMAIL` + `GOOGLE_PRIVATE_KEY`
- Atau via `GOOGLE_SERVICE_ACCOUNT_JSON_PATH` jika pakai file JSON

### Spreadsheet Structure
```
Google Spreadsheet (GOOGLE_SHEETS_ID)
├── Master_Data     ← daftar DAOP, unit kerja, UPT
├── Data_User       ← data user (username, password hash, role)
├── Data_Klinik     ← master data klinik
├── Data_UPT        ← master data UPT per klinik
├── Data_APD        ← hasil supervisi APD
└── Data_P3K        ← hasil supervisi P3K
```

### Required Headers per Sheet
```typescript
Data_APD: ["timestamp", "tanggal_supervisi", "id_klinik", "daop", "unit_kerja", "upt"]
Data_P3K: ["timestamp", "tanggal_supervisi", "id_klinik", "daop", "unit_kerja", "upt"]
Data_User: ["username", "password", "role"]
Data_Klinik: ["klinik"]
Data_UPT: ["upt", "unitkerja"]
Master_Data: ["daftardaop", "daftarunitkerja", "daftarupt"]
```
Header di sheet harus ada di row 1-5 (auto-scan oleh `loadBestHeaderRow()`).

### Fungsi Utama (src/lib/sheets.ts)

#### appendRow — Tambah data baru
```typescript
await appendRow("Data_APD", {
  laporan_id: uuidv4(),
  timestamp: new Date().toISOString(),
  submitter_username: username,
  submitter_nama: submitterNama,
  tanggal_supervisi: "2024-01-01",
  id_klinik: "KL001",
  daop: "DAOP 2 BANDUNG",
  unit_kerja: "...",
  upt: "...",
  foto_url: "https://res.cloudinary.com/...",
  // ...field lainnya
});
```

#### getRows — Baca semua baris
```typescript
const rows = await getRows("Data_APD");
// rows: Record<string, any>[]
// Cache 5 detik — invalidate dengan invalidateRowsCache("Data_APD")
```

#### getMasterData — Baca data master
```typescript
const { daftar_daop, daftar_unit_kerja, daftar_upt } = await getMasterData();
```

### Caching Strategy
- `getSpreadsheet()` — cache doc 60 detik di `globalThis`
- `getRows()` — cache rows 5 detik per sheet
- `headerRowIndexCache` — cache posisi header row (persistent per process)
- `invalidateRowsCache(sheetTitle)` — dipanggil setelah `appendRow()`

### Retry Logic
`withGoogleRetry()` otomatis retry untuk error:
- HTTP 429 (rate limit), 500, 502, 503, 504
- Delays: 250ms → 600ms → 1200ms + jitter
- Max 3 retry

### Normalisasi Header
`normalizeHeader()` mengubah header ke lowercase alphanumeric:
- `"Unit Kerja"` → `"unitkerja"`
- `"Daftar DAOP"` → `"daftardaop"`
- Digunakan untuk matching yang case-insensitive dan toleran terhadap spasi/simbol

---

## Cloudinary Integration

### Library
- `cloudinary` v2.x (server-side SDK)

### Konfigurasi (src/lib/cloudinary.ts)
Prioritas konfigurasi:
1. `CLOUDINARY_URL` — `cloudinary://API_KEY:API_SECRET@CLOUD_NAME`
2. Individual vars: `CLOUDINARY_CLOUD_NAME` + `CLOUDINARY_API_KEY` + `CLOUDINARY_API_SECRET`

### Environment Variables
```env
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=diggawfwp   # untuk client-side (jika pakai widget)
CLOUDINARY_CLOUD_NAME=diggawfwp               # server-side
CLOUDINARY_API_KEY=553487119323533            # server-side
CLOUDINARY_API_SECRET=...                     # server-side ONLY
CLOUDINARY_URL=cloudinary://KEY:SECRET@NAME   # connection string lengkap
CLOUDINARY_UPLOAD_PRESET=ml_default           # upload preset
CLOUDINARY_FOLDER=supervisi/image             # base folder
CLOUDINARY_SECURE_DELIVERY=true              # paksa HTTPS URL
```

### Struktur Folder di Cloudinary
```
supervisi/
└── image/
    ├── apd/    ← foto dari form Supervisi APD
    └── p3k/    ← foto dari form Supervisi P3K
```

### Fungsi Utama (src/lib/cloudinary.ts)

#### uploadToCloudinary
```typescript
const { publicId, secureUrl } = await uploadToCloudinary({
  fileName: `${uuidv4()}-${file.name}`,
  mimeType: file.type || "application/octet-stream",
  buffer,
  folder: getUploadFolder("apd"),  // → "supervisi/image/apd"
});
// secureUrl: "https://res.cloudinary.com/diggawfwp/image/upload/..."
```

#### getUploadFolder
```typescript
getUploadFolder()        // → "supervisi/image"
getUploadFolder("apd")   // → "supervisi/image/apd"
getUploadFolder("p3k")   // → "supervisi/image/p3k"
```

### Upload Pattern di API Routes
Upload selalu **non-blocking** — jika gagal, data tetap tersimpan ke Sheets:
```typescript
let foto_url = "";
if (file instanceof File && file.size > 0) {
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploaded = await uploadToCloudinary({ fileName, mimeType, buffer, folder });
    foto_url = uploaded.secureUrl;
  } catch (uploadErr) {
    console.warn("[APD] Cloudinary upload failed, continuing without foto_url:", uploadErr);
    // TIDAK throw — data tetap disimpan ke Sheets
  }
}
```

### Upload Preset
- `ml_default` adalah preset unsigned bawaan Cloudinary
- Untuk kontrol lebih: buat preset baru di Cloudinary Console → Settings → Upload Presets
- Preset bisa mengatur: max file size, allowed formats, transformasi otomatis, folder

### Transformasi Otomatis
Saat upload, sudah diterapkan:
- `quality: "auto"` — kompresi otomatis
- `fetch_format: "auto"` — format terbaik (WebP/AVIF jika browser support)
- `overwrite: false` — tidak overwrite file dengan nama sama

---

## Alur Lengkap Submit Form

```
1. User isi form → klik Submit
2. Client: FormData dibuat, fetch POST ke /api/supervisi/[type]
3. Server: getServerSession() → validasi auth
4. Server: parse FormData → payload object
5. Server: findUserByUsername() → ambil nama lengkap dari Sheets
6. Server: [jika ada file] uploadToCloudinary() → dapat secureUrl
           [jika gagal upload] → foto_url = "", lanjut ke step 7
7. Server: appendRow("Data_APD"|"Data_P3K") → simpan ke Google Sheets
8. Server: return { ok: true }
9. Client: tampilkan toast sukses, reset form
```
