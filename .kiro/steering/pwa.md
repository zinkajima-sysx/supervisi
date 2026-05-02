# PWA — Progressive Web App Configuration & Security

## Stack PWA
- `next-pwa` v5.6.0 di atas Workbox
- Konfigurasi di `next.config.ts` via `withPWA()`
- Manifest di `src/app/manifest.ts` (Next.js App Router manifest API)
- PWA hanya aktif di production Vercel (`isVercel === true`) atau saat `PWA_DEV=true`

## Konfigurasi next-pwa

### next.config.ts
```typescript
const withPwaConfig = withPWA({
  dest: "public",                    // output SW ke public/
  disable: !isVercel || (isDev && process.env.PWA_DEV !== "true"),
  register: true,                    // auto-register SW
  skipWaiting: true,                 // langsung aktifkan SW baru
  runtimeCaching: [
    {
      urlPattern: /\/api\//,
      handler: "NetworkOnly",        // API TIDAK di-cache — selalu fresh
      options: { cacheName: "api-network-only" },
    },
    ...runtimeCaching,               // default Workbox caching
  ],
});
```

### Aturan Caching Kritis
- **`/api/*` → NetworkOnly** — WAJIB, jangan pernah cache API response
- Data form supervisi harus selalu dikirim ke server, tidak boleh cached
- Session/auth endpoints tidak boleh di-cache

## Manifest (src/app/manifest.ts)
```typescript
// Struktur manifest yang benar untuk Next.js App Router
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Supervisi K3",
    short_name: "Supervisi",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#...",
    icons: [...]
  };
}
```

## PWA Security Audit

### Service Worker Security
- SW di-generate otomatis oleh next-pwa — jangan edit manual `public/sw.js`
- SW hanya berjalan di HTTPS (atau localhost untuk dev)
- `skipWaiting: true` memastikan SW terbaru langsung aktif — penting untuk security patch
- Verifikasi SW tidak meng-cache response yang mengandung data sensitif

### Cache Security Checklist
- [ ] API routes (`/api/*`) menggunakan `NetworkOnly` — tidak di-cache
- [ ] Halaman auth (`/login`) tidak di-cache dengan data sensitif
- [ ] Response yang mengandung session/token tidak masuk cache
- [ ] `Cache-Control: no-store` sudah ada untuk HTML responses (ada di next.config.ts)

### Offline Behavior
- Saat offline, form submit akan gagal — tampilkan pesan yang jelas ke user
- Jangan simpan data form di localStorage/IndexedDB tanpa enkripsi
- Background sync (jika diimplementasikan) harus validasi ulang session saat online

## Icon Generation
```bash
npm run icons:gen    # generate icons dari scripts/generate-icons.mjs
```
Icons di-output ke `public/` — diperlukan untuk installable PWA.

## Development dengan PWA
```bash
npm run pwa:dev      # aktifkan SW di development (cross-env PWA_DEV=true)
npm run dev          # development normal tanpa SW
```

## Deployment (Vercel)
- PWA otomatis aktif saat deploy ke Vercel (`VERCEL=1` atau `VERCEL_URL` ada)
- Pastikan semua icon sudah di-generate sebelum build
- `public/sw.js` dan `public/workbox-*.js` di-generate saat build — jangan commit ke git

## Checklist Sebelum Deploy
- [ ] Manifest memiliki semua icon size yang dibutuhkan (72, 96, 128, 144, 152, 192, 384, 512)
- [ ] `start_url` sesuai dengan base path aplikasi
- [ ] `theme_color` sesuai dengan brand
- [ ] API routes tidak ter-cache
- [ ] HTTPS aktif di production
- [ ] SW update strategy sudah benar (`skipWaiting: true`)
