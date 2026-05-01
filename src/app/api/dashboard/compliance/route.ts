import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/auth";
import { getRows } from "@/lib/sheets";

export const runtime = "nodejs";

function parseDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  const s = String(value).trim();
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function clampInt(value: unknown, min: number, max: number): number | null {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const x = Math.floor(n);
  if (x < min || x > max) return null;
  return x;
}

function pickString(row: any, keys: string[]): string {
  for (const k of keys) {
    const v = row?.[k];
    const s = String(v ?? "").trim();
    if (s) return s;
  }
  return "";
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

const APD_REQUIRED_KEYS = [
  "helemet_type_general_g",
  "helemet_type_electric_e",
  "helemet_type_conductive_c",
  "safety_spectales",
  "safety_goggles",
  "ear_plug",
  "ear_muff",
  "masker",
  "respirator",
  "apron",
  "sarung_tangan_katun",
  "sarung_tangan_kulit",
  "sarung_tangan_karet",
  "sarung_tangan_electrical",
  "sepatu_pelindung",
];

function isApdLengkap(row: any): boolean {
  for (const key of APD_REQUIRED_KEYS) {
    const v = String(row?.[key] ?? "").trim().toUpperCase();
    if (v !== "BAIK") return false;
  }
  return true;
}

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

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const year = clampInt(url.searchParams.get("year"), 2000, 2100) ?? new Date().getFullYear();
  const semester = clampInt(url.searchParams.get("semester"), 1, 2) ?? (new Date().getMonth() < 6 ? 1 : 2);

  const start = new Date(year, semester === 1 ? 0 : 6, 1, 0, 0, 0, 0);
  const end = new Date(year, semester === 1 ? 6 : 12, 1, 0, 0, 0, 0);

  const [apdRaw, p3kRaw, uptRaw, klinikRaw] = await Promise.all([
    getRows("Data_APD"),
    getRows("Data_P3K"),
    getRows("Data_UPT"),
    getRows("Data_Klinik"),
  ]);

  const role = String(user.role ?? "").toUpperCase();
  const wilayahKerja = String(user.wilayahKerja ?? "").trim();

  let scopedIdKlinik: string | null = null;
  if (role === "KEPALA_KLINIK" && wilayahKerja && wilayahKerja.toUpperCase() !== "ALL") {
    const found = (klinikRaw as any[]).find(
      (r) => normalize(String(r.klinik ?? "")) === normalize(wilayahKerja)
    );
    const idKlinik = String(found?.id_klinik ?? "").trim();
    if (idKlinik) scopedIdKlinik = idKlinik;
  }

  const inRange = (row: any) => {
    const d = parseDate(row?.tanggal_supervisi ?? row?.timestamp);
    if (!d) return false;
    return d >= start && d < end;
  };

  const apdRows = (apdRaw as any[]).filter((r) => inRange(r));
  const p3kRows = (p3kRaw as any[]).filter((r) => inRange(r));

  const scopedApd = scopedIdKlinik ? apdRows.filter((r) => String(r.id_klinik ?? "").trim() === scopedIdKlinik) : apdRows;
  const scopedP3k = scopedIdKlinik ? p3kRows.filter((r) => String(r.id_klinik ?? "").trim() === scopedIdKlinik) : p3kRows;

  const unitStats = new Map<string, UnitStats>();
  const getUnit = (r: any) => pickString(r, ["unit_kerja", "nama_unit_kerja"]);

  for (const r of scopedP3k) {
    const unit = getUnit(r);
    if (!unit) continue;
    const key = unit;
    const stats =
      unitStats.get(key) ??
      ({
        unit,
        p3k: { lengkap: 0, tidakLengkap: 0 },
        apd: { lengkap: 0, tidakLengkap: 0 },
      } satisfies UnitStats);

    const hasil = String(r.hasil_pemeriksaan ?? "").trim().toUpperCase();
    if (hasil === "LENGKAP") stats.p3k.lengkap += 1;
    else if (hasil === "TIDAK LENGKAP") stats.p3k.tidakLengkap += 1;
    unitStats.set(key, stats);
  }

  for (const r of scopedApd) {
    const unit = getUnit(r);
    if (!unit) continue;
    const key = unit;
    const stats =
      unitStats.get(key) ??
      ({
        unit,
        p3k: { lengkap: 0, tidakLengkap: 0 },
        apd: { lengkap: 0, tidakLengkap: 0 },
      } satisfies UnitStats);

    if (isApdLengkap(r)) stats.apd.lengkap += 1;
    else stats.apd.tidakLengkap += 1;
    unitStats.set(key, stats);
  }

  const groupMap = new Map<string, { groupId: string; groupLabel: string; unitSet: Set<string> }>();
  for (const row of uptRaw as any[]) {
    const groupLabel = pickString(row, ["ketegori", "kategori", "group", "card"]) || "LAINNYA";
    const unit = pickString(row, ["unit_kerja", "nama_unit_kerja"]);
    if (!unit) continue;
    const groupId = normalize(groupLabel) || "lainnya";
    const g = groupMap.get(groupId) ?? { groupId, groupLabel, unitSet: new Set<string>() };
    g.unitSet.add(unit);
    groupMap.set(groupId, g);
  }

  const groups: GroupStats[] = Array.from(groupMap.values())
    .sort((a, b) => a.groupLabel.localeCompare(b.groupLabel))
    .map((g) => {
      const units = Array.from(g.unitSet)
        .sort((a, b) => a.localeCompare(b))
        .slice(0, 6)
        .map((unit) => unitStats.get(unit) ?? { unit, p3k: { lengkap: 0, tidakLengkap: 0 }, apd: { lengkap: 0, tidakLengkap: 0 } });
      return { groupId: g.groupId, groupLabel: g.groupLabel, units };
    })
    .slice(0, 14);

  const totals = Array.from(unitStats.values()).reduce(
    (acc, u) => {
      acc.p3k.lengkap += u.p3k.lengkap;
      acc.p3k.tidakLengkap += u.p3k.tidakLengkap;
      acc.apd.lengkap += u.apd.lengkap;
      acc.apd.tidakLengkap += u.apd.tidakLengkap;
      return acc;
    },
    { p3k: { lengkap: 0, tidakLengkap: 0 }, apd: { lengkap: 0, tidakLengkap: 0 } }
  );

  return NextResponse.json({
    year,
    semester,
    range: { start: start.toISOString(), end: end.toISOString() },
    scoped: scopedIdKlinik ? { mode: "KLINIK", id_klinik: scopedIdKlinik } : { mode: "ALL" },
    totals,
    groups,
  });
}

