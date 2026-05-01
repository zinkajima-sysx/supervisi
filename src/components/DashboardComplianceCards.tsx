"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Activity,
  Calendar,
  CheckCircle2,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Stethoscope,
  TriangleAlert,
  XCircle,
} from "lucide-react";

type UnitStats = {
  unit: string;
  p3k: { lengkap: number; tidakLengkap: number };
  apd: { lengkap: number; tidakLengkap: number };
};

type GroupStats = {
  groupId: string;
  groupLabel: string;
  units: UnitStats[];
};

type ApiResponse = {
  year: number;
  semester: 1 | 2;
  totals: { p3k: { lengkap: number; tidakLengkap: number }; apd: { lengkap: number; tidakLengkap: number } };
  groups: GroupStats[];
  error?: string;
};

export default function DashboardComplianceCards({
  initialYear,
  initialSemester,
}: {
  initialYear: number;
  initialSemester: 1 | 2;
}) {
  const { data: session } = useSession();
  const [year, setYear] = useState(initialYear);
  const [semester, setSemester] = useState<1 | 2>(initialSemester);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const yearOptions = useMemo(() => {
    const now = new Date().getFullYear();
    const xs = [now - 2, now - 1, now, now + 1].filter((x) => x >= 2000 && x <= 2100);
    return Array.from(new Set(xs));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    fetch(`/api/dashboard/compliance?year=${year}&semester=${semester}`, { cache: "no-store" })
      .then(async (r) => {
        const json = (await r.json().catch(() => null)) as ApiResponse | null;
        if (!r.ok) {
          throw new Error(json?.error || `HTTP ${r.status}`);
        }
        return json;
      })
      .then((json) => {
        if (cancelled) return;
        setData(json);
      })
      .catch((e) => {
        if (cancelled) return;
        setData(null);
        setErr(e instanceof Error ? e.message : "Gagal memuat ringkasan.");
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [year, semester]);

  const role = String(session?.user?.role ?? "").toUpperCase();
  const wilayahKerja = String(session?.user?.wilayahKerja ?? "").trim();
  const scopeLabel =
    role === "KEPALA_KLINIK" && wilayahKerja && wilayahKerja.toUpperCase() !== "ALL"
      ? wilayahKerja
      : "ALL";

  return (
    <section className="space-y-6">
      <div className="glass-card p-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-primary">
              <Calendar size={18} />
              <span className="text-xs font-black uppercase tracking-[0.22em]">Kepatuhan Semester</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-base-content">
              Ringkasan <span className="text-primary">APD &amp; P3K</span>
            </h2>
            <div className="text-sm font-semibold text-base-content/60">
              Scope: <span className="text-base-content/80">{scopeLabel}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-primary/70">Tahun</div>
              <select
                className="select select-bordered h-10 rounded-2xl bg-base-200/30 border-base-content/10 focus:border-primary/30 focus:bg-base-100"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-primary/70">Semester</div>
              <select
                className="select select-bordered h-10 rounded-2xl bg-base-200/30 border-base-content/10 focus:border-primary/30 focus:bg-base-100"
                value={semester}
                onChange={(e) => setSemester(Number(e.target.value) as 1 | 2)}
              >
                <option value={1}>Semester 1</option>
                <option value={2}>Semester 2</option>
              </select>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="rounded-3xl border border-base-content/10 bg-base-200/20 p-5">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-base-content/50">
                P3K Lengkap
              </div>
              <div className="h-10 w-10 rounded-2xl bg-success/10 text-success flex items-center justify-center border border-success/15">
                <Stethoscope size={18} />
              </div>
            </div>
            <div className="mt-4 text-4xl font-black tracking-tight tabular-nums text-base-content">
              {loading ? "…" : data?.totals?.p3k?.lengkap ?? 0}
            </div>
            <div className="mt-1 text-xs font-semibold text-base-content/55">Total hasil pemeriksaan = LENGKAP</div>
          </div>

          <div className="rounded-3xl border border-base-content/10 bg-base-200/20 p-5">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-base-content/50">
                P3K Tidak Lengkap
              </div>
              <div className="h-10 w-10 rounded-2xl bg-error/10 text-error flex items-center justify-center border border-error/15">
                <TriangleAlert size={18} />
              </div>
            </div>
            <div className="mt-4 text-4xl font-black tracking-tight tabular-nums text-base-content">
              {loading ? "…" : data?.totals?.p3k?.tidakLengkap ?? 0}
            </div>
            <div className="mt-1 text-xs font-semibold text-base-content/55">Total hasil pemeriksaan = TIDAK LENGKAP</div>
          </div>

          <div className="rounded-3xl border border-base-content/10 bg-base-200/20 p-5">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-base-content/50">
                APD Lengkap
              </div>
              <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/15">
                <ShieldCheck size={18} />
              </div>
            </div>
            <div className="mt-4 text-4xl font-black tracking-tight tabular-nums text-base-content">
              {loading ? "…" : data?.totals?.apd?.lengkap ?? 0}
            </div>
            <div className="mt-1 text-xs font-semibold text-base-content/55">Semua item wajib = BAIK</div>
          </div>

          <div className="rounded-3xl border border-base-content/10 bg-base-200/20 p-5">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-base-content/50">
                APD Tidak Lengkap
              </div>
              <div className="h-10 w-10 rounded-2xl bg-warning/10 text-warning flex items-center justify-center border border-warning/15">
                <ShieldX size={18} />
              </div>
            </div>
            <div className="mt-4 text-4xl font-black tracking-tight tabular-nums text-base-content">
              {loading ? "…" : data?.totals?.apd?.tidakLengkap ?? 0}
            </div>
            <div className="mt-1 text-xs font-semibold text-base-content/55">Ada item wajib selain BAIK</div>
          </div>
        </div>

        {err && (
          <div role="alert" className="mt-6 rounded-2xl border border-error/25 bg-error/10 px-4 py-3 text-sm text-error">
            <div className="font-semibold">{err}</div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6">
        {(loading ? Array.from({ length: 6 }) : data?.groups ?? []).map((g: any, idx: number) => {
          const units: UnitStats[] = (loading
            ? Array.from({ length: 6 }).map((_, i) => ({
                unit: `Unit ${i + 1}`,
                p3k: { lengkap: 0, tidakLengkap: 0 },
                apd: { lengkap: 0, tidakLengkap: 0 },
              }))
            : (g.units ?? [])) as UnitStats[];

          return (
            <div
              key={g?.groupId ?? `sk-${idx}`}
              className="w-full bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden flex flex-col"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[550px]">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th
                        rowSpan={2}
                        className="p-3 pl-4 text-xs md:text-sm font-semibold text-slate-700 bg-slate-50/50 border-r border-slate-200 align-bottom w-1/3"
                      >
                        UNIT KERJA
                      </th>
                      <th
                        colSpan={2}
                        className="p-2 text-xs font-semibold text-center bg-amber-50 text-amber-900 border-r border-slate-200 border-b border-amber-200/50"
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-amber-600" />
                          P3K
                        </div>
                      </th>
                      <th
                        colSpan={2}
                        className="p-2 text-xs font-semibold text-center bg-blue-50 text-blue-900 border-b border-blue-200/50"
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          <ShieldAlert className="w-3.5 h-3.5 text-blue-600" />
                          APD
                        </div>
                      </th>
                    </tr>

                    <tr className="border-b border-slate-200 text-[10px] uppercase tracking-wider">
                      <th className="p-2 font-medium text-slate-600 bg-amber-50/40 border-r border-slate-200 w-1/6">
                        <div className="flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          <span>Lengkap</span>
                        </div>
                      </th>
                      <th className="p-2 font-medium text-slate-600 bg-amber-50/40 border-r border-slate-200 w-1/6">
                        <div className="flex items-center justify-center gap-1">
                          <XCircle className="w-3 h-3 text-rose-500" />
                          <span>Tdk Lengkap</span>
                        </div>
                      </th>
                      <th className="p-2 font-medium text-slate-600 bg-blue-50/40 border-r border-slate-200 w-1/6">
                        <div className="flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          <span>Lengkap</span>
                        </div>
                      </th>
                      <th className="p-2 font-medium text-slate-600 bg-blue-50/40 w-1/6">
                        <div className="flex items-center justify-center gap-1">
                          <XCircle className="w-3.5 h-3.5 text-rose-500" />
                          <span>Tdk Lengkap</span>
                        </div>
                      </th>
                    </tr>
                  </thead>

                  <tbody className="text-xs md:text-sm">
                    {units.map((u, uIdx) => (
                      <tr
                        key={`${u.unit}-${uIdx}`}
                        className={`border-b border-slate-100 hover:bg-slate-50/80 transition-colors ${
                          uIdx === units.length - 1 ? "border-b-0" : ""
                        }`}
                      >
                        <td className="p-3 pl-4 font-medium text-slate-700 border-r border-slate-100">
                          {u.unit}
                        </td>

                        <td className="p-2 border-r border-slate-100 text-center bg-amber-50/10">
                          <span className="inline-flex items-center justify-center min-w-[2.5rem] px-2 py-0.5 text-[10px] md:text-xs font-bold rounded-full bg-emerald-100 text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                            {u.p3k.lengkap}
                          </span>
                        </td>
                        <td className="p-2 border-r border-slate-100 text-center bg-amber-50/10">
                          <span className="inline-flex items-center justify-center min-w-[2.5rem] px-2 py-0.5 text-[10px] md:text-xs font-bold rounded-full bg-rose-100 text-rose-700 ring-1 ring-inset ring-rose-600/10">
                            {u.p3k.tidakLengkap}
                          </span>
                        </td>

                        <td className="p-2 border-r border-slate-100 text-center bg-blue-50/10">
                          <span className="inline-flex items-center justify-center min-w-[2.5rem] px-2 py-0.5 text-[10px] md:text-xs font-bold rounded-full bg-emerald-100 text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                            {u.apd.lengkap}
                          </span>
                        </td>
                        <td className="p-2 text-center bg-blue-50/10">
                          <span className="inline-flex items-center justify-center min-w-[2.5rem] px-2 py-0.5 text-[10px] md:text-xs font-bold rounded-full bg-rose-100 text-rose-700 ring-1 ring-inset ring-rose-600/10">
                            {u.apd.tidakLengkap}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
