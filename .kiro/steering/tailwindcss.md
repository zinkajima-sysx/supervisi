# TailwindCSS v4 — Conventions & Patterns

## Versi & Konfigurasi
- TailwindCSS v4.x dengan `@tailwindcss/postcss`
- Konfigurasi di `tailwind.config.ts` dan `postcss.config.mjs`
- CSS global di `src/app/globals.css`

## Perbedaan Utama v4 vs v3
- Tidak ada `tailwind.config.js` dengan `content` array — v4 auto-scan
- Plugin ditulis sebagai CSS `@plugin` bukan JS config
- `@apply` masih didukung tapi lebih diutamakan utility langsung
- Custom colors/tokens didefinisikan via CSS variables di `globals.css`
- `darkMode` dikonfigurasi via CSS, bukan config JS

## CSS Variables & Design Tokens
Project ini menggunakan CSS variables untuk theming yang kompatibel dengan HeroUI:
```css
/* Contoh token yang digunakan di project */
--color-primary
--color-foreground
--color-background
--color-border
--color-surface
--color-success
--color-error
--color-warning
--color-info
```

Gunakan token ini via class Tailwind: `text-foreground`, `bg-surface`, `border-border`, dll.

## Pola Kelas yang Digunakan di Project Ini

### Layout
```
space-y-{n}         ← vertical spacing antar elemen
grid grid-cols-{n}  ← grid layout
gap-{n}             ← gap antar grid/flex items
flex items-center   ← flex alignment
```

### Komponen Card/Panel
```
rounded-3xl border border-border bg-surface shadow-xl p-6
rounded-2xl border border-border bg-surface shadow p-4
```

### Input & Form
```
input w-full rounded-xl px-4        ← text input
input w-full h-12 rounded-xl px-3   ← select input
```

### Button
```
button button--primary button--lg rounded-xl px-10 font-bold
button button--ghost button--icon-only button--sm rounded-full
```

### Typography
```
text-3xl font-black tracking-tight text-foreground   ← page title
text-sm font-medium text-foreground/70               ← subtitle
text-[10px] font-black uppercase tracking-widest     ← label kecil
```

### Animasi
```
animate-in fade-in duration-700          ← page entrance
animate-in slide-in-from-top duration-300 ← alert/toast
```

### Responsive
```
grid-cols-1 md:grid-cols-2    ← 1 kolom mobile, 2 kolom tablet+
lg:col-span-8 / lg:col-span-4 ← sidebar layout
flex-col md:flex-row          ← stack mobile, row desktop
```

## Konvensi
- Gunakan `opacity-{n}` untuk variasi warna: `text-foreground/70`, `bg-primary/20`
- Hindari inline style — semua styling via Tailwind utility
- Untuk kondisional class gunakan template literal atau library `clsx`/`cn`
- Custom color project: `kereta-orange` (warna brand KAI)
- Gradient dekoratif: `bg-gradient-to-r from-primary/20 via-transparent to-kereta-orange/20`
