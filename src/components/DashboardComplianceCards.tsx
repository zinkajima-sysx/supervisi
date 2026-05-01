"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Calendar, ShieldCheck, ShieldX, Stethoscope, TriangleAlert } from "lucide-react";

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

function Badge({
  label,
  value,
  variant,
}: {
  label: string;
  value: number;
  variant: "ok" | "bad" | "info";
}) {
  const cls =
    variant === "ok"
      ? "bg-success/10 text-success border-success/15"
      : variant === "bad"
        ? "bg-error/10 text-error border-error/15"
        : "bg-base-200/60 text-base-content/70 border-base-content/10";

  return (
    <div className={`flex items-center justify-between gap-2 rounded-xl border px-2.5 py-2 ${cls}`}>
      <div className="text-[10px] font-black uppercase tracking-[0.22em]">{label}</div>
      <div className="text-sm font-black tabular-nums">{value}</div>
    </div>
  );
}

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
        {(loading ? Array.from({ length: 6 }) : data?.groups ?? []).map((g: any, idx: number) => (
          <div key={g?.groupId ?? `sk-${idx}`} className="glass-card p-6 overflow-hidden relative">
            <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
            <div className="relative">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[10px] font-black uppercase tracking-[0.22em] text-base-content/45">
                    Card {idx + 1}
                  </div>
                  <div className="mt-1 text-lg font-black tracking-tight text-base-content truncate">
                    {loading ? "Memuat…" : String(g.groupLabel ?? "Unit")}
                  </div>
                </div>
                <div className="h-10 w-10 rounded-2xl bg-base-200/60 border border-base-content/10 flex items-center justify-center text-primary">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.25">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l8 4v6c0 5-3 9-8 12-5-3-8-7-8-12V7l8-4z" />
                  </svg>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {(loading ? Array.from({ length: 6 }) : g.units ?? []).map((u: any, uIdx: number) => (
                  <div
                    key={u?.unit ?? `u-${uIdx}`}
                    className="rounded-2xl border border-base-content/10 bg-base-200/30 px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 text-sm font-black text-base-content truncate">
                        {loading ? `Unit ${uIdx + 1}` : String(u.unit)}
                      </div>
                      <div className="text-[10px] font-black uppercase tracking-[0.22em] text-base-content/40">
                        {loading ? "" : ""}
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Badge label="P3K L" value={loading ? 0 : Number(u.p3k?.lengkap ?? 0)} variant="ok" />
                      <Badge label="P3K TL" value={loading ? 0 : Number(u.p3k?.tidakLengkap ?? 0)} variant="bad" />
                      <Badge label="APD L" value={loading ? 0 : Number(u.apd?.lengkap ?? 0)} variant="ok" />
                      <Badge label="APD TL" value={loading ? 0 : Number(u.apd?.tidakLengkap ?? 0)} variant="bad" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

