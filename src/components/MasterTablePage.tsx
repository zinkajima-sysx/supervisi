"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { ChevronLeft, ChevronRight, Loader2, Pencil, Plus, Search, Trash2, X } from "lucide-react";

import ExportCsvButton from "@/components/ExportCsvButton";
import { useToast } from "@/components/ToastProvider";

type Props = {
  title: string;
  description: string;
  entity: "users" | "klinik" | "upt";
  fileName: string;
};

type RowValue = string | number | boolean | null;
type Row = Record<string, RowValue>;
type ApiResponse = { headers?: string[]; rows?: Row[]; error?: string };

function includesCI(haystack: unknown, needle: string) {
  const h = String(haystack ?? "").toLowerCase();
  const n = needle.trim().toLowerCase();
  if (!n) return true;
  return h.includes(n);
}

function useIsMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return mounted;
}

function humanizeKey(key: string) {
  const map: Record<string, string> = {
    id: "ID",
    id_klinik: "ID Klinik",
    username: "Username",
    password: "Password",
    nipp: "NIPP",
    nama_lengkap: "Nama Lengkap",
    role: "Role",
    wilayah_kerja: "Wilayah Kerja",
    klinik: "Klinik",
    kepala_klinik: "Kepala Klinik",
    daop: "DAOP",
    "daop  ": "DAOP",
    unit_kerja: "Unit Kerja",
    upt: "UPT",
    ketegori: "Kategori",
    kategori: "Kategori",
  };
  return map[key] ?? key;
}

function isRowNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function getRowNumber(row: Row): number | null {
  const v = row["_rowNumber"];
  return isRowNumber(v) ? v : null;
}

