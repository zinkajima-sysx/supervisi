import { getServerSession } from "next-auth";

import { authOptions } from "@/auth";
import { filterRowsByWilayah } from "@/lib/rbac";
import { getRows } from "@/lib/sheets";
import Link from "next/link";
import DashboardComplianceCards from "@/components/DashboardComplianceCards";

function isSameMonth(d: Date, ref: Date) {
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
}

function parseDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  const s = String(value).trim();
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function formatDateShort(value: unknown) {
  const d = parseDate(value);
  if (!d) return "-";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function pick(row: any, keys: string[]) {
  for (const k of keys) {
    const v = row?.[k];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (v != null) {
      const s = String(v).trim();
      if (s) return s;
    }
  }
  return "";
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  const [apdRowsRaw, p3kRowsRaw] = await Promise.all([
    getRows("Data_APD"),
    getRows("Data_P3K"),
  ]);

  const apdRows = filterRowsByWilayah(apdRowsRaw as any, {
    role: user?.role,
    wilayahKerja: user?.wilayahKerja ?? null,
    field: "daop_divre" as any,
  });
  const p3kRows = filterRowsByWilayah(p3kRowsRaw as any, {
    role: user?.role,
    wilayahKerja: user?.wilayahKerja ?? null,
    field: "daop_divre" as any,
  });

  const now = new Date();
  const apdThisMonth = apdRows.filter((r) => {
    const d = parseDate((r as any).tanggal_supervisi ?? (r as any).timestamp);
    return d ? isSameMonth(d, now) : false;
  }).length;
  const p3kThisMonth = p3kRows.filter((r) => {
    const d = parseDate((r as any).tanggal_supervisi ?? (r as any).timestamp);
    return d ? isSameMonth(d, now) : false;
  }).length;

  const recent = [
    ...apdRows.map((r) => ({
      type: "APD",
      laporanId: (r as any).laporan_id ?? (r as any)._rowNumber ?? (r as any).timestamp ?? (r as any).id,
      tanggal: (r as any).tanggal_supervisi ?? (r as any).timestamp,
      daop: pick(r, ["daop", "daop_divre", "daop  ", "DAOP", "DAOP / DIVRE"]),
      upt: pick(r, ["upt", "nama_upt", "UPT", "Nama UPT", "nama_upt ", "upt "]),
      submitter: (r as any).submitter_username,
      foto: (r as any).foto_url,
    })),
    ...p3kRows.map((r) => ({
      type: "P3K",
      laporanId: (r as any).laporan_id ?? (r as any)._rowNumber ?? (r as any).timestamp ?? (r as any).id,
      tanggal: (r as any).tanggal_supervisi ?? (r as any).timestamp,
      daop: pick(r, ["daop", "daop_divre", "daop  ", "DAOP", "DAOP / DIVRE"]),
      upt: pick(r, ["upt", "nama_upt", "UPT", "Nama UPT", "nama_upt ", "upt "]),
      submitter: (r as any).submitter_username,
      foto: (r as any).foto_url,
    })),
  ]
    .sort((a, b) => {
      const da = parseDate(a.tanggal)?.getTime() ?? 0;
      const db = parseDate(b.tanggal)?.getTime() ?? 0;
      return db - da;
    })
    .slice(0, 5);

  const initYear = now.getFullYear();
  const initSemester = (now.getMonth() < 6 ? 1 : 2) as 1 | 2;

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-base-content">
            Dashboard <span className="text-primary">Supervisi</span>
          </h1>
          <p className="text-xs md:text-sm text-base-content/60 font-medium">
            Selamat datang kembali, {user?.name}. Berikut ringkasan supervisi bulan ini.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/input/apd" className="button button--primary button--sm px-4 rounded-xl">
            Input APD
          </Link>
          <Link href="/input/p3k" className="button button--outline button--sm px-4 rounded-xl">
            Input P3K
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="rounded-2xl border border-border bg-surface shadow-lg col-span-12 lg:col-span-6 p-4 flex flex-col justify-between overflow-hidden relative min-h-[160px]">
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-[9px] font-black uppercase tracking-[0.22em] text-base-content/45">
                  Supervisi APD
                </div>
                <div className="text-xs font-semibold text-base-content/65">Total bulan ini</div>
              </div>
              <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/10">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25">
                  <path d="M9 11l3 3L22 4" />
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
              </div>
            </div>
            <div className="mt-4 flex items-end gap-2">
              <span className="text-4xl font-black tracking-tight tabular-nums">{apdThisMonth}</span>
              <span className="pb-1 text-[10px] font-bold uppercase tracking-widest text-base-content/45">Inspeksi</span>
            </div>
          </div>
          <div className="relative mt-5">
            <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-base-content/45">
              <span>Progress Target</span>
              <span className="tabular-nums">{Math.min(100, (apdThisMonth / 20) * 100).toFixed(0)}%</span>
            </div>
            <div className="mt-1.5 h-1.5 w-full bg-base-300 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-700 ease-out"
                style={{ width: `${Math.min(100, (apdThisMonth / 20) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface shadow-lg col-span-12 lg:col-span-6 p-4 flex flex-col justify-between overflow-hidden relative min-h-[160px]">
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-secondary/10 rounded-full blur-3xl" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-[9px] font-black uppercase tracking-[0.22em] text-base-content/45">
                  Supervisi P3K
                </div>
                <div className="text-xs font-semibold text-base-content/65">Total bulan ini</div>
              </div>
              <div className="h-8 w-8 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center border border-secondary/10">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25">
                  <path d="M12 7v10" />
                  <path d="M7 12h10" />
                  <path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6z" />
                </svg>
              </div>
            </div>
            <div className="mt-4 flex items-end gap-2">
              <span className="text-4xl font-black tracking-tight tabular-nums">{p3kThisMonth}</span>
              <span className="pb-1 text-[10px] font-bold uppercase tracking-widest text-base-content/45">Inspeksi</span>
            </div>
          </div>
          <div className="relative mt-5">
            <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-base-content/45">
              <span>Progress Target</span>
              <span className="tabular-nums">{Math.min(100, (p3kThisMonth / 15) * 100).toFixed(0)}%</span>
            </div>
            <div className="mt-1.5 h-1.5 w-full bg-base-300 rounded-full overflow-hidden">
              <div
                className="h-full bg-secondary transition-all duration-700 ease-out"
                style={{ width: `${Math.min(100, (p3kThisMonth / 15) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface shadow-lg col-span-12 md:col-span-6 lg:col-span-4 p-4 h-full">
          <div className="text-[9px] font-black uppercase tracking-[0.22em] text-base-content/45">
            Quick Access
          </div>
          <div className="mt-3 grid gap-2">
            <Link href="/laporan/apd" className="button button--outline rounded-xl justify-between text-sm">
              <span className="font-bold">Laporan APD</span>
              <span className="opacity-60">→</span>
            </Link>
            <Link href="/laporan/p3k" className="button button--outline rounded-xl justify-between text-sm">
              <span className="font-bold">Laporan P3K</span>
              <span className="opacity-60">→</span>
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface shadow-lg col-span-12 md:col-span-6 lg:col-span-4 p-4 h-full flex flex-col items-center justify-center text-center">
          <div className="h-10 w-10 rounded-2xl bg-success/10 border border-success/15 text-success flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.25">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="mt-3 text-sm font-black tracking-tight text-base-content">Sistem Aktif</div>
          <div className="mt-0.5 text-xs font-semibold text-base-content/55">Sinkronisasi data berjalan</div>
        </div>

        <div className="rounded-2xl border border-border bg-surface shadow-lg col-span-12 lg:col-span-4 p-4 h-full flex flex-col justify-between">
          <div>
            <div className="text-[9px] font-black uppercase tracking-[0.22em] text-base-content/45">
              Wilayah Kerja
            </div>
            <div className="mt-2 text-xl font-black text-primary tracking-tight truncate">
              {user?.wilayahKerja ?? "Global Access"}
            </div>
            <div className="mt-0.5 text-xs font-semibold text-base-content/55">Akses data sesuai otorisasi</div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <div className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-[9px] font-bold text-foreground/70">
              v1.2.0
            </div>
            <div className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-[9px] font-bold text-foreground/70">
              Production
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface shadow-lg col-span-12 p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-[9px] font-black uppercase tracking-[0.22em] text-base-content/45">
                Aktivitas Terbaru
              </div>
              <div className="text-xs font-semibold text-base-content/70">5 entri terakhir</div>
            </div>
            <Link href="/laporan/apd" className="button button--ghost button--sm rounded-xl text-primary text-xs">
              Lihat semua
            </Link>
          </div>

          <div className="mt-3 grid gap-2">
            {recent.length ? (
              recent.map((r) => (
                <div
                  key={`${r.type}-${String(r.laporanId ?? "row")}`}
                  className="flex items-center gap-3 rounded-xl bg-base-200/50 px-3 py-2 border border-base-content/5"
                >
                  <div
                    className={`h-8 w-8 rounded-xl flex items-center justify-center border shrink-0 ${
                      r.type === "APD"
                        ? "bg-primary/10 text-primary border-primary/10"
                        : "bg-secondary/10 text-secondary border-secondary/10"
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.25">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate text-xs font-bold text-base-content/80">
                        {r.upt || "UPT belum diisi"}
                      </div>
                      <div
                        className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-black uppercase tracking-tight shrink-0 ${
                          r.type === "APD" ? "border-primary text-primary" : "border-secondary text-secondary"
                        }`}
                      >
                        {r.type}
                      </div>
                    </div>
                    <div className="mt-0.5 text-[10px] text-base-content/55 truncate">
                      {r.daop} • {formatDateShort(r.tanggal)}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl bg-base-200/40 border border-base-content/5 p-6 text-center text-base-content/50 text-sm">
                Belum ada data terbaru.
              </div>
            )}
          </div>
        </div>
      </div>

      <DashboardComplianceCards initialYear={initYear} initialSemester={initSemester} />
    </div>
  );
}
