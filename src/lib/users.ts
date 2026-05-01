import bcrypt from "bcryptjs";

import { getSpreadsheet } from "@/lib/google";

export type AppRole = "ADMIN" | "MANAGER" | "ASMEN" | "KEPALA_KLINIK";

export type AppUser = {
  id: string;
  username: string;
  nama_lengkap: string;
  role: AppRole;
  wilayah_kerja?: string;
};

type UserRow = {
  id?: string;
  username?: string;
  password?: string;
  nama_lengkap?: string;
  role?: string;
  wilayah_kerja?: string;
};

function normalizeRole(value: string | undefined): AppRole | null {
  const role = (value ?? "").trim().toUpperCase();
  if (role === "ADMIN") return "ADMIN";
  if (role === "MANAGER") return "MANAGER";
  if (role === "ASMEN") return "ASMEN";
  if (role === "KEPALA_KLINIK") return "KEPALA_KLINIK";
  return null;
}

export async function findUserByUsername(username: string): Promise<UserRow | null> {
  const doc = await getSpreadsheet();
  const sheet = doc.sheetsByTitle["Data_User"];
  if (!sheet) {
    throw new Error('Sheet "Data_User" not found');
  }
  const rows = await sheet.getRows<Record<string, string>>();
  const wanted = username.trim().toLowerCase();
  const rowObj = rows
    .map((r) => ((r as any).toObject?.() ?? {}) as UserRow)
    .find((r) => (r.username ?? "").trim().toLowerCase() === wanted);
  if (!rowObj) return null;
  return {
    id: rowObj.id,
    username: rowObj.username,
    password: rowObj.password,
    nama_lengkap: rowObj.nama_lengkap,
    role: rowObj.role,
    wilayah_kerja: rowObj.wilayah_kerja,
  };
}

export async function verifyCredentials(
  username: string,
  password: string
): Promise<AppUser | null> {
  const row = await findUserByUsername(username);
  if (!row?.username || !row.password || !row.role) return null;

  const role = normalizeRole(row.role);
  if (!role) return null;

  const stored = String(row.password);
  const provided = String(password);
  const matches = stored.startsWith("$2")
    ? await bcrypt.compare(provided, stored)
    : stored === provided;

  if (!matches) return null;

  return {
    id: row.id ?? row.username,
    username: row.username,
    nama_lengkap: row.nama_lengkap ?? row.username,
    role,
    wilayah_kerja: (row.wilayah_kerja ?? "").trim() || undefined,
  };
}
