"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import {
  ChevronLeft, ChevronRight, ExternalLink, Loader2,
  Pencil, Search, Trash2, X, AlertTriangle,
} from "lucide-react";

import { KELAS_KOTAK_OPTIONS, KONDISI_KOTAK_OPTIONS, P3K_ITEM_OPTIONS } from "@/lib/options";
import { useToast } from "@/components/ToastProvider";

type Row = Record<string, any>;
type ApiResponse = { rows: Row[] };

const P3K_ITEM_KEYS = [
  { key: "kasa_steril",              label: "Kasa Steril" },
  { key: "perban_5cm",               label: "Perban 5 cm" },
  { key: "perban_10cm",              label: "Perban 10 cm" },
  { key: "perban_1.2cm",             label: "Perban 1,2 cm" },
  { key: "plester_cepat",            label: "Plester Cepat" },
  { key: "kapas_25gram",             label: "Kapas 25 gram" },
  { key: "kain_mitela",              label: "Kain Mitela" },
  { key: "gunting",                  label: "Gunting" },
  { key: "peniti",                   label: "Peniti" },
  { key: "sarung_tangan_disposible", label: "Sarung Tangan Disposable" },
  { key: "bidai",                    label: "Bidai" },
  { key: "masker",                   label: "Masker" },
  { key: "pinset",                   label: "Pinset" },
  { key: "lampu_senter",             label: "Lampu Senter" },
  { key: "gelas_cucimata",           label: "Gelas Cuci Mata" },
  { key: "kantong_plastik_bersih",   label: "Kantong Plastik Bersih" },
  { key: "aquades_100ml",            label: "Aquades 100 ml" },
  { key: "betadine_60ml",            label: "Betadine 60 ml" },
  { key: "alkohol_70",               label: "Alkohol 70%" },
  { key: "buku_panduan_p3k",         label: "Buku Panduan P3K" },
  { key: "buku_catatan",             label: "Buku Catatan" },
  { key: "buku_daftar_isikotak",     label: "Buku Daftar Isi Kotak" },
];

