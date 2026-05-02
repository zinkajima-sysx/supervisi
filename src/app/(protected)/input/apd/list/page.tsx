"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import {
  ChevronLeft, ChevronRight, ExternalLink, Loader2,
  Pencil, Search, Trash2, X, AlertTriangle,
} from "lucide-react";

import { APD_STATUS_OPTIONS } from "@/lib/options";
import { useToast } from "@/components/ToastProvider";

type Row = Record<string, any>;
type ApiResponse = { rows: Row[] };

const APD_ITEM_KEYS = [
  { key: "helemet_type_general_g",    label: "Helmet General (G)" },
  { key: "helemet_type_electric_e",   label: "Helmet Electric (E)" },
  { key: "helemet_type_conductive_c", label: "Helmet Conductive (C)" },
  { key: "safety_spectales",          label: "Safety Spectacles" },
  { key: "safety_goggles",            label: "Safety Goggles" },
  { key: "ear_plug",                  label: "Ear Plug" },
  { key: "ear_muff",                  label: "Ear Muff" },
  { key: "masker",                    label: "Masker" },
  { key: "respirator",                label: "Respirator" },
  { key: "apron",                     label: "Apron" },
  { key: "sarung_tangan_katun",       label: "Sarung Tangan Katun" },
  { key: "sarung_tangan_kulit",       label: "Sarung Tangan Kulit" },
  { key: "sarung_tangan_karet",       label: "Sarung Tangan Karet" },
  { key: "sarung_tangan_electrical",  label: "Sarung Tangan Electrical" },
  { key: "sepatu_pelindung",          label: "Sepatu Pelindung" },
];

function pick(row: Row, keys: string[]) {
  for (const k of keys) {
    const v = row[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

export default function ListApdPage() {
  const { data: session } = useSession();
  const toast = useToast();

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [pageSize] = useState(20);
  const [pageIndex, setPageIndex] = useState(0);
  const [busy, setBusy] = useState(false);

  // Edit modal
  const [editRow, setEditRow] = useState<Row | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});

  // Delete confirm
  const [deleteRow, setDeleteRow] = useState<Row | null>(null);

  const role = (session?.user?.role ?? "").toUpperCase();
  const canEdit = role === "ADMIN" || role === "KEPALA_KLINIK" || role === "DOKTER_FUNGSIONAL" || role === "MANAGER" || role === "ASMEN";

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/laporan/apd");
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
      "apd_lainnya", "kodisi_apd_lainnya", "catatan",
      ...APD_ITEM_KEYS.map((k) => k.key),
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
      const res = await fetch(`/api/supervisi/apd/${rowNumber}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: editForm }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string };
        toast.error(d.error ?? "Gagal menyimpan", "Gagal");
        return;
      }
      toast.success("Data APD berhasil diperbarui", "Sukses");
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
      const res = await fetch(`/api/supervisi/apd/${rowNumber}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string };
        toast.error(d.error ?? "Gagal menghapus", "Gagal");
        return;
      }
      toast.success("Data APD berhasil dihapus", "Sukses");
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
            List Data <span className="text-primary">APD</span>
          </h1>
          <p className="text-xs text-foreground/60 mt-0.5">Kelola data supervisi APD — edit atau hapus entri</p>
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
                <th className="py-3 text-left text-[10px] font-black uppercase tracking-widest text-foreground/50">Petugas</th>
                <th className="py-3 text-left text-[10px] font-black uppercase tracking-widest text-foreground/50">Foto</th>
                {canEdit && <th className="py-3 pr-4 text-right text-[10px] font-black uppercase tracking-widest text-foreground/50">Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={canEdit ? 6 : 5} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2"><Loader2 className="animate-spin text-primary" size={24} /><span className="text-xs opacity-50">Memuat data...</span></div>
                </td></tr>
              ) : paged.length ? paged.map((r, idx) => (
                <tr key={String(r._rowNumber ?? idx)} className="border-b border-border/40 last:border-0 hover:bg-primary/5 transition-colors">
                  <td className="py-3 pl-4 text-xs font-semibold tabular-nums">{String(r.tanggal_supervisi ?? "").slice(0, 10) || "-"}</td>
                  <td className="py-3 text-xs font-bold">{pick(r, ["upt", "nama_upt"]) || "-"}</td>
                  <td className="py-3 text-xs text-foreground/70">{pick(r, ["unit_kerja"]) || "-"}</td>
                  <td className="py-3 text-xs">{pick(r, ["petugas_nama", "submitter_nama", "submitter_username"]) || "-"}</td>
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
                        <button
                          className="button button--ghost button--icon-only button--sm rounded-full"
                          aria-label="Edit"
                          onClick={() => openEdit(r)}
                          disabled={busy}
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          className="button button--danger button--icon-only button--sm rounded-full"
                          aria-label="Hapus"
                          onClick={() => setDeleteRow(r)}
                          disabled={busy}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              )) : (
                <tr><td colSpan={canEdit ? 6 : 5} className="py-16 text-center text-xs opacity-40">Tidak ada data</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
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
                <div className="font-black text-sm text-foreground">Edit Data APD</div>
                <div className="text-[10px] text-foreground/50 mt-0.5">Row #{editRow._rowNumber}</div>
              </div>
              <button className="button button--ghost button--icon-only button--sm rounded-full" onClick={() => setEditRow(null)} disabled={busy}>
                <X size={16} />
              </button>
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
                      <input
                        type={type ?? "text"}
                        className="input w-full rounded-xl text-sm"
                        value={editForm[key] ?? ""}
                        onChange={(e) => setEditForm((p) => ({ ...p, [key]: e.target.value }))}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Item APD */}
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-foreground/50 mb-3">Status Perlengkapan APD</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {APD_ITEM_KEYS.map(({ key, label }) => (
                    <div key={key}>
                      <label className="block pb-1 text-[10px] font-black uppercase tracking-widest text-foreground/60">{label}</label>
                      <select
                        className="input w-full h-10 rounded-xl text-sm px-3"
                        value={editForm[key] ?? ""}
                        onChange={(e) => setEditForm((p) => ({ ...p, [key]: e.target.value }))}
                      >
                        <option value="">— Pilih —</option>
                        {APD_STATUS_OPTIONS.map((x) => <option key={x} value={x}>{x}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Catatan */}
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-foreground/50 mb-3">Catatan & Lainnya</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { key: "apd_lainnya", label: "APD Lainnya" },
                    { key: "kodisi_apd_lainnya", label: "Kondisi APD Lainnya" },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <label className="block pb-1 text-[10px] font-black uppercase tracking-widest text-foreground/60">{label}</label>
                      <input className="input w-full rounded-xl text-sm" value={editForm[key] ?? ""} onChange={(e) => setEditForm((p) => ({ ...p, [key]: e.target.value }))} />
                    </div>
                  ))}
                  <div className="md:col-span-2">
                    <label className="block pb-1 text-[10px] font-black uppercase tracking-widest text-foreground/60">Catatan</label>
                    <textarea className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm min-h-[80px]" value={editForm["catatan"] ?? ""} onChange={(e) => setEditForm((p) => ({ ...p, catatan: e.target.value }))} />
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
                <div className="font-black text-sm text-foreground">Hapus Data APD</div>
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
