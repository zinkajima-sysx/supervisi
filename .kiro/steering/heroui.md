# HeroUI v3 — Conventions & Patterns

## Versi & Instalasi
- `@heroui/react` v3.x dan `@heroui/styles` v3.x
- **PENTING:** HeroUI v3 memiliki breaking changes dari v2 — selalu baca docs di `.heroui-docs/react/` sebelum menggunakan komponen
- Docs lokal tersedia di `.heroui-docs/react/components/`

## Setup Provider
HeroUI membutuhkan provider di root layout:
```tsx
// src/app/providers.tsx
import { HeroUIProvider } from "@heroui/react";

export function Providers({ children }) {
  return <HeroUIProvider>{children}</HeroUIProvider>;
}
```

## Komponen yang Tersedia di Project Ini
Berdasarkan docs lokal di `.heroui-docs/react/`:

### Buttons
- `Button`, `ButtonGroup`, `CloseButton`, `ToggleButton`, `ToggleButtonGroup`

### Forms
- `Input`, `TextField`, `TextArea`, `NumberField`, `SearchField`
- `Checkbox`, `CheckboxGroup`, `RadioGroup`
- `Select`, `ComboBox`, `Autocomplete`
- `Form`, `Label`, `Description`, `FieldError`
- `InputOTP`, `InputGroup`

### Navigation
- `Tabs`, `Accordion`, `Breadcrumbs`, `Pagination`
- `Disclosure`, `DisclosureGroup`, `Link`

### Overlays
- `Modal`, `AlertDialog`, `Drawer`, `Popover`, `Tooltip`, `Toast`

### Data Display
- `Table`, `Badge`, `Chip`

### Feedback
- `Alert`, `Spinner`, `Skeleton`, `ProgressBar`, `ProgressCircle`, `Meter`

### Layout
- `Card`, `Separator`, `Surface`, `Toolbar`

### Collections
- `Dropdown`, `ListBox`, `TagGroup`

## Pola Penggunaan

### Toast (digunakan di project ini)
```tsx
import { useToast } from "@/components/ToastProvider";

const toast = useToast();
toast.success("Berhasil disimpan.", "Sukses");
toast.error("Gagal menyimpan.", "Gagal");
```

### Konvensi Styling HeroUI v3
- Komponen HeroUI menggunakan `className` untuk override styling
- Gunakan `variant`, `size`, `color` props sebelum override dengan className
- Jangan mix HeroUI components dengan custom HTML untuk elemen yang sama

## Catatan Penting v3
- API komponen berbeda dari v2 — jangan asumsikan props sama
- Beberapa komponen menggunakan React Aria di bawahnya
- Selalu cek demo di `.heroui-docs/react/demos/` untuk contoh penggunaan yang benar
- Docs index: `.heroui-docs/react/components/index.mdx`
