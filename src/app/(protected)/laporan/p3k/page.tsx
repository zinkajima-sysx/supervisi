"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { 
  Search, 
  Calendar, 
  Filter, 
  ExternalLink,
  ClipboardList,
  Database,
  Loader2,
  MapPin,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  BarChart3,
} from "lucide-react";

import ExportCsvButton, { type CsvColumn } from "@/components/ExportCsvButton";

type ApiResponse = { rows: Record<string, any>[] };
type StatusResponse = {
  sudah: string[];
  belum: string[];
  total: number;
  persen: number;
  semester: number;
  year: number;
};

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
  const [statusData, setStatusData] = useState<StatusResponse | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"data" | "status">("data");

  const now = new Date();
  const currentSemester = now.getMonth() < 6 ? 1 : 2;
  const currentYear = now.getFullYear();

  const isKepala = useMemo(
    () => {
      const r = (session?.user?.role ?? "").toUpperCase();
      return r === "KEPALA_KLINIK" || r === "DOKTER_FUNGSIONAL";
    },
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

  // Fetch status UPT supervisi semester ini
  useEffect(() => {
    let cancelled = false;
    setStatusLoading(true);
    fetch(`/api/supervisi/status?type=p3k&year=${currentYear}&semester=${currentSemester}`)
      .then((r) => r.json())
      .then((data: StatusResponse) => { if (!cancelled) setStatusData(data); })
      .catch(() => { if (!cancelled) setStatusData(null); })
      .finally(() => { if (!cancelled) setStatusLoading(false); });
    return () => { cancelled = true; };
  }, [currentYear, currentSemester]);

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
    <div className="space-y-5 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary">
            <ClipboardList size={18} />
            <span className="text-xs font-bold uppercase tracking-wider">Inventory Reports</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-base-content">
            Laporan <span className="text-primary">P3K</span>
          </h1>
          <p className="text-xs text-base-content/60">
            Semester {currentSemester} — {currentYear} &nbsp;·&nbsp; {isKepala ? "Klinik kamu" : "Semua wilayah"}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-base-200 p-2 rounded-xl border border-border">
          <div className="px-3 py-1.5">
            <span className="text-[10px] font-semibold block text-base-content/50 uppercase">Total Records</span>
            <span className="text-lg font-bold text-primary tabular-nums">{loading ? "..." : filtered.length}</span>
          </div>
          <div className="h-8 self-center w-px bg-border" />
          <ExportCsvButton rows={filtered} fileName="laporan-p3k.csv" columns={exportColumns} className="button button--primary button--sm" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-base-200 border border-border w-fit">
        <button type="button" onClick={() => setActiveTab("data")}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === "data" ? "bg-surface shadow text-primary" : "text-foreground/60 hover:text-foreground"}`}>
          <span className="flex items-center gap-2"><Database size={13} /> Data Laporan</span>
        </button>
        <button type="button" onClick={() => setActiveTab("status")}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === "status" ? "bg-surface shadow text-primary" : "text-foreground/60 hover:text-foreground"}`}>
          <span className="flex items-center gap-2"><BarChart3 size={13} /> Status UPT Semester Ini</span>
        </button>
      </div>

      {/* Tab: Status UPT */}
      {activeTab === "status" && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="rounded-2xl border border-border bg-surface shadow-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-foreground/50">Progress Supervisi P3K</div>
                <div className="text-lg font-black text-foreground mt-0.5">Semester {currentSemester} — {currentYear}</div>
              </div>
              {statusData && (
                <div className="text-right">
                  <div className="text-3xl font-black text-primary tabular-nums">{statusData.persen}%</div>
                  <div className="text-[10px] text-foreground/50">{statusData.sudah.length} / {statusData.total} UPT</div>
                </div>
              )}
            </div>
            {statusData && (
              <div className="h-2 w-full bg-base-200 rounded-full overflow-hidden">
                <div className="h-full bg-primary transition-all duration-700" style={{ width: `${statusData.persen}%` }} />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-success/20 bg-success/5 p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 size={16} className="text-success" />
                <span className="text-xs font-black uppercase tracking-widest text-success">
                  Sudah Supervisi ({statusLoading ? "..." : statusData?.sudah.length ?? 0})
                </span>
              </div>
              {statusLoading ? (
                <div className="flex items-center gap-2 text-xs text-foreground/50"><Loader2 size={14} className="animate-spin" /> Memuat...</div>
              ) : statusData?.sudah.length ? (
                <ul className="space-y-1.5 max-h-64 overflow-y-auto">
                  {statusData.sudah.map((u) => (
                    <li key={u} className="flex items-center gap-2 text-xs font-medium text-foreground/80">
                      <div className="h-1.5 w-1.5 rounded-full bg-success shrink-0" />{u}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-foreground/40 italic">Belum ada UPT yang disupervisi semester ini.</p>
              )}
            </div>

            <div className="rounded-2xl border border-warning/20 bg-warning/5 p-4">
              <div className="flex items-center gap-2 mb-3">
                <XCircle size={16} className="text-warning" />
                <span className="text-xs font-black uppercase tracking-widest text-warning">
                  Belum Supervisi ({statusLoading ? "..." : statusData?.belum.length ?? 0})
                </span>
              </div>
              {statusLoading ? (
                <div className="flex items-center gap-2 text-xs text-foreground/50"><Loader2 size={14} className="animate-spin" /> Memuat...</div>
              ) : statusData?.belum.length ? (
                <ul className="space-y-1.5 max-h-64 overflow-y-auto">
                  {statusData.belum.map((u) => (
                    <li key={u} className="flex items-center gap-2 text-xs font-medium text-foreground/80">
                      <div className="h-1.5 w-1.5 rounded-full bg-warning shrink-0" />{u}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-success font-bold">🎉 Semua UPT sudah disupervisi semester ini!</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Data Laporan */}
      {activeTab === "data" && (
        <>
      <div className="rounded-2xl border border-border bg-surface shadow-lg overflow-visible">
        <div className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 bg-primary rounded-lg text-primary-content"><Filter size={15} /></div>
            <h2 className="text-sm font-bold">Filter Pencarian</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="w-full">
              <label className="block py-1 text-[10px] font-black uppercase tracking-widest text-foreground/60">DAOP / DIVRE</label>
              <div className="relative">
                <input className="input w-full pl-9 rounded-xl text-sm" value={daop} onChange={(e) => setDaop(e.target.value)} disabled placeholder="DAOP 2 BANDUNG" />
                <MapPin aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/30" size={15} />
              </div>
            </div>
            <div className="w-full">
              <label className="block py-1 text-[10px] font-black uppercase tracking-widest text-foreground/60">Tanggal Supervisi</label>
              <div className="relative">
                <input type="date" className="input w-full pl-9 rounded-xl text-sm" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
                <Calendar aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/30" size={15} />
              </div>
            </div>
            <div className="w-full">
              <label className="block py-1 text-[10px] font-black uppercase tracking-widest text-foreground/60">Pencarian UPT</label>
              <div className="relative">
                <input className="input w-full pl-9 rounded-xl text-sm" value={upt} onChange={(e) => setUpt(e.target.value)} placeholder="Ketik nama UPT..." />
                <Search aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/30" size={15} />
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-primary/70">Baris / halaman</div>
              <select className="input h-9 rounded-xl px-3 text-sm" value={pageSize} onChange={(e) => setPageSize(Number(e.target.value) as 10 | 30 | 50 | 100)}>
                <option value={10}>10</option><option value={30}>30</option><option value={50}>50</option><option value={100}>100</option>
              </select>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-xs font-semibold">Hal. {safePageIndex + 1} / {totalPages}</div>
              <div className="flex items-center">
                <button className="button button--outline rounded-l-xl rounded-r-none" onClick={() => setPageIndex((p) => Math.max(0, p - 1))} disabled={loading || safePageIndex === 0} aria-label="Sebelumnya"><ChevronLeft className="h-4 w-4" /></button>
                <button className="button button--outline rounded-r-xl rounded-l-none" onClick={() => setPageIndex((p) => Math.min(totalPages - 1, p + 1))} disabled={loading || safePageIndex >= totalPages - 1} aria-label="Berikutnya"><ChevronRight className="h-4 w-4" /></button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="py-3 pl-4 text-left text-xs font-black uppercase tracking-[0.22em] text-foreground/60">Waktu</th>
                <th className="py-3 text-left text-xs font-black uppercase tracking-[0.22em] text-foreground/60">Wilayah / Unit</th>
                <th className="py-3 text-left text-xs font-black uppercase tracking-[0.22em] text-foreground/60">UPT</th>
                <th className="py-3 text-left text-xs font-black uppercase tracking-[0.22em] text-foreground/60">Spesifikasi</th>
                <th className="py-3 text-left text-xs font-black uppercase tracking-[0.22em] text-foreground/60">Hasil</th>
                <th className="py-3 pr-4 text-right text-xs font-black uppercase tracking-[0.22em] text-foreground/60">Media</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="py-16 text-center"><div className="flex flex-col items-center gap-2"><Loader2 className="animate-spin text-primary" size={28} /><span className="text-xs font-medium opacity-50">Mengambil data terbaru...</span></div></td></tr>
              ) : pagedRows.length ? (
                pagedRows.map((r, idx) => (
                  <tr key={String(r._rowNumber ?? r.laporan_id ?? r.timestamp ?? `${r.id ?? "row"}-${idx}`)} className="hover:bg-primary/5 transition-colors border-b border-border/50 last:border-0">
                    <td className="py-3 pl-4 font-medium tabular-nums text-xs">{String(r.tanggal_supervisi ?? r.timestamp ?? "").slice(0, 10)}</td>
                    <td className="py-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-bold text-primary uppercase tracking-tighter">{String(r.daop ?? r.daop_divre ?? "").trim() || "-"}</span>
                        <span className="text-xs font-medium text-base-content/70">{String(r.unit_kerja ?? r.nama_unit_kerja ?? "").trim() || "-"}</span>
                      </div>
                    </td>
                    <td className="py-3 font-bold text-xs">{String(r.upt ?? r.nama_upt ?? "").trim() || "-"}</td>
                    <td className="py-3"><div className="inline-flex items-center rounded border border-border px-1.5 py-0.5 font-bold text-[10px] uppercase text-foreground/70">KOTAK {r.kelas_kotak}</div></td>
                    <td className="py-3">
                      {r.hasil_supervisi === "LENGKAP" ? (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success/10 text-success border border-success/20 text-[10px] font-bold"><CheckCircle2 size={10} />LENGKAP</div>
                      ) : (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-warning/10 text-warning border border-warning/20 text-[10px] font-bold"><AlertCircle size={10} />TDK LENGKAP</div>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-right">
                      {r.foto_url ? (
                        <a className="button button--ghost button--icon-only button--sm rounded-full text-primary" href={r.foto_url} target="_blank" rel="noreferrer"><ExternalLink size={14} /></a>
                      ) : (
                        <span className="text-[10px] opacity-20 italic">-</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={6} className="py-16 text-center"><div className="flex flex-col items-center gap-2 opacity-30"><Database size={36} /><span className="text-sm font-bold italic">Belum ada data</span></div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}
    </div>
  );
}