function pick(row: Row, keys: string[]) {
  for (const k of keys) {
    const v = row[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

export default function ListP3kPage() {
  const { data: session } = useSession();
  const toast = useToast();

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [pageSize] = useState(20);
  const [pageIndex, setPageIndex] = useState(0);
  const [busy, setBusy] = useState(false);

  const [editRow, setEditRow] = useState<Row | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [deleteRow, setDeleteRow] = useState<Row | null>(null);

  const role = (session?.user?.role ?? "").toUpperCase();
  const canEdit = role === "ADMIN" || role === "KEPALA_KLINIK" || role === "DOKTER_FUNGSIONAL" || role === "MANAGER" || role === "ASMEN";

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/laporan/p3k");
      const data = (await res.json()) as ApiResponse;
      setRows(data.rows ?? []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return rows;
    const q = query.toLowerCase();
    return rows.filter((r) =>
      Object.values(r).some((v) => String(v ?? "").toLowerCase().includes(q))
    );
  }, [rows, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(pageIndex, totalPages - 1);
  const paged = useMemo(() => filtered.slice(safePage * pageSize, safePage * pageSize + pageSize), [filtered, safePage, pageSize]);

  function openEdit(row: Row) {
    setEditRow(row);
    const form: Record<string, string> = {};
    const fields = [
      "tanggal_supervisi", "id_klinik", "daop", "unit_kerja", "upt",
      "kelas_kotak", "kondisi_kotak_p3k", "hasil_pemeriksaan",
      "keterangan", "tindak_lanjut",
      ...P3K_ITEM_KEYS.map((k) => k.key),
    ];
    for (const f of fields) form[f] = String(row[f] ?? "");
    setEditForm(form);
  }

  async function submitEdit() {
    if (!editRow) return;
    const rowNumber = editRow._rowNumber;
    if (!rowNumber) { toast.error("rowNumber tidak ditemukan", "Gagal"); return; }
    setBusy(true);
    try {
      const res = await fetch(`/api/supervisi/p3k/${rowNumber}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: editForm }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string };
        toast.error(d.error ?? "Gagal menyimpan", "Gagal");
        return;
      }
      toast.success("Data P3K berhasil diperbarui", "Sukses");
      setEditRow(null);
      await load();
    } catch {
      toast.error("Terjadi error saat menyimpan", "Gagal");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!deleteRow) return;
    const rowNumber = deleteRow._rowNumber;
    if (!rowNumber) { toast.error("rowNumber tidak ditemukan", "Gagal"); return; }
    setBusy(true);
    try {
      const res = await fetch(`/api/supervisi/p3k/${rowNumber}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string };
        toast.error(d.error ?? "Gagal menghapus", "Gagal");
        return;
      }
      toast.success("Data P3K berhasil dihapus", "Sukses");
      setDeleteRow(null);
      await load();
    } catch {
      toast.error("Terjadi error saat menghapus", "Gagal");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">
            List Data <span className="text-primary">P3K</span>
          </h1>
          <p className="text-xs text-foreground/60 mt-0.5">Kelola data supervisi P3K — edit atau hapus entri</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-foreground/50">
          {loading ? <Loader2 size={14} className="animate-spin" /> : `${filtered.length} entri`}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" size={15} />
        <input
          className="input w-full pl-9 rounded-xl text-sm"
          placeholder="Cari UPT, tanggal, petugas..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); setPageIndex(0); }}
        />
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-surface shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-base-200/30">
                <th className="py-3 pl-4 text-left text-[10px] font-black uppercase tracking-widest text-foreground/50">Tanggal</th>
                <th className="py-3 text-left text-[10px] font-black uppercase tracking-widest text-foreground/50">UPT</th>
                <th className="py-3 text-left text-[10px] font-black uppercase tracking-widest text-foreground/50">Unit Kerja</th>
                <th className="py-3 text-left text-[10px] font-black uppercase tracking-widest text-foreground/50">Kelas Kotak</th>
                <th className="py-3 text-left text-[10px] font-black uppercase tracking-widest text-foreground/50">Hasil</th>
                <th className="py-3 text-left text-[10px] font-black uppercase tracking-widest text-foreground/50">Foto</th>
                {canEdit && <th className="py-3 pr-4 text-right text-[10px] font-black uppercase tracking-widest text-foreground/50">Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={canEdit ? 7 : 6} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2"><Loader2 className="animate-spin text-primary" size={24} /><span className="text-xs opacity-50">Memuat data...</span></div>
                </td></tr>
              ) : paged.length ? paged.map((r, idx) => (
                <tr key={String(r._rowNumber ?? idx)} className="border-b border-border/40 last:border-0 hover:bg-primary/5 transition-colors">
                  <td className="py-3 pl-4 text-xs font-semibold tabular-nums">{String(r.tanggal_supervisi ?? "").slice(0, 10) || "-"}</td>
                  <td className="py-3 text-xs font-bold">{pick(r, ["upt"]) || "-"}</td>
                  <td className="py-3 text-xs text-foreground/70">{pick(r, ["unit_kerja"]) || "-"}</td>
                  <td className="py-3">
                    <span className="inline-flex items-center rounded border border-border px-1.5 py-0.5 text-[10px] font-bold text-foreground/70">
                      {r.kelas_kotak || "-"}
                    </span>
                  </td>
                  <td className="py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      r.hasil_pemeriksaan === "LENGKAP"
                        ? "bg-success/10 text-success"
                        : r.hasil_pemeriksaan === "TIDAK LENGKAP"
                        ? "bg-error/10 text-error"
                        : "bg-base-200 text-foreground/50"
                    }`}>
                      {r.hasil_pemeriksaan || "-"}
                    </span>
                  </td>
                  <td className="py-3">
                    {r.foto_url ? (
                      <a href={r.foto_url} target="_blank" rel="noreferrer" className="button button--ghost button--icon-only button--sm rounded-full text-primary">
                        <ExternalLink size={13} />
                      </a>
                    ) : <span className="text-[10px] opacity-30">-</span>}
                  </td>
                  {canEdit && (
                    <td className="py-3 pr-4">
                      <div className="flex items-center justify-end gap-1">
                        <button className="button button--ghost button--icon-only button--sm rounded-full" aria-label="Edit" onClick={() => openEdit(r)} disabled={busy}>
                          <Pencil size={13} />
                        </button>
                        <button className="button button--danger button--icon-only button--sm rounded-full" aria-label="Hapus" onClick={() => setDeleteRow(r)} disabled={busy}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              )) : (
                <tr><td colSpan={canEdit ? 7 : 6} className="py-16 text-center text-xs opacity-40">Tidak ada data</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <span className="text-xs text-foreground/50">Hal. {safePage + 1} / {totalPages}</span>
          <div className="flex items-center gap-1">
            <button className="button button--outline button--sm rounded-l-xl rounded-r-none" onClick={() => setPageIndex((p) => Math.max(0, p - 1))} disabled={safePage === 0}><ChevronLeft size={14} /></button>
            <button className="button button--outline button--sm rounded-r-xl rounded-l-none" onClick={() => setPageIndex((p) => Math.min(totalPages - 1, p + 1))} disabled={safePage >= totalPages - 1}><ChevronRight size={14} /></button>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editRow && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => !busy && setEditRow(null)} />
          <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-surface shadow-2xl">
            <div className="sticky top-0 bg-surface border-b border-border px-5 py-4 flex items-center justify-between z-10">
              <div>
                <div className="font-black text-sm">Edit Data P3K</div>
                <div className="text-[10px] text-foreground/50 mt-0.5">Row #{editRow._rowNumber}</div>
              </div>
              <button className="button button--ghost button--icon-only button--sm rounded-full" onClick={() => setEditRow(null)} disabled={busy}><X size={16} /></button>
            </div>

            <div className="p-5 space-y-5">
              {/* Info Lokasi */}
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-foreground/50 mb-3">Informasi Lokasi</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { key: "tanggal_supervisi", label: "Tanggal Supervisi", type: "date" },
                    { key: "id_klinik", label: "ID Klinik" },
                    { key: "daop", label: "DAOP" },
                    { key: "unit_kerja", label: "Unit Kerja" },
                    { key: "upt", label: "UPT" },
                  ].map(({ key, label, type }) => (
                    <div key={key}>
                      <label className="block pb-1 text-[10px] font-black uppercase tracking-widest text-foreground/60">{label}</label>
                      <input type={type ?? "text"} className="input w-full rounded-xl text-sm" value={editForm[key] ?? ""} onChange={(e) => setEditForm((p) => ({ ...p, [key]: e.target.value }))} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Spesifikasi Kotak */}
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-foreground/50 mb-3">Spesifikasi Kotak</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block pb-1 text-[10px] font-black uppercase tracking-widest text-foreground/60">Kelas Kotak</label>
                    <select className="input w-full h-10 rounded-xl text-sm px-3" value={editForm["kelas_kotak"] ?? ""} onChange={(e) => setEditForm((p) => ({ ...p, kelas_kotak: e.target.value }))}>
                      <option value="">— Pilih —</option>
                      {KELAS_KOTAK_OPTIONS.map((x) => <option key={x} value={x}>{x}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block pb-1 text-[10px] font-black uppercase tracking-widest text-foreground/60">Kondisi Kotak</label>
                    <select className="input w-full h-10 rounded-xl text-sm px-3" value={editForm["kondisi_kotak_p3k"] ?? ""} onChange={(e) => setEditForm((p) => ({ ...p, kondisi_kotak_p3k: e.target.value }))}>
                      <option value="">— Pilih —</option>
                      {KONDISI_KOTAK_OPTIONS.map((x) => <option key={x} value={x}>{x}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Item P3K */}
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-foreground/50 mb-3">Isi Perlengkapan P3K</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {P3K_ITEM_KEYS.map(({ key, label }) => (
                    <div key={key}>
                      <label className="block pb-1 text-[10px] font-black uppercase tracking-widest text-foreground/60">{label}</label>
                      <select className="input w-full h-10 rounded-xl text-sm px-3" value={editForm[key] ?? ""} onChange={(e) => setEditForm((p) => ({ ...p, [key]: e.target.value }))}>
                        <option value="">— Pilih —</option>
                        {P3K_ITEM_OPTIONS.map((x) => <option key={x} value={x}>{x}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hasil & Catatan */}
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-foreground/50 mb-3">Hasil & Catatan</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block pb-1 text-[10px] font-black uppercase tracking-widest text-foreground/60">Hasil Pemeriksaan</label>
                    <select className="input w-full h-10 rounded-xl text-sm px-3" value={editForm["hasil_pemeriksaan"] ?? ""} onChange={(e) => setEditForm((p) => ({ ...p, hasil_pemeriksaan: e.target.value }))}>
                      <option value="">— Pilih —</option>
                      {P3K_ITEM_OPTIONS.map((x) => <option key={x} value={x}>{x}</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block pb-1 text-[10px] font-black uppercase tracking-widest text-foreground/60">Keterangan</label>
                    <textarea className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm min-h-[70px]" value={editForm["keterangan"] ?? ""} onChange={(e) => setEditForm((p) => ({ ...p, keterangan: e.target.value }))} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block pb-1 text-[10px] font-black uppercase tracking-widest text-foreground/60">Tindak Lanjut</label>
                    <textarea className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm min-h-[70px]" value={editForm["tindak_lanjut"] ?? ""} onChange={(e) => setEditForm((p) => ({ ...p, tindak_lanjut: e.target.value }))} />
                  </div>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-surface border-t border-border px-5 py-4 flex justify-end gap-2">
              <button className="button button--ghost button--sm" onClick={() => setEditRow(null)} disabled={busy}>Batal</button>
              <button className="button button--primary button--sm" onClick={submitEdit} disabled={busy}>
                {busy ? <Loader2 size={14} className="animate-spin" /> : "Simpan Perubahan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteRow && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => !busy && setDeleteRow(null)} />
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-surface shadow-2xl p-5">
            <div className="flex items-start gap-3 mb-4">
              <div className="h-9 w-9 rounded-xl bg-error/10 text-error flex items-center justify-center shrink-0">
                <AlertTriangle size={18} />
              </div>
              <div>
                <div className="font-black text-sm">Hapus Data P3K</div>
                <div className="text-xs text-foreground/60 mt-1">
                  Data <span className="font-bold">{pick(deleteRow, ["upt"]) || `Row #${deleteRow._rowNumber}`}</span> akan dihapus permanen dari Google Sheet.
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button className="button button--ghost button--sm" onClick={() => setDeleteRow(null)} disabled={busy}>Batal</button>
              <button className="button button--danger button--sm" onClick={confirmDelete} disabled={busy}>
                {busy ? <Loader2 size={14} className="animate-spin" /> : "Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
