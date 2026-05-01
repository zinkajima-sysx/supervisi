"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { 
  Search, 
  Calendar, 
  Filter, 
  Download, 
  ExternalLink,
  FileText,
  Database,
  Loader2,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

import ExportCsvButton from "@/components/ExportCsvButton";

type ApiResponse = { rows: Record<string, any>[] };

function includesCI(haystack: any, needle: string) {
  const h = String(haystack ?? "").toLowerCase();
  const n = needle.trim().toLowerCase();
  if (!n) return true;
  return h.includes(n);
}

export default function LaporanApdPage() {
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
    fetch("/api/laporan/apd")
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
            <FileText size={20} />
            <span className="text-sm font-bold uppercase tracking-wider">Reports</span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-base-content">
            Laporan <span className="text-primary">APD</span>
          </h1>
          <p className="text-base-content/60 max-w-lg">
            Analisis data penggunaan Alat Pelindung Diri di seluruh wilayah operasional.
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
            fileName="laporan-apd.csv" 
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
                  <Database aria-hidden="true" size={14} className="text-primary" />
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
                <Database aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/30 group-focus-within:text-primary transition-colors" size={18} />
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
                <th className="py-5 pl-6 text-xs font-black uppercase tracking-[0.22em] text-primary/80">Tanggal</th>
                <th className="py-5 text-xs font-black uppercase tracking-[0.22em] text-primary/80">Wilayah (DAOP)</th>
                <th className="py-5 text-xs font-black uppercase tracking-[0.22em] text-primary/80">Nama UPT</th>
                <th className="py-5 text-xs font-black uppercase tracking-[0.22em] text-primary/80">Petugas</th>
                <th className="py-5 pr-6 text-xs font-black uppercase tracking-[0.22em] text-primary/80 text-right">Dokumentasi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Loader2 className="animate-spin text-primary" size={32} />
                      <span className="text-sm font-medium opacity-50">Menyinkronkan data...</span>
                    </div>
                  </td>
                </tr>
              ) : pagedRows.length ? (
                pagedRows.map((r, idx) => (
                  <tr
                    key={String(r._rowNumber ?? r.laporan_id ?? r.timestamp ?? `${r.id ?? "row"}-${idx}`)}
                    className="hover:bg-primary/5 transition-colors group"
                  >
                    <td className="py-4 pl-6 font-semibold tabular-nums text-base-content">
                      {String(r.tanggal_supervisi ?? r.timestamp ?? "").slice(0, 10)}
                    </td>
                    <td className="py-4">
                      <div className="badge badge-ghost badge-sm rounded-md border-base-content/10 font-bold uppercase tracking-tight">
                        {String(r.daop ?? r.daop_divre ?? "").trim() || "-"}
                      </div>
                    </td>
                    <td className="py-4">
                      <span className="font-bold text-base-content">{String(r.upt ?? r.nama_upt ?? "").trim() || "-"}</span>
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary border border-primary/20 uppercase">
                          {String(r.petugas_nama ?? r.submitter_nama ?? r.submitter_username ?? "NA").trim().substring(0, 2)}
                        </div>
                        <span className="text-sm font-semibold text-base-content">
                          {String(r.petugas_nama ?? r.submitter_nama ?? r.submitter_username ?? "-").trim() || "-"}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 pr-6 text-right">
                      {r.foto_url ? (
                        <a 
                          className="btn btn-circle btn-ghost btn-sm text-primary hover:bg-primary hover:text-white" 
                          href={r.foto_url} 
                          target="_blank" 
                          rel="noreferrer"
                          title="Lihat Foto"
                        >
                          <ExternalLink size={16} />
                        </a>
                      ) : (
                        <span className="text-xs opacity-30 italic">No Media</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 opacity-30">
                      <Database size={48} />
                      <span className="text-lg font-bold italic">Data tidak ditemukan</span>
                      <p className="text-sm">Gunakan filter yang berbeda untuk menemukan catatan lain.</p>
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
