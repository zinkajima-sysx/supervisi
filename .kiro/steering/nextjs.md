# Next.js 16 — Project Conventions

## Versi & Stack
- Next.js 16.2.4 dengan App Router
- React 19.2.4
- TypeScript 5 (strict mode)
- Bundler: Webpack (bukan Turbopack) — selalu gunakan flag `--webpack`
- Runtime: Node.js (bukan Edge Runtime) — semua API route menggunakan `export const runtime = "nodejs"`

## Struktur Direktori
```
src/
├── app/
│   ├── (protected)/        ← route yang butuh autentikasi (layout dengan session check)
│   │   ├── dashboard/
│   │   ├── input/
│   │   │   ├── apd/
│   │   │   └── p3k/
│   │   ├── laporan/
│   │   └── master/
│   ├── api/                ← API routes (server-side only)
│   │   ├── auth/
│   │   ├── supervisi/
│   │   │   ├── apd/route.ts
│   │   │   └── p3k/route.ts
│   │   ├── master/
│   │   └── dashboard/
│   ├── login/
│   ├── layout.tsx          ← root layout
│   ├── providers.tsx       ← SessionProvider, ToastProvider
│   └── globals.css
├── components/             ← shared UI components
├── lib/                    ← server-side utilities
│   ├── sheets.ts           ← Google Sheets integration
│   ├── google.ts           ← Google JWT auth & Spreadsheet client
│   ├── cloudinary.ts       ← Cloudinary image upload
│   ├── users.ts            ← user lookup dari Sheets
│   ├── rbac.ts             ← role-based access control
│   ├── env.ts              ← env var helpers
│   └── options.ts          ← dropdown options constants
└── types/                  ← TypeScript type declarations
```

## Konvensi Penting

### API Routes
- Semua API route wajib `export const runtime = "nodejs"`
- Selalu validasi session dengan `getServerSession(authOptions)` di awal
- Return `NextResponse.json({ error: msg }, { status })` untuk error
- Tangkap error dengan pesan yang informatif — jangan sembunyikan error asli

### Client Components
- Tandai dengan `"use client"` di baris pertama
- Gunakan `useSession()` dari `next-auth/react` untuk akses session
- Fetch data dengan `fetch("/api/...")` — bukan server actions
- Semua form menggunakan `FormData` untuk submit ke API

### Server vs Client
- `src/lib/*` adalah server-side only — jangan import di client components
- Env vars tanpa prefix `NEXT_PUBLIC_` hanya tersedia di server
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` adalah satu-satunya env yang boleh diakses client

### Path Alias
- Gunakan `@/` untuk import dari `src/` — contoh: `import { appendRow } from "@/lib/sheets"`

### Build Commands
```bash
npm run dev          # development
npm run build        # production build
npm run pwa:dev      # development dengan PWA enabled
```

## Data Flow: Form → API → Google Sheets
```
Client Form (FormData)
  → fetch POST /api/supervisi/[type]
  → getServerSession() — validasi auth
  → uploadToCloudinary() — jika ada file (non-blocking, try/catch)
  → appendRow("Data_APD" | "Data_P3K") — simpan ke Sheets
  → return { ok: true }
```

## Error Handling Pattern
```typescript
try {
  // operasi
  return NextResponse.json({ ok: true });
} catch (err) {
  const msg = err instanceof Error ? err.message : "Unknown error";
  const status = /quota|rate limit|429/i.test(msg) ? 429 : 500;
  console.error("[LABEL] failed:", msg, err);
  return NextResponse.json({ error: msg }, { status });
}
```
