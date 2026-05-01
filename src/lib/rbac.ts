export function isKepalaKlinik(role?: string) {
  return (role ?? "").toUpperCase() === "KEPALA_KLINIK";
}

export function filterRowsByWilayah<T extends Record<string, any>>(
  rows: T[],
  params: { role?: string; wilayahKerja?: string | null; field: string }
): T[] {
  if (!isKepalaKlinik(params.role)) return rows;
  const wilayah = (params.wilayahKerja ?? "").trim();
  if (!wilayah) return [];
  return rows.filter((r) => String((r as any)[params.field] ?? "").trim() === wilayah);
}
