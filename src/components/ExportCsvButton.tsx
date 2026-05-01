"use client";

import { Download } from "lucide-react";

function toCsv(rows: Record<string, any>[]) {
  const headers = Array.from(
    new Set(rows.flatMap((r) => Object.keys(r).filter((k) => k !== "_rowNumber")))
  );

  const escape = (v: any) => {
    const s = v == null ? "" : String(v);
    const needsQuotes = /[",\n]/.test(s);
    const safe = s.replace(/"/g, '""');
    return needsQuotes ? `"${safe}"` : safe;
  };

  const lines = [
    headers.map(escape).join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ];
  return lines.join("\n");
}

export default function ExportCsvButton({
  rows,
  fileName,
  className = "btn btn-outline btn-sm",
}: {
  rows: Record<string, any>[];
  fileName: string;
  className?: string;
}) {
  return (
    <button
      className={className}
      type="button"
      onClick={() => {
        const csv = toCsv(rows);
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


