"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { 
  Search, 
  Calendar, 
  Filter, 
  Download, 
  ExternalLink,
  ClipboardList,
  Database,
  Loader2,
  MapPin,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

import ExportCsvButton, { type CsvColumn } from "@/components/ExportCsvButton";

type ApiResponse = { rows: Record<string, any>[] };

function includesCI(haystack: any, needle: string) {
  const h = String(haystack ?? "").toLowerCase();
  const n = needle.trim().toLowerCase();
  if (!n) return true;
  return h.includes(n);
}

export default function LaporanP3kPage() {
  const { data: session } = useSession();
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(true);
  const [daop, setDaop] = useState("");
  const [upt, setUpt] = useState("");
  const [tanggal, setTanggal] = useState("");
  const [pageSize, setPageSize] = useState<10 | 30 | 50 | 100>(10);
  const [pageIndex, setPageIndex] = useState(0);

  const isKepala = useMemo(
    () => (session?.user?.role ?? "").toUpperCase() === "KEPALA_KLINIK",
    [session?.user?.role]
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/laporan/p3k")
      .then((r) => r.json())
      .then((data: ApiResponse) => {
        if (cancelled) return;
        setRows(data.rows ?? []);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setDaop("DAOP 2 BANDUNG");
  }, [isKepala, session?.user?.wilayahKerja]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const rowDaop = String(r.daop ?? r.daop_divre ?? "").trim();
      const rowTanggal = String(r.tanggal_supervisi ?? r.timestamp ?? "").slice(0, 10);
      const rowUpt = r.upt ?? r.nama_upt ?? "";

      if (!isKepala && daop && rowDaop !== daop) return false;
      if (tanggal && rowTanggal !== tanggal)
        return false;
      if (!includesCI(rowUpt, upt)) return false;
      return true;
    });
  }, [rows, isKepala, daop, upt, tanggal]);

  const exportColumns = useMemo<CsvColumn[]>(() => {
    const pick = (r: Record<string, any>, keys: string[]) => {
      for (const k of keys) {
        const v = String(r[k] ?? "").trim();
        if (v) return v;
      }
      return "";
    };

    const itemKeys = [
      { key: "kasa_steril", label: "KASA STERIL" },
      { key: "perban_5cm", label: "PERBAN 5 CM" },
      { key: "perban_10cm", label: "PERBAN 10 CM" },
      { key: "perban_1,2cm", label: "PERBAN 1,2 CM" },
      { key: "plester_cepat", label: "PLESTER CEPAT" },
      { key: "kapas_25gram", label: "KAPAS 25 GRAM" },
      { key: "kain_mitela", label: "KAIN MITELA" },
      { key: "gunting", label: "GUNTING" },
      { key: "peniti", label: "PENITI" },
      { key: "sarung_tangan_disposible", label: "SARUNG TANGAN DISPOSIBLE" },
      { key: "bidai", label: "BIDAI" },
      { key: "masker", label: "MASKER" },
      { key: "pinset", label: "PINSET" },
      { key: "lampu_senter", label: "LAMPU SENTER" },
      { key: "gelas_cucimata", label: "GELAS CUCI MATA" },
      { key: "kantong_plastik_bersih", label: "KANTONG PLASTIK BERSIH" },
      { key: "aquades_100ml", label: "AQUADES 100 ML" },
      { key: "betadine_60ml", label: "BETADINE 60 ML" },
      { key: "alkohol_70", label: "ALKOHOL 70%" },
      { key: "buku_panduan_p3k", label: "BUKU PANDUAN P3K" },
      { key: "buku_catatan", label: "BUKU CATATAN" },
      { key: "buku_daftar_isikotak", label: "BUKU DAFTAR ISI KOTAK" },
      { key: "kotak_p3k", label: "KOTAK P3K" },
    ] satisfies Array<{ key: string; label: string }>;

    return [
      {
        key: "tanggal_supervisi",
        label: "TANGGAL SUPERVISI",
        value: (r) => String(r.tanggal_supervisi ?? r.timestamp ?? "").slice(0, 10),
      },
      {
        key: "petugas_nama",
        label: "NAMA PETUGAS",
        value: (r) =>
          pick(r, ["petugas_nama", "submitter_nama", "submitter_username", "id"]),
      },
      {
        key: "upt",
        label: "UPT",
        value: (r) => pick(r, ["upt", "nama_upt"]),
      },
      {
        key: "unit_kerja",
        label: "NAMA UNIT KERJA",
        value: (r) => pick(r, ["unit_kerja", "nama_unit_kerja"]),
      },
      {
        key: "kelas_kotak",
        label: "KELAS KOTAK",
        value: (r) => pick(r, ["kelas_kotak"]),
      },
      {
        key: "kondisi_kotak_p3k",
        label: "KONDISI KOTAK",
        value: (r) => pick(r, ["kondisi_kotak_p3k", "kondisi_kotak"]),
      },
      ...itemKeys.map((c) => ({
        key: c.key,
        label: c.label,
        value: (r: Record<string, any>) => pick(r, [c.key]),
      })),
      {
        key: "hasil_pemeriksaan",
        label: "HASIL PEMERIKSAAN",
        value: (r) => pick(r, ["hasil_pemeriksaan"]),
      },
      {
        key: "keterangan",
        label: "KETERANGAN",
        value: (r) => pick(r, ["keterangan"]),
      },
      {
        key: "tindak_lanjut",
        label: "TINDAK LANJUT",
        value: (r) => pick(r, ["tindak_lanjut"]),
      },
    ];
  }, []);

  useEffect(() => {
    setPageIndex(0);
  }, [daop, upt, tanggal, isKepala]);

  const totalRows = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const safePageIndex = Math.min(pageIndex, totalPages - 1);
  const pagedRows = useMemo(() => {
    const start = safePageIndex * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, safePageIndex, pageSize]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary">
            <ClipboardList size={20} />
            <span className="text-sm font-bold uppercase tracking-wider">Inventory Reports</span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-base-content">
            Laporan <span className="text-primary">P3K</span>
          </h1>
          <p className="text-base-content/60 max-w-lg">
            Pemantauan kelengkapan kotak P3K di seluruh unit kerja dan UPT.
          </p>
        </div>
        
        <div className="flex items-center gap-3 bg-base-200/50 p-2 rounded-2xl backdrop-blur-sm border border-base-content/5">
          <div className="px-4 py-2">
            <span className="text-xs font-semibold block text-base-content/50 uppercase">Total Records</span>
            <span className="text-xl font-bold text-primary tabular-nums">
              {loading ? "..." : filtered.length}
            </span>
          </div>
          <div className="divider divider-horizontal mx-0 h-10 self-center"></div>
          <ExportCsvButton 
            rows={filtered} 
            fileName="laporan-p3k.csv" 
            columns={exportColumns}
            className="btn btn-primary rounded-xl shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
          />
        </div>
      </div>

      {/* Filters Section */}
      <div className="glass-card overflow-visible">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Filter size={18} />
            </div>
            <h2 className="text-lg font-bold">Filter Pencarian</h2>
          </div>
          
          <div className="grid gap-6 md:grid-cols-3">
            <div className="form-control w-full">
              <label className="label py-1">
                <span className="label-text font-black text-primary/80 flex items-center gap-2">
                  <MapPin aria-hidden="true" size={14} className="text-primary" />
                  DAOP / DIVRE
                </span>
              </label>
              <div className="relative group">
                <input
                  className={`input input-bordered w-full pl-10 rounded-xl bg-base-200/30 focus:bg-base-100 transition-all border-base-content/10 ${isKepala ? 'opacity-70 grayscale' : ''}`}
                  value={daop}
                  onChange={(e) => setDaop(e.target.value)}
                  disabled={true}
                  placeholder="DAOP 2 BANDUNG"
                />
                <MapPin aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/30 group-focus-within:text-primary transition-colors" size={18} />
              </div>
            </div>

            <div className="form-control w-full">
              <label className="label py-1">
                <span className="label-text font-black text-primary/80 flex items-center gap-2">
                  <Calendar aria-hidden="true" size={14} className="text-primary" />
                  Tanggal Supervisi
                </span>
              </label>
              <div className="relative group">
                <input
                  type="date"
                  className="input input-bordered w-full pl-10 rounded-xl bg-base-200/30 focus:bg-base-100 transition-all border-base-content/10"
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                />
                <Calendar aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/30 group-focus-within:text-primary transition-colors" size={18} />
              </div>
            </div>

            <div className="form-control w-full">
              <label className="label py-1">
                <span className="label-text font-black text-primary/80 flex items-center gap-2">
                  <Search aria-hidden="true" size={14} className="text-primary" />
                  Pencarian UPT
                </span>
              </label>
              <div className="relative group">
                <input
                  className="input input-bordered w-full pl-10 rounded-xl bg-base-200/30 focus:bg-base-100 transition-all border-base-content/10"
                  value={upt}
                  onChange={(e) => setUpt(e.target.value)}
                  placeholder="Ketik nama UPT..."
                />
                <Search aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/30 group-focus-within:text-primary transition-colors" size={18} />
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-primary/70">
                Baris / halaman
              </div>
              <select
                className="select select-bordered h-10 rounded-2xl bg-base-200/30 border-base-content/10 focus:border-primary/30 focus:bg-base-100"
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value) as 10 | 30 | 50 | 100)}
              >
                <option value={10}>10</option>
                <option value={30}>30</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div className="flex items-center justify-between md:justify-end gap-3">
              <div className="text-sm font-semibold text-base-content">
                Halaman <span className="tabular-nums">{safePageIndex + 1}</span> /{" "}
                <span className="tabular-nums">{totalPages}</span>
              </div>
              <div className="join">
                <button
                  className="btn btn-primary btn-outline join-item rounded-l-2xl"
                  onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
                  disabled={loading || safePageIndex === 0}
                  aria-label="Sebelumnya"
                >
                  <ChevronLeft aria-hidden="true" className="h-5 w-5" />
                </button>
                <button
                  className="btn btn-primary btn-outline join-item rounded-r-2xl"
                  onClick={() => setPageIndex((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={loading || safePageIndex >= totalPages - 1}
                  aria-label="Berikutnya"
                >
                  <ChevronRight aria-hidden="true" className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full">
            <thead>
              <tr className="bg-base-200/50 border-b border-base-content/5">
                <th className="py-5 pl-6 text-xs font-black uppercase tracking-[0.22em] text-primary/80">Waktu</th>
                <th className="py-5 text-xs font-black uppercase tracking-[0.22em] text-primary/80">Wilayah / Unit</th>
                <th className="py-5 text-xs font-black uppercase tracking-[0.22em] text-primary/80">UPT</th>
                <th className="py-5 text-xs font-black uppercase tracking-[0.22em] text-primary/80">Spesifikasi</th>
                <th className="py-5 text-xs font-black uppercase tracking-[0.22em] text-primary/80">Hasil</th>
                <th className="py-5 pr-6 text-xs font-black uppercase tracking-[0.22em] text-primary/80 text-right">Media</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Loader2 className="animate-spin text-primary" size={32} />
                      <span className="text-sm font-medium opacity-50">Mengambil data terbaru...</span>
                    </div>
                  </td>
                </tr>
              ) : pagedRows.length ? (
                pagedRows.map((r, idx) => (
                  <tr
                    key={String(r._rowNumber ?? r.laporan_id ?? r.timestamp ?? `${r.id ?? "row"}-${idx}`)}
                    className="hover:bg-primary/5 transition-colors group"
                  >
                    <td className="py-4 pl-6 font-medium tabular-nums text-sm">
                      {String(r.tanggal_supervisi ?? r.timestamp ?? "").slice(0, 10)}
                    </td>
                    <td className="py-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-bold text-primary uppercase tracking-tighter leading-none">
                          {String(r.daop ?? r.daop_divre ?? "").trim() || "-"}
                        </span>
                        <span className="text-sm font-medium text-base-content/70">
                          {String(r.unit_kerja ?? r.nama_unit_kerja ?? "").trim() || "-"}
                        </span>
                      </div>
                    </td>
                    <td className="py-4">
                      <span className="font-bold text-base-content">
                        {String(r.upt ?? r.nama_upt ?? "").trim() || "-"}
                      </span>
                    </td>
                    <td className="py-4">
                      <div className="badge badge-outline badge-sm rounded-md font-bold text-[10px] border-base-content/20 uppercase">
                        KOTAK {r.kelas_kotak}
                      </div>
                    </td>
                    <td className="py-4">
                      {r.hasil_supervisi === "LENGKAP" ? (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-success/10 text-success border border-success/20 text-xs font-bold">
                          <CheckCircle2 size={12} />
                          LENGKAP
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-warning/10 text-warning border border-warning/20 text-xs font-bold">
                          <AlertCircle size={12} />
                          TIDAK LENGKAP
                        </div>
                      )}
                    </td>
                    <td className="py-4 pr-6 text-right">
                      {r.foto_url ? (
                        <a 
                          className="btn btn-circle btn-ghost btn-sm text-primary hover:bg-primary hover:text-white transition-all shadow-sm hover:shadow-primary/40" 
                          href={r.foto_url} 
                          target="_blank" 
                          rel="noreferrer"
                        >
                          <ExternalLink size={16} />
                        </a>
                      ) : (
                        <div className="pr-4 italic opacity-20 text-[10px] uppercase font-bold">No Data</div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 opacity-30">
                      <Database size={48} />
                      <span className="text-lg font-bold italic">Belum ada data</span>
                      <p className="text-sm">Silakan sesuaikan filter atau tambahkan data supervisi baru.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