export default function MasterTablePage({ title, description, entity, fileName }: Props) {
  const isMounted = useIsMounted();
  const { data: session } = useSession();
  const toast = useToast();
  const isAdmin = (session?.user?.role ?? "").toUpperCase() === "ADMIN";
  const isScoped = useMemo(() => {
    const r = (session?.user?.role ?? "").toUpperCase();
    return r === "KEPALA_KLINIK" || r === "DOKTER_FUNGSIONAL";
  }, [session?.user?.role]);
  const scopedWilayah = (session?.user?.wilayahKerja ?? "").trim();

  const wilayahKerjaOptions = useMemo(() => {
    if (entity !== "users") return [];
    return [
      "ALL",
      "MEDISKA BANDUNG",
      "MEDISKA WASTU KENCANA",
      "MEDISKA PURWAKARTA",
      "MEDISKA CIBATU",
      "MEDISKA TASIKMALAYA",
      "MEDISKA BANJAR",
    ];
  }, [entity]);

  const [rows, setRows] = useState<Row[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [pageSize, setPageSize] = useState<10 | 20 | 30 | 50 | 100>(10);
  const [pageIndex, setPageIndex] = useState(0);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editingRow, setEditingRow] = useState<Row | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingRow, setDeletingRow] = useState<Row | null>(null);
  const [klinikNames, setKlinikNames] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setActionError(null);
      try {
        const res = await fetch(`/api/master/${entity}`);
        const data = (await res.json()) as ApiResponse;
        if (cancelled) return;
        setRows(data.rows ?? []);
        setHeaders((data.headers ?? []).filter((h) => h !== "_rowNumber"));
        if (!res.ok) {
          setActionError(data.error ?? "Gagal memuat data.");
        }
      } catch {
        if (cancelled) return;
        setRows([]);
        setHeaders([]);
        setActionError("Gagal memuat data.");
      } finally {
        if (cancelled) return;
        setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [entity]);

  useEffect(() => {
    if (entity !== "upt") return;
    let cancelled = false;
    fetch("/api/master/klinik")
      .then((r) => r.json())
      .then((data: ApiResponse) => {
        if (cancelled) return;
        const names = (data.rows ?? [])
          .map((r) => String(r["klinik"] ?? "").trim())
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b));
        setKlinikNames(Array.from(new Set(names)));
      })
      .catch(() => {
        if (cancelled) return;
        setKlinikNames([]);
      });
    return () => {
      cancelled = true;
    };
  }, [entity]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (!query.trim()) return true;
      for (const v of Object.values(r)) {
        if (includesCI(v, query)) return true;
      }
      return false;
    });
  }, [rows, query]);

  useEffect(() => {
    setPageIndex(0);
  }, [query, entity]);

  const columns = useMemo(() => {
    const base =
      headers.length > 0
        ? headers
        : Object.keys(filtered[0] ?? rows[0] ?? {}).filter((k) => k !== "_rowNumber");

    const preferred =
      entity === "users"
        ? ["id", "username", "password", "nipp", "nama_lengkap", "role", "wilayah_kerja"]
        : entity === "klinik"
          ? ["id_klinik", "klinik", "nipp", "kepala_klinik"]
          : ["daop", "unit_kerja", "upt", "ketegori", "kategori", "klinik", "id_klinik"];

    const set = new Set(base);
    const ordered = preferred.filter((k) => set.has(k));
    const rest = base.filter((k) => !ordered.includes(k)).sort((a, b) => a.localeCompare(b));
    return [...ordered, ...rest];
  }, [filtered, rows, headers, entity]);

  const totalRows = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const safePageIndex = Math.min(pageIndex, totalPages - 1);
  const pagedRows = useMemo(() => {
    const start = safePageIndex * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, pageSize, safePageIndex]);

  useEffect(() => {
    if (safePageIndex !== pageIndex) setPageIndex(safePageIndex);
  }, [safePageIndex, pageIndex]);

  function openCreate() {
    setActionError(null);
    setMode("create");
    setEditingRow(null);
    const initial: Record<string, string> = {};
    for (const k of columns) {
      if (k === "daop" || k === "daop  ") initial[k] = "DAOP 2 BANDUNG";
      // Auto-fill wilayah_kerja / klinik untuk role terbatas
      else if (isScoped && (k === "wilayah_kerja" || k === "klinik") && scopedWilayah) {
        initial[k] = scopedWilayah;
      }
      else initial[k] = "";
    }
    setForm(initial);
    setModalOpen(true);
  }

  function openEdit(row: Row) {
    console.log(`[OPEN_EDIT] Row data:`, row);
    setActionError(null);
    setMode("edit");
    setEditingRow(row);
    const initial: Record<string, string> = {};
    for (const k of columns) {
      initial[k] = String(row[k] ?? "");
    }
    // Auto-fill wilayah_kerja / klinik untuk role terbatas jika kosong
    if (isScoped && scopedWilayah) {
      if (!initial["wilayah_kerja"]) initial["wilayah_kerja"] = scopedWilayah;
      if (!initial["klinik"]) initial["klinik"] = scopedWilayah;
    }
    setForm(initial);
    setModalOpen(true);
  }

  async function reload() {
    const res = await fetch(`/api/master/${entity}`);
    const data = (await res.json()) as ApiResponse;
    setRows(data.rows ?? []);
    setHeaders((data.headers ?? []).filter((h) => h !== "_rowNumber"));
  }

  async function submit() {
    setActionError(null);
    setActionBusy(true);
    console.log(`[SUBMIT] Mode: ${mode}, form:`, form);
    try {
      if (mode === "create") {
        const res = await fetch(`/api/master/${entity}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: form }),
        });
        const data = (await res.json().catch(() => ({}))) as ApiResponse;
        if (!res.ok) {
          console.error("[SUBMIT] POST failed:", data.error);
          setActionError(data.error ?? "Gagal menyimpan data.");
          toast.error(data.error ?? "Gagal menyimpan data.", "Gagal");
          return;
        }
        toast.success("Data berhasil ditambahkan.", "Sukses");
      } else {
        const rowNumber = editingRow ? getRowNumber(editingRow) : null;
        console.log(`[SUBMIT] PATCH rowNumber: ${rowNumber}, data:`, form);
        if (!rowNumber) {
          setActionError("RowNumber tidak ditemukan.");
          toast.error("RowNumber tidak ditemukan.", "Gagal");
          return;
        }
        const res = await fetch(`/api/master/${entity}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rowNumber, data: form }),
        });
        const data = (await res.json().catch(() => ({}))) as ApiResponse;
        if (!res.ok) {
          console.error("[SUBMIT] PATCH failed:", data.error);
          setActionError(data.error ?? "Gagal menyimpan perubahan.");
          toast.error(data.error ?? "Gagal menyimpan perubahan.", "Gagal");
          return;
        }
        toast.success("Perubahan berhasil disimpan.", "Sukses");
      }
      
      console.log("[SUBMIT] Success, closing modal and reloading...");
      setModalOpen(false);
      
      try {
        await reload();
        console.log("[SUBMIT] Reload finished");
      } catch (err) {
        console.error("[SUBMIT] Reload failed:", err);
      }
    } catch (err) {
      console.error("[SUBMIT] Unexpected error:", err);
      setActionError("Gagal memproses permintaan.");
      toast.error("Gagal memproses permintaan.", "Gagal");
    } finally {
      setActionBusy(false);
    }
  }

  function openDelete(row: Row) {
    setDeletingRow(row);
    setConfirmOpen(true);
    setActionError(null);
  }

  async function confirmDelete() {
    const rowNumber = deletingRow ? getRowNumber(deletingRow) : null;
    if (!rowNumber) {
      setActionError("RowNumber tidak ditemukan.");
      toast.error("RowNumber tidak ditemukan.", "Gagal");
      setConfirmOpen(false);
      return;
    }
    setActionBusy(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/master/${entity}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rowNumber }),
      });
      const data = (await res.json().catch(() => ({}))) as ApiResponse;
      if (!res.ok) {
        setActionError(data.error ?? "Gagal menghapus data.");
        toast.error(data.error ?? "Gagal menghapus data.", "Gagal");
        return;
      }
      toast.success("Data berhasil dihapus.", "Sukses");
      try {
        await reload();
      } catch (err) {
        console.error("Reload failed", err);
      }
      setConfirmOpen(false);
    } catch {
      setActionError("Gagal menghapus data.");
      toast.error("Gagal menghapus data.", "Gagal");
    } finally {
      setActionBusy(false);
    }
  }

  if (!isMounted) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm font-medium text-base-content/60">Menyiapkan halaman...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-foreground">{title}</h1>
          <p className="text-sm md:text-base text-foreground/70 font-medium max-w-2xl">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          {(isAdmin || isScoped) && (
            <button
              className="button button--primary"
              onClick={openCreate}
              disabled={loading || actionBusy}
            >
              <Plus aria-hidden="true" className="h-5 w-5" />
              Tambah
            </button>
          )}
          <ExportCsvButton
            rows={filtered as any}
            fileName={fileName}
            className="button button--outline"
          />
        </div>
      </div>

      {actionError && (
        <div role="alert" className="rounded-2xl border border-danger bg-danger text-danger-foreground px-4 py-3 text-sm">
          <div className="font-semibold">{actionError}</div>
        </div>
      )}


      <div className="rounded-3xl border border-border bg-surface shadow-xl overflow-visible">
        <div className="p-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <label
                htmlFor="search"
                className="block pb-2 text-xs font-black uppercase tracking-[0.22em] text-foreground/60"
              >
                Pencarian
              </label>
              <div className="relative">
                <Search
                  aria-hidden="true"
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/60"
                  size={18}
                />
                <input
                  id="search"
                  name="q"
                  autoComplete="off"
                  className="input w-full h-12 rounded-2xl pl-12 pr-4"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Cari (nama, DAOP, UPT, role)…"
                />
              </div>
            </div>
            <div className="md:col-span-1 flex items-end">
              <div className="w-full rounded-2xl bg-surface border border-border px-4 py-3">
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-foreground/60">Total</div>
                <div className="mt-1 text-2xl font-black tracking-tight tabular-nums text-primary">
                  {loading ? "…" : totalRows}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-foreground/60">
                Baris / halaman
              </div>
              <select
                className="input h-10 rounded-2xl px-3"
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value) as 10 | 20 | 30 | 50 | 100)}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={30}>30</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div className="flex items-center justify-between md:justify-end gap-3">
              <div className="text-sm font-semibold text-foreground">
                Halaman <span className="tabular-nums">{safePageIndex + 1}</span> /{" "}
                <span className="tabular-nums">{totalPages}</span>
              </div>
              <div className="flex items-center">
                <button
                  className="button button--outline rounded-l-2xl rounded-r-none"
                  onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
                  disabled={loading || actionBusy || safePageIndex === 0}
                  aria-label="Sebelumnya"
                >
                  <ChevronLeft aria-hidden="true" className="h-5 w-5" />
                </button>
                <button
                  className="button button--outline rounded-r-2xl rounded-l-none"
                  onClick={() => setPageIndex((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={loading || actionBusy || safePageIndex >= totalPages - 1}
                  aria-label="Berikutnya"
                >
                  <ChevronRight aria-hidden="true" className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-surface shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {columns.map((c) => (
                  <th
                    key={c}
                    className="py-5 px-4 text-left text-xs font-black uppercase tracking-[0.22em] text-foreground/60"
                  >
                    {humanizeKey(c)}
                  </th>
                ))}
                {(isAdmin || isScoped) && (
                  <th className="py-5 px-4 text-left text-xs font-black uppercase tracking-[0.22em] text-foreground/60">
                    Aksi
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={Math.max(1, columns.length + ((isAdmin || isScoped) ? 1 : 0))} className="py-20 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Loader2 aria-hidden="true" className="animate-spin text-primary" size={32} />
                      <span className="text-sm font-medium text-base-content/60">Memuat data…</span>
                    </div>
                  </td>
                </tr>
              ) : pagedRows.length ? (
                pagedRows.map((r, idx) => (
                  <tr
                    key={String(r["_rowNumber"] ?? idx)}
                    className="hover:bg-primary/5 transition-colors"
                  >
                    {columns.map((c) => (
                      <td key={c} className="py-4 px-4 text-sm font-medium text-foreground">
                        <div className="min-w-0 break-words">{String(r[c] ?? "").trim() || "-"}</div>
                      </td>
                    ))}
                    {(isAdmin || isScoped) && (
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            className="button button--ghost button--icon-only button--sm rounded-full"
                            aria-label="Edit"
                            onClick={() => openEdit(r)}
                            disabled={actionBusy}
                          >
                            <Pencil aria-hidden="true" className="h-4 w-4" />
                          </button>
                          <button
                            className="button button--danger button--icon-only button--sm rounded-full"
                            aria-label="Hapus"
                            onClick={() => openDelete(r)}
                            disabled={actionBusy}
                          >
                            <Trash2 aria-hidden="true" className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={Math.max(1, columns.length + ((isAdmin || isScoped) ? 1 : 0))} className="py-20 text-center">
                    <div className="text-foreground/60">
                      Data tidak ditemukan. Coba ubah kata kunci pencarian.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => (actionBusy ? null : setModalOpen(false))} />
          <div className="relative w-full max-w-3xl rounded-3xl border border-border bg-surface shadow-2xl p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-lg font-black tracking-tight text-foreground uppercase">
                  {mode === "create" ? "Tambah Data Baru" : "Edit Data Eksisting"}
                </div>
                <div className="mt-1 text-sm font-medium text-foreground/70">
                  Entity: <span className="font-bold text-primary">{entity.toUpperCase()}</span> | {title}
                </div>
              </div>
              <button
                className="button button--ghost button--icon-only rounded-full"
                aria-label="Tutup"
                onClick={() => setModalOpen(false)}
                disabled={actionBusy}
              >
                <X aria-hidden="true" className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 grid grid-cols-12 gap-4">
              {columns.map((k) => {
                const isDaop = k === "daop" || k === "daop  ";
                const isPassword = entity === "users" && k === "password";
                const isRole = entity === "users" && k === "role";
                const isAutoId = entity === "users" && k === "id";
                const isWilayahKerja = entity === "users" && k === "wilayah_kerja";
                const isKlinikField = entity === "upt" && k === "klinik";
                const colSpan = k === "keterangan" || k === "catatan" ? "col-span-12" : "col-span-12 md:col-span-6";

                if (isRole) {
                  return (
                    <div key={k} className={colSpan}>
                      <label className="block pb-2 text-xs font-black uppercase tracking-[0.22em] text-foreground/60">
                        {humanizeKey(k)}
                      </label>
                      <select
                        className="input w-full rounded-2xl px-3"
                        value={form[k] ?? ""}
                        onChange={(e) => setForm((p) => ({ ...p, [k]: e.target.value }))}
                      >
                        <option value="" disabled>
                          Pilih Role
                        </option>
                        {["ADMIN", "MANAGER", "ASMEN", "KEPALA_KLINIK", "DOKTER_FUNGSIONAL"].map((x) => (
                          <option key={x} value={x}>
                            {x}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                }

                if (isWilayahKerja) {
                  return (
                    <div key={k} className={colSpan}>
                      <label className="block pb-2 text-xs font-black uppercase tracking-[0.22em] text-foreground/60">
                        {humanizeKey(k)}
                      </label>
                      <select
                        className="input w-full rounded-2xl px-3"
                        value={form[k] ?? ""}
                        onChange={(e) => setForm((p) => ({ ...p, [k]: e.target.value }))}
                      >
                        <option value="" disabled>
                          Pilih Wilayah Kerja
                        </option>
                        {wilayahKerjaOptions.map((x) => (
                          <option key={x} value={x}>
                            {x}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                }

                if (isKlinikField && klinikNames.length) {
                  return (
                    <div key={k} className={colSpan}>
                      <label className="block pb-2 text-xs font-black uppercase tracking-[0.22em] text-foreground/60">
                        {humanizeKey(k)}
                      </label>
                      <select
                        className="input w-full rounded-2xl px-3"
                        value={form[k] ?? ""}
                        onChange={(e) => setForm((p) => ({ ...p, [k]: e.target.value }))}
                      >
                        <option value="" disabled>
                          Pilih Klinik
                        </option>
                        {klinikNames.map((x) => (
                          <option key={x} value={x}>
                            {x}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                }

                return (
                  <div key={k} className={colSpan}>
                    <label className="block pb-2 text-xs font-black uppercase tracking-[0.22em] text-foreground/60">
                      {humanizeKey(k)}
                    </label>
                    <input
                      className="input w-full h-12 rounded-2xl px-4"
                      type={isPassword ? "password" : "text"}
                      value={form[k] ?? ""}
                      onChange={(e) => setForm((p) => ({ ...p, [k]: e.target.value }))}
                      readOnly={isDaop || isAutoId || (isScoped && (k === "wilayah_kerja" || k === "klinik"))}
                      disabled={isDaop || isAutoId || (isScoped && (k === "wilayah_kerja" || k === "klinik"))}
                      placeholder={
                        isDaop ? "DAOP 2 BANDUNG"
                        : isAutoId ? "Auto (USR-0001, USR-0002, ...)"
                        : (isScoped && (k === "wilayah_kerja" || k === "klinik")) ? scopedWilayah
                        : undefined
                      }
                    />
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button className="button button--ghost" onClick={() => setModalOpen(false)} disabled={actionBusy}>
                Batal
              </button>
              <button className="button button--primary" onClick={submit} disabled={actionBusy}>
                {actionBusy ? <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" /> : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => (actionBusy ? null : setConfirmOpen(false))} />
          <div className="relative w-full max-w-lg rounded-3xl border border-border bg-surface shadow-2xl p-6">
            <div className="text-lg font-black tracking-tight text-foreground">Hapus Data</div>
            <div className="mt-2 text-sm font-medium text-foreground/70">
              Data akan dihapus permanen dari Google Sheet.
            </div>
            <div className="mt-5 rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground/70">
              RowNumber: <span className="font-bold tabular-nums">{String(getRowNumber(deletingRow ?? {}) ?? "-")}</span>
            </div>
            <div className="mt-6 flex items-center justify-end gap-2">
              <button className="button button--ghost" onClick={() => setConfirmOpen(false)} disabled={actionBusy}>
                Batal
              </button>
              <button className="button button--danger" onClick={confirmDelete} disabled={actionBusy}>
                {actionBusy ? <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" /> : "Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
