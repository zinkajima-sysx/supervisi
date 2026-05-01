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
  return value
    .trim()
    .toLowerCase()
    .replace(/[.,]/g, "")
    .replace(/\s+/g, " ");
}

const CARD_UNIT_GROUPS: string[][] = [
  ["Operasional", "SDM Umum", "Sarana", "Jalan Rel dan Jembatan", "Sinyal, Telekomunikasi dan Listrik", "Kesehatan"],
  ["Aset", "Logistik", "Informasi dan Teknologi", "Jalan dan rel", "Legal", "Bangdis"],
  ["Komersialisasi Non Aset", "Humas", "SDM Umum", "Balai Yasa", "Angkutan Penumpang", "Direktur Utama"],
  ["Wakil Direktur", "Direktur Keselamatan", "Safety", "Security", "Building Assets", "Non Railway Assets"],
  [
    "Direktur SDM Dan Kelembagaan",
    "Human Capital Services",
    "Human Capital Strategi And Policy",
    "Division Of Health",
    "Corporate Culture",
    "Institutional Relation",
  ],
  [
    "Institutional And Satkeholder Management",
    "Corporate University",
    "Strategic Alignment And Partnership",
    "Assesment Center",
    "Signal, Telecommunication, Electricity, And Technology",
    "Leadership, Business, Marketing, And Support Academy",
  ],
  [
    "Operation And Safety Academy",
    "Lembaga Sertifikasi Profesi",
    "Rolling Stock And Logistic Academy",
    "Learning Support And Delivery",
    "Track, Brige And Construction Academy",
    "Direktur Bisnis Dan Pengembangan Usaha",
  ],
  ["Sales", "Marketing And Business Development", "Bussiness", "Business Development", "Marketing And Sales", "Passanger Transport Marketing And Sales"],
  ["Project Investment", "Direktur Operasi", "Personnel Organizing", "Opration Integration", "Opration Managemnt", "Direktur Pengelolaan Sarana Dan Prasarana"],
  [
    "Rolling Stock Maintenance",
    "Technical Enginering",
    "Track And Brige",
    "Signaling Telecomunication And Electricity",
    "Infrastruktur Asset",
    "Building",
  ],
  [
    "Direktur Perencanaan Dan Management Resiko",
    "Finance Consolidation",
    "Revenue and Cost Consolidation",
    "Finance Management",
    "Revenue, Tax And Treasury",
    "Logistics",
  ],
  [
    "General Affair",
    "Direktur Keuangan Dan Umum",
    "Direktorat Portofolio Management Dan Teknologi Informasi",
    "Portofolio And Subsidiary Management",
    "Informasi Teknology",
    "Digital Transformation Office",
  ],
  [
    "New Teknology Adoption And Product Development",
    "Corporate Secretary",
    "Office Of The Board",
    "Corporate Culture And General Fasilities",
    "Dokumen Managemnt",
    "Corporate Communication",
  ],
  ["Social Responsibility", "Internal Audit", "Policy And Regulation", "Legal Dispute Resolution", "Legal Business", "Corporate Transformation"],
];

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

  const [apdRaw, p3kRaw, klinikRaw] = await Promise.all([
    getRows("Data_APD"),
    getRows("Data_P3K"),
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

  const scopedApd = scopedIdKlinik
    ? apdRows.filter((r) => String(r.id_klinik ?? "").trim() === scopedIdKlinik)
    : apdRows;
  const scopedP3k = scopedIdKlinik
    ? p3kRows.filter((r) => String(r.id_klinik ?? "").trim() === scopedIdKlinik)
    : p3kRows;

  const unitStats = new Map<string, UnitStats>();
  const getUnit = (r: any) => pickString(r, ["unit_kerja", "nama_unit_kerja"]);

  const canonicalByNorm = new Map<string, string>();
  for (const group of CARD_UNIT_GROUPS) {
    for (const u of group) {
      const k = normalize(u);
      if (!canonicalByNorm.has(k)) canonicalByNorm.set(k, u);
    }
  }

  const totals = { p3k: { lengkap: 0, tidakLengkap: 0 }, apd: { lengkap: 0, tidakLengkap: 0 } };

  for (const r of scopedP3k) {
    const unitRaw = getUnit(r);
    const key = normalize(unitRaw);
    const canonical = canonicalByNorm.get(key);
    const hasil = String(r.hasil_pemeriksaan ?? "").trim().toUpperCase();
    if (hasil === "LENGKAP") totals.p3k.lengkap += 1;
    else if (hasil === "TIDAK LENGKAP") totals.p3k.tidakLengkap += 1;
    if (!canonical) continue;

    const stats =
      unitStats.get(key) ??
      ({
        unit: canonical,
        p3k: { lengkap: 0, tidakLengkap: 0 },
        apd: { lengkap: 0, tidakLengkap: 0 },
      } satisfies UnitStats);

    if (hasil === "LENGKAP") stats.p3k.lengkap += 1;
    else if (hasil === "TIDAK LENGKAP") stats.p3k.tidakLengkap += 1;
    unitStats.set(key, stats);
  }

  for (const r of scopedApd) {
    const unitRaw = getUnit(r);
    const key = normalize(unitRaw);
    const canonical = canonicalByNorm.get(key);
    if (isApdLengkap(r)) totals.apd.lengkap += 1;
    else totals.apd.tidakLengkap += 1;
    if (!canonical) continue;

    const stats =
      unitStats.get(key) ??
      ({
        unit: canonical,
        p3k: { lengkap: 0, tidakLengkap: 0 },
        apd: { lengkap: 0, tidakLengkap: 0 },
      } satisfies UnitStats);

    if (isApdLengkap(r)) stats.apd.lengkap += 1;
    else stats.apd.tidakLengkap += 1;
    unitStats.set(key, stats);
  }

  const groups: GroupStats[] = CARD_UNIT_GROUPS.map((units, idx) => ({
    groupId: `card-${idx + 1}`,
    groupLabel: `CARD ${idx + 1}`,
    units: units.map((u) => {
      const key = normalize(u);
      return (
        unitStats.get(key) ?? {
          unit: u,
          p3k: { lengkap: 0, tidakLengkap: 0 },
          apd: { lengkap: 0, tidakLengkap: 0 },
        }
      );
    }),
  }));

  return NextResponse.json({
    year,
    semester,
    range: { start: start.toISOString(), end: end.toISOString() },
    scoped: scopedIdKlinik ? { mode: "KLINIK", id_klinik: scopedIdKlinik } : { mode: "ALL" },
    totals,
    groups,
  });
}
