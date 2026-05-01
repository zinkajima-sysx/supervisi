import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/auth";
import { getRows } from "@/lib/sheets";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [rowsRaw, userRowsRaw] = await Promise.all([getRows("Data_APD"), getRows("Data_User")]);
  const role = (session.user.role ?? "").toUpperCase();
  const wilayahKerja = (session.user.wilayahKerja ?? "").trim();

  const userById = new Map<string, string>();
  const userByUsername = new Map<string, string>();
  for (const u of userRowsRaw as any[]) {
    const id = String(u.id ?? "").trim();
    const username = String(u.username ?? "").trim().toLowerCase();
    const nama = String(u.nama_lengkap ?? "").trim();
    if (id && nama) userById.set(id, nama);
    if (username && nama) userByUsername.set(username, nama);
  }

  if (role === "KEPALA_KLINIK") {
    if (!wilayahKerja) return NextResponse.json({ rows: [] });
    const klinikRows = await getRows("Data_Klinik");
    const klinik = (klinikRows as any[]).find(
      (r) => String(r.klinik ?? "").trim().toLowerCase() === wilayahKerja.toLowerCase()
    );
    const idKlinik = String(klinik?.id_klinik ?? "").trim();
    const baseRows = idKlinik
      ? (rowsRaw as any[]).filter((r) => String(r.id_klinik ?? "").trim() === idKlinik)
      : [];
    const rows = baseRows.map((r) => {
      const submitterId = String(r.id ?? "").trim();
      const submitterUsername = String(r.submitter_username ?? "").trim().toLowerCase();
      const petugas_nama =
        userById.get(submitterId) ||
        userByUsername.get(submitterUsername) ||
        String(r.submitter_nama ?? "").trim() ||
        String(r.submitter_username ?? "").trim() ||
        "-";
      return { ...r, petugas_nama };
    });
    return NextResponse.json({ rows });
  }

  const rows = (rowsRaw as any[]).map((r) => {
    const submitterId = String(r.id ?? "").trim();
    const submitterUsername = String(r.submitter_username ?? "").trim().toLowerCase();
    const petugas_nama =
      userById.get(submitterId) ||
      userByUsername.get(submitterUsername) ||
      String(r.submitter_nama ?? "").trim() ||
      String(r.submitter_username ?? "").trim() ||
      "-";
    return { ...r, petugas_nama };
  });

  return NextResponse.json({ rows });
}
