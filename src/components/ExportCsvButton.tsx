"use client";

import { Download } from "lucide-react";

export type CsvColumn = {
  key: string;
  label: string;
  value?: (row: Record<string, any>) => any;
};

function toCsv(rows: Record<string, any>[], columns?: CsvColumn[]) {
  const headers = columns?.length
    ? columns.map((c) => c.label)
    : Array.from(new Set(rows.flatMap((r) => Object.keys(r).filter((k) => k !== "_rowNumber"))));

  const escape = (v: any) => {
    const s = v == null ? "" : String(v);
    const needsQuotes = /[",\n]/.test(s);
    const safe = s.replace(/"/g, '""');
    return needsQuotes ? `"${safe}"` : safe;
  };

  const lines = [
    headers.map(escape).join(","),
    ...rows.map((r) => {
      if (columns?.length) {
        return columns
          .map((c) => escape(c.value ? c.value(r) : r[c.key]))
          .join(",");
      }
      return headers.map((h) => escape((r as any)[h])).join(",");
    }),
  ];
  return lines.join("\n");
}

export default function ExportCsvButton({
  rows,
  fileName,
  columns,
  className = "button button--outline button--sm",
}: {
  rows: Record<string, any>[];
  fileName: string;
  columns?: CsvColumn[];
  className?: string;
}) {
  return (
    <button
      className={className}
      type="button"
      onClick={() => {
        const csv = toCsv(rows, columns);
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      }}
      disabled={!rows.length}
    >
      <Download size={16} />
      <span>Export CSV</span>
    </button>
  );
}
