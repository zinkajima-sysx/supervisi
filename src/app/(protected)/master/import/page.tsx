"use client";

import { useMemo, useState } from "react";
import { FileSpreadsheet, Loader2, Save } from "lucide-react";

import { useToast } from "@/components/ToastProvider";

type ImportResponse = {
  committed: boolean;
  sheet: string;
  headers: string[];
  totalRows: number;
  preview: Record<string, string>[];
  error?: string;
};

function PreviewTable({ rows }: { rows: Record<string, string>[] }) {
  const columns = useMemo(() => {
    const first = rows[0];
    if (!first) return [];
    return Object.keys(first).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  if (!rows.length) return null;

  return (
    <div className="mt-5 rounded-2xl border border-border bg-surface overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {columns.map((c) => (
                <th key={c} className="py-4 px-4 text-left text-[10px] font-black uppercase tracking-[0.22em] text-foreground/60">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={idx} className="border-b border-border last:border-b-0">
                {columns.map((c) => (
                  <td key={c} className="py-3 px-4 text-xs text-foreground/80">
                    <div className="min-w-0 break-words">{r[c] || "-"}</div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ImportCard({
  title,
  subtitle,
  endpoint,
  defaultSheet,
}: {
  title: string;
  subtitle: string;
  endpoint: string;
  defaultSheet: string;
}) {
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [sheet, setSheet] = useState(defaultSheet);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResponse | null>(null);
  const idBase = useMemo(() => title.toLowerCase().replace(/[^a-z0-9]+/g, "-"), [title]);

  async function runImport(commit: boolean) {
    if (!file) return;
    setError(null);
    setBusy(true);

    const fd = new FormData();
    fd.append("file", file);

    const res = await fetch(`${endpoint}?sheet=${encodeURIComponent(sheet)}&commit=${commit ? "1" : "0"}`, {
      method: "POST",
      body: fd,
    });

    const data = (await res.json()) as ImportResponse;
    if (!res.ok) {
      setError(data.error || "Gagal memproses CSV.");
      toast.error(data.error || "Gagal memproses CSV.", "Import gagal");
      setResult(null);
      setBusy(false);
      return;
    }

    setResult(data);
    if (data.committed) toast.success(`Berhasil simpan ke sheet: ${data.sheet}`, "Import sukses");
    else toast.info(`Preview siap (${data.totalRows} baris)`, "Preview");
    setBusy(false);
  }

  return (
    <div className="rounded-3xl border border-border bg-surface shadow-xl p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-lg font-black tracking-tight text-foreground">{title}</div>
          <div className="mt-1 text-sm font-medium text-foreground/70">{subtitle}</div>
        </div>
        <div className="h-12 w-12 rounded-3xl bg-base-200 border border-border text-foreground flex items-center justify-center">
          <FileSpreadsheet aria-hidden="true" className="h-6 w-6" />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-5">
          <label
            htmlFor={`${idBase}-file`}
            className="block pb-2 text-xs font-black uppercase tracking-[0.22em] text-foreground/60"
          >
            File CSV
          </label>
          <input
            id={`${idBase}-file`}
            name="file"
            type="file"
            accept=".csv,text/csv"
            className="block w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <div className="mt-2 text-xs text-foreground/60">
            Upload CSV hasil export Excel (header bertingkat/merge).
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4">
          <label
            htmlFor={`${idBase}-sheet`}
            className="block pb-2 text-xs font-black uppercase tracking-[0.22em] text-foreground/60"
          >
            Nama Sheet
          </label>
          <input
            id={`${idBase}-sheet`}
            name="sheet"
            autoComplete="off"
            className="input w-full h-12 rounded-2xl px-4"
            value={sheet}
            onChange={(e) => setSheet(e.target.value)}
            placeholder="Contoh: Import_APD"
          />
        </div>

        <div className="col-span-12 lg:col-span-3 flex items-end gap-2">
          <button
            className="button button--outline flex-1"
            disabled={!file || busy}
            onClick={() => runImport(false)}
          >
            {busy ? <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" /> : "Preview"}
          </button>
          <button
            className="button button--primary flex-1"
            disabled={!file || busy}
            onClick={() => runImport(true)}
          >
            {busy ? (
              <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />
            ) : (
              <Save aria-hidden="true" className="h-5 w-5" />
            )}
            Simpan
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="mt-5 rounded-2xl border border-error bg-error text-error-content px-4 py-3 text-sm">
          <div className="font-semibold">{error}</div>
        </div>
      )}

      {result && (
        <div className="mt-5">
          <div className="flex flex-wrap items-center gap-3">
            <div
              className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${
                result.committed ? "bg-success text-success-content border-success" : "bg-base-200 text-base-content border-border"
              }`}
            >
              {result.committed ? "Tersimpan" : "Preview"}
            </div>
            <div className="inline-flex items-center rounded-full border border-border px-3 py-1 text-xs font-bold">
              {result.sheet}
            </div>
            <div className="inline-flex items-center rounded-full border border-border px-3 py-1 text-xs font-bold tabular-nums">
              {result.totalRows} baris
            </div>
          </div>
          <PreviewTable rows={result.preview.slice(0, 10)} />
        </div>
      )}
    </div>
  );
}

export default function MasterImportPage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-foreground">Import CSV</h1>
        <p className="text-sm md:text-base text-foreground/70 font-medium max-w-3xl">
          Sistem akan melakukan parsing multi-index sesuai aturan pada file kebutuhan (APD 3 header, P3K 2 header),
          lalu menghasilkan data datar (flat) untuk disimpan ke Google Sheet.
        </p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <ImportCard
            title="Import APD"
            subtitle="APD: 3 baris header bertingkat (kategori → sub-kategori → item) dengan forward-fill, merge key, dan sanitasi."
            endpoint="/api/import/apd"
            defaultSheet="Import_APD"
          />
        </div>
        <div className="col-span-12">
          <ImportCard
            title="Import P3K"
            subtitle="P3K: 2 baris header bertingkat (header utama → sub-header item) dengan forward-fill dan merge key."
            endpoint="/api/import/p3k"
            defaultSheet="Import_P3K"
          />
        </div>
      </div>
    </div>
  );
}
