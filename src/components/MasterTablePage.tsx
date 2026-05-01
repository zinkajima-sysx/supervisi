"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { ChevronLeft, ChevronRight, Loader2, Pencil, Plus, Search, Trash2, X } from "lucide-react";

import ExportCsvButton from "@/components/ExportCsvButton";

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
  const { data: session } = useSession();
  const isAdmin = (session?.user?.role ?? "").toUpperCase() === "ADMIN";

  const [rows, setRows] = useState<Row[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [pageSize, setPageSize] = useState<10 | 30 | 50 | 100>(10);
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
      else initial[k] = "";
    }
    setForm(initial);
    setModalOpen(true);
  }

  function openEdit(row: Row) {
    setActionError(null);
    setMode("edit");
    setEditingRow(row);
    const initial: Record<string, string> = {};
    for (const k of columns) {
      initial[k] = String(row[k] ?? "");
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
    try {
      if (mode === "create") {
        const res = await fetch(`/api/master/${entity}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: form }),
        });
        const data = (await res.json().catch(() => ({}))) as ApiResponse;
        if (!res.ok) {
          setActionError(data.error ?? "Gagal menyimpan data.");
          return;
        }
      } else {
        const rowNumber = editingRow ? getRowNumber(editingRow) : null;
        if (!rowNumber) {
          setActionError("RowNumber tidak ditemukan.");
          return;
        }
        const res = await fetch(`/api/master/${entity}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rowNumber, data: form }),
        });
        const data = (await res.json().catch(() => ({}))) as ApiResponse;
        if (!res.ok) {
          setActionError(data.error ?? "Gagal menyimpan perubahan.");
          return;
        }
      }
      await reload();
      setModalOpen(false);
    } catch {
      setActionError("Gagal memproses permintaan.");
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
        return;
      }
      await reload();
      setConfirmOpen(false);
    } catch {
      setActionError("Gagal menghapus data.");
    } finally {
      setActionBusy(false);
    }
  }


  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-base-content">{title}</h1>
          <p className="text-sm md:text-base text-base-content/60 font-medium max-w-2xl">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              className="btn btn-primary rounded-2xl shadow-lg shadow-primary/20"
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
            className="btn btn-primary btn-outline rounded-2xl"
          />
        </div>
      </div>

      {actionError && (
        <div role="alert" className="rounded-2xl border border-error/25 bg-error/10 px-4 py-3 text-sm text-error">
          <div className="font-semibold">{actionError}</div>
        </div>
      )}


      <div className="glass-card overflow-visible">
        <div className="p-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <label htmlFor="search" className="label pb-2">
                <span className="label-text text-xs font-black uppercase tracking-[0.22em] text-primary/80">
                  Pencarian
                </span>
              </label>
              <div className="relative">
                <Search
                  aria-hidden="true"
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-base-content/30"
                  size={18}
                />
                <input
                  id="search"
                  name="q"
                  autoComplete="off"
                  className="input input-bordered w-full h-12 rounded-2xl bg-base-200/40 border-base-content/10 pl-12 pr-4 focus:border-primary/30 focus:bg-base-100"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Cari (nama, DAOP, UPT, role)…"
                />
              </div>
            </div>
            <div className="md:col-span-1 flex items-end">
              <div className="w-full rounded-2xl bg-base-200/40 border border-base-content/10 px-4 py-3">
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-primary/70">Total</div>
                <div className="mt-1 text-2xl font-black tracking-tight tabular-nums text-primary">
                  {loading ? "…" : totalRows}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-primary/70">
                Baris / halaman
              </div>
              <select
                className="select select-bordered h-10 rounded-2xl bg-base-200/40 border-base-content/10 focus:border-primary/30 focus:bg-base-100"
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value) as 10 | 30 | 50 | 100)}
              >
                <option value={10}>10</option>
                <option value={30}>30</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div className="flex items-center justify-between md:justify-end gap-3">
              <div className="text-sm font-semibold text-base-content">
                Halaman <span className="tabular-nums">{safePageIndex + 1}</span> /{" "}
                <span className="tabular-nums">{totalPages}</span>
              </div>
              <div className="join">
                <button
                  className="btn btn-outline join-item rounded-l-2xl"
                  onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
                  disabled={loading || actionBusy || safePageIndex === 0}
                  aria-label="Sebelumnya"
                >
                  <ChevronLeft aria-hidden="true" className="h-5 w-5" />
                </button>
                <button
                  className="btn btn-outline join-item rounded-r-2xl"
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

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full">
            <thead>
              <tr className="bg-base-200/50 border-b border-base-content/5">
                {columns.map((c) => (
                  <th
                    key={c}
                    className="py-5 text-xs font-black uppercase tracking-[0.22em] text-primary/80"
                  >
                    {humanizeKey(c)}
                  </th>
                ))}
                {isAdmin && (
                  <th className="py-5 text-xs font-black uppercase tracking-[0.22em] text-primary/80">
                    Aksi
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={Math.max(1, columns.length + (isAdmin ? 1 : 0))} className="py-20 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Loader2 aria-hidden="true" className="animate-spin text-primary" size={32} />
                      <span className="text-sm font-medium text-base-content/60">Memuat data…</span>
                    </div>
                  </td>
                </tr>
              ) : pagedRows.length ? (
                pagedRows.map((r, idx) => (
                  <tr
                    key={String(r["id"] || r["id_klinik"] || r["upt"] || r["nipp"] || idx)}
                    className="hover:bg-primary/5 transition-colors"
                  >
                    {columns.map((c) => (
                      <td key={c} className="py-4 text-sm font-medium text-base-content">
                        <div className="min-w-0 break-words">{String(r[c] ?? "").trim() || "-"}</div>
                      </td>
                    ))}
                    {isAdmin && (
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <button
                            className="btn btn-ghost btn-sm btn-circle"
                            aria-label="Edit"
                            onClick={() => openEdit(r)}
                            disabled={actionBusy}
                          >
                            <Pencil aria-hidden="true" className="h-4 w-4" />
                          </button>
                          <button
                            className="btn btn-ghost btn-sm btn-circle text-error"
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
                  <td colSpan={Math.max(1, columns.length + (isAdmin ? 1 : 0))} className="py-20 text-center">
                    <div className="text-base-content/60">
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
        <div className="modal modal-open">
          <div className="modal-box w-11/12 max-w-3xl rounded-3xl">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-lg font-black tracking-tight text-base-content">
                  {mode === "create" ? "Tambah Data" : "Edit Data"}
                </div>
                <div className="mt-1 text-sm font-medium text-base-content/60">
                  {title}
                </div>
              </div>
              <button
                className="btn btn-ghost btn-circle"
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
                const isKlinikField = entity === "upt" && k === "klinik";
                const colSpan = k === "keterangan" || k === "catatan" ? "col-span-12" : "col-span-12 md:col-span-6";

                if (isRole) {
                  return (
                    <div key={k} className={colSpan}>
                      <label className="label pb-2">
                        <span className="label-text text-xs font-black uppercase tracking-[0.22em] text-primary/80">
                          {humanizeKey(k)}
                        </span>
                      </label>
                      <select
                        className="select select-bordered w-full rounded-2xl bg-base-200/40 border-base-content/10 focus:border-primary/30 focus:bg-base-100"
                        value={form[k] ?? ""}
                        onChange={(e) => setForm((p) => ({ ...p, [k]: e.target.value }))}
                      >
                        <option value="" disabled>
                          Pilih Role
                        </option>
                        {["ADMIN", "MANAGER", "ASMEN", "KEPALA_KLINIK"].map((x) => (
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
                      <label className="label pb-2">
                        <span className="label-text text-xs font-black uppercase tracking-[0.22em] text-primary/80">
                          {humanizeKey(k)}
                        </span>
                      </label>
                      <select
                        className="select select-bordered w-full rounded-2xl bg-base-200/40 border-base-content/10 focus:border-primary/30 focus:bg-base-100"
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
                    <label className="label pb-2">
                      <span className="label-text text-xs font-black uppercase tracking-[0.22em] text-primary/80">
                        {humanizeKey(k)}
                      </span>
                    </label>
                    <input
                      className="input input-bordered w-full h-12 rounded-2xl bg-base-200/40 border-base-content/10 focus:border-primary/30 focus:bg-base-100"
                      type={isPassword ? "password" : "text"}
                      value={form[k] ?? ""}
                      onChange={(e) => setForm((p) => ({ ...p, [k]: e.target.value }))}
                      readOnly={isDaop || isAutoId}
                      disabled={isDaop || isAutoId}
                      placeholder={
                        isDaop ? "DAOP 2 BANDUNG" : isAutoId ? "Auto (USR-0001, USR-0002, ...)" : undefined
                      }
                    />
                  </div>
                );
              })}
            </div>

            <div className="modal-action">
              <button className="btn btn-ghost rounded-2xl" onClick={() => setModalOpen(false)} disabled={actionBusy}>
                Batal
              </button>
              <button className="btn btn-primary rounded-2xl shadow-lg shadow-primary/20" onClick={submit} disabled={actionBusy}>
                {actionBusy ? <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" /> : "Simpan"}
              </button>
            </div>
          </div>
          <button
            type="button"
            aria-label="Tutup modal"
            className="modal-backdrop"
            onClick={() => (actionBusy ? null : setModalOpen(false))}
          />
        </div>
      )}

      {confirmOpen && (
        <div className="modal modal-open">
          <div className="modal-box max-w-lg rounded-3xl">
            <div className="text-lg font-black tracking-tight text-base-content">Hapus Data</div>
            <div className="mt-2 text-sm font-medium text-base-content/60">
              Data akan dihapus permanen dari Google Sheet.
            </div>
            <div className="mt-5 rounded-2xl border border-base-content/10 bg-base-200/20 px-4 py-3 text-sm text-base-content/70">
              RowNumber: <span className="font-bold tabular-nums">{String(getRowNumber(deletingRow ?? {}) ?? "-")}</span>
            </div>
            <div className="modal-action">
              <button className="btn btn-ghost rounded-2xl" onClick={() => setConfirmOpen(false)} disabled={actionBusy}>
                Batal
              </button>
              <button className="btn btn-error rounded-2xl" onClick={confirmDelete} disabled={actionBusy}>
                {actionBusy ? <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" /> : "Hapus"}
              </button>
            </div>
          </div>
          <button
            type="button"
            aria-label="Tutup dialog"
            className="modal-backdrop"
            onClick={() => (actionBusy ? null : setConfirmOpen(false))}
          />
        </div>
      )}
    </div>
  );
}
