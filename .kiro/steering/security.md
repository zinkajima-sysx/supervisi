# Security — Best Practices & Audit Guidelines

## Autentikasi (NextAuth v4)

### Konfigurasi
- `authOptions` didefinisikan di `src/auth.ts`
- Session strategy: JWT (stateless)
- Provider: Credentials (username + password)
- Password di-hash dengan `bcryptjs` — **jangan simpan plain text**

### Validasi Session di API Routes
Setiap API route WAJIB validasi session di baris pertama:
```typescript
const session = await getServerSession(authOptions);
if (!session?.user) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

### RBAC (Role-Based Access Control)
- Roles yang ada: `ADMIN`, `MANAGER`, `ASMEN`, `KEPALA_KLINIK`, `DOKTER_FUNGSIONAL`
- Logic RBAC di `src/lib/rbac.ts`
- `wilayahKerja` di session membatasi akses data per klinik
- `KEPALA_KLINIK` dan `DOKTER_FUNGSIONAL` hanya bisa akses data kliniknya sendiri (`isScopedKlinik`)
- `ADMIN`, `MANAGER`, `ASMEN` bisa melihat semua data (wilayahKerja = ALL)
- Selalu cek role sebelum operasi write/delete di API

## Environment Variables

### Aturan Ketat
- **JANGAN** expose secret ke client — hanya `NEXT_PUBLIC_*` yang boleh di browser
- `NEXTAUTH_SECRET` — wajib kuat, minimal 32 karakter random
- `GOOGLE_PRIVATE_KEY` — private key service account, jangan pernah di-commit
- `CLOUDINARY_API_SECRET` — server-side only, jangan expose
- File `.env.local` sudah ada di `.gitignore` — pastikan tidak ter-commit

### Env Vars Sensitif di Project Ini
```
NEXTAUTH_SECRET          ← JWT signing secret
GOOGLE_PRIVATE_KEY       ← Google Service Account private key
CLOUDINARY_API_SECRET    ← Cloudinary API secret
CLOUDINARY_URL           ← mengandung API secret
```

## Input Validation & Sanitization

### API Routes
- Semua input dari `FormData` dikonversi ke string — validasi tipe data sebelum dipakai
- Jangan langsung trust nilai dari client untuk field sensitif (role, id_klinik)
- Field yang seharusnya dari session (username, role) ambil dari session, bukan dari form:
```typescript
// BENAR — ambil dari session
const username = session.user.username ?? session.user.email ?? "";

// SALAH — jangan ambil dari form input
const username = form.get("username"); // bisa dimanipulasi client
```

### Google Sheets
- `appendRow()` menerima `Record<string, string | number | boolean | Date>`
- Data dari form sudah di-stringify — aman dari injection ke Sheets API
- Jangan pernah eval atau execute string dari input user

## File Upload Security

### Cloudinary Upload
- Upload hanya dari server-side (API route) — bukan direct upload dari browser
- Validasi tipe file: hanya `image/*` yang diterima di form
- Ukuran file dibatasi oleh Cloudinary upload preset `ml_default`
- `public_id` di-generate dari UUID — tidak bisa ditebak/di-enumerate
- Folder terpisah per jenis: `supervisi/image/apd`, `supervisi/image/p3k`

### Rekomendasi Tambahan
- Tambahkan validasi ukuran file di server (maks 5MB):
```typescript
if (file.size > 5 * 1024 * 1024) {
  return NextResponse.json({ error: "File terlalu besar (maks 5MB)" }, { status: 400 });
}
```
- Validasi MIME type di server, jangan hanya rely pada `accept` attribute di HTML

## HTTP Security Headers

### Headers yang Sudah Ada
Di `next.config.ts` sudah ada `Cache-Control: no-store` untuk HTML responses.

### Headers yang Direkomendasikan (tambahkan di next.config.ts)
```typescript
{
  key: "X-Content-Type-Options",
  value: "nosniff"
},
{
  key: "X-Frame-Options",
  value: "DENY"
},
{
  key: "Referrer-Policy",
  value: "strict-origin-when-cross-origin"
},
{
  key: "Permissions-Policy",
  value: "camera=(), microphone=(), geolocation=()"
}
```

## API Security Checklist
Setiap kali membuat API route baru, pastikan:
- [ ] Session divalidasi di awal
- [ ] Role dicek jika operasi sensitif
- [ ] Input di-sanitize sebelum dipakai
- [ ] Error message tidak expose internal detail ke client
- [ ] Rate limiting dipertimbangkan untuk endpoint publik
- [ ] `export const runtime = "nodejs"` ada

## Google Service Account
- Service account `pososfolder@posos-493016.iam.gserviceaccount.com`
- Scope minimal: hanya `spreadsheets` untuk Sheets, tidak perlu `drive` lagi
- Jangan berikan scope lebih dari yang dibutuhkan (principle of least privilege)
- Private key di `.env.local` — format multiline dengan real newlines

## Dependency Security
- Ada 9 vulnerability dari `npm audit` — semuanya di dependensi internal (next-pwa, next-auth)
- **JANGAN** jalankan `npm audit fix --force` — akan downgrade Next.js ke v9
- Monitor vulnerability secara berkala tapi jangan fix dengan breaking changes
