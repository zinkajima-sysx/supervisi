import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/auth";
import { getRows } from "@/lib/sheets";
import { getSemesterRange, getSupervisiUptSet } from "@/lib/semester";

export const runtime = "nodejs";

/**
 * GET /api/supervisi/status?type=apd|p3k&year=2026&semester=1
 *
 * Kembalikan daftar UPT yang sudah dan belum disupervisi
 * dalam semester yang diminta, difilter sesuai role user.
 */
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "apd"; // "apd" | "p3k"
  const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()), 10);
  const semester = (parseInt(searchParams.get("semester") ?? "0", 10) || (new Date().getMonth() < 6 ? 1 : 2)) as 1 | 2;

  const sheetSupervisi = type === "p3k" ? "Data_P3K" : "Data_APD";
  const range = getSemesterRange(year, semester);

  const role = (session.user.role ?? "").toUpperCase();
  const wilayahKerja = (session.user.wilayahKerja ?? "").trim();
  const isRestricted = role === "KEPALA_KLINIK" || role === "DOKTER_FUNGSIONAL";

  // Ambil semua UPT master dan data supervisi secara paralel
  const [uptRows, supervisiRows, klinikRows] = await Promise.all([
    getRows("Data_UPT"),
    getRows(sheetSupervisi),
    isRestricted ? getRows("Data_Klinik") : Promise.resolve([]),
  ]);

  // Filter UPT berdasarkan klinik jika role terbatas
  let filteredUptRows = uptRows as Record<string, any>[];
  let filteredSupervisiRows = supervisiRows as Record<string, any>[];

  if (isRestricted && wilayahKerja && wilayahKerja.toUpperCase() !== "ALL") {
    // Filter UPT master hanya untuk klinik user ini
    filteredUptRows = filteredUptRows.filter(
      (r) => String(r.klinik ?? "").trim().toLowerCase() === wilayahKerja.toLowerCase()
    );

    // Filter data supervisi berdasarkan id_klinik
    const klinik = (klinikRows as Record<string, any>[]).find(
      (r) => String(r.klinik ?? "").trim().toLowerCase() === wilayahKerja.toLowerCase()
    );
    const idKlinik = String(klinik?.id_klinik ?? "").trim();
    if (idKlinik) {
      filteredSupervisiRows = filteredSupervisiRows.filter(
        (r) => String(r.id_klinik ?? "").trim() === idKlinik
      );
    } else {
      filteredSupervisiRows = [];
    }
  }

  // Daftar semua UPT dari master
  const allUpt = Array.from(
    new Set(
      filteredUptRows
        .map((r) => String(r.upt ?? r.nama_upt ?? "").trim())
        .filter(Boolean)
    )
  ).sort();

  // UPT yang sudah disupervisi semester ini
  const doneSet = getSupervisiUptSet(filteredSupervisiRows, range);

  const sudah = allUpt.filter((u) => doneSet.has(u));
  const belum = allUpt.filter((u) => !doneSet.has(u));

  return NextResponse.json({
    year,
    semester,
    type,
    total: allUpt.length,
    sudah,
    belum,
    persen: allUpt.length > 0 ? Math.round((sudah.length / allUpt.length) * 100) : 0,
  });
}
