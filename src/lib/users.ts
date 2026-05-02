import bcrypt from "bcryptjs";

import { getRows } from "@/lib/sheets";

export type AppRole = "ADMIN" | "MANAGER" | "ASMEN" | "KEPALA_KLINIK" | "DOKTER_FUNGSIONAL";

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

function normalizeKey(key: string): string {
  return key.trim().toLowerCase().replace(/\s+/g, "_");
}

function normalizeRowKeys<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    const nk = normalizeKey(k);
    if (!(nk in out)) out[nk] = v;
  }
  return out;
}

function pickString(obj: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const nk = normalizeKey(k);
    const v = obj[nk];
    const s = String(v ?? "").trim();
    if (s) return s;
  }
  return undefined;
}

function normalizeRole(value: string | undefined): AppRole | null {
  const role = (value ?? "").trim().toUpperCase();
  if (role === "ADMIN") return "ADMIN";
  if (role === "MANAGER") return "MANAGER";
  if (role === "ASMEN") return "ASMEN";
  if (role === "KEPALA_KLINIK") return "KEPALA_KLINIK";
  if (role === "DOKTER_FUNGSIONAL") return "DOKTER_FUNGSIONAL";
  return null;
}

export async function findUserByUsername(username: string): Promise<UserRow | null> {
  const wanted = username.trim().toLowerCase();
  const rows = await getRows("Data_User");
  const rowObj = rows
    .map((r) => normalizeRowKeys(r as Record<string, unknown>))
    .find((r) => (pickString(r, ["username"]) ?? "").trim().toLowerCase() === wanted);
  if (!rowObj) return null;
  return {
    id: pickString(rowObj, ["id", "id_pegawai", "nip", "nipp"]),
    username: pickString(rowObj, ["username", "user", "email", "user_id"]),
    password: pickString(rowObj, ["password", "pass", "kata_sandi"]),
    nama_lengkap: pickString(rowObj, ["nama_lengkap", "nama lengkap", "nama", "full_name"]),
    role: pickString(rowObj, ["role", "jabatan", "hak_akses"]),
    wilayah_kerja: pickString(rowObj, ["wilayah_kerja", "wilayah kerja", "klinik", "unit"]),
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

  const stored = String(row.password).trim();
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
