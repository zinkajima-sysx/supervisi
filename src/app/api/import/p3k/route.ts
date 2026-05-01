import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/auth";
import { getSpreadsheet } from "@/lib/google";
import { parseMultiIndexCsv } from "@/lib/multiIndexCsv";

export const runtime = "nodejs";

type SheetRowValue = string | number | boolean | Date;
type SheetRow = Record<string, SheetRowValue>;

async function ensureSheet(title: string, headers: string[]) {
  const doc = await getSpreadsheet();
  const existing = doc.sheetsByTitle[title];
  if (existing) return existing;
  return await doc.addSheet({ title, headerValues: headers });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const commit = url.searchParams.get("commit") === "1";
  const sheetTitle = url.searchParams.get("sheet") || "Import_P3K";
  const limit = Math.max(1, Math.min(200, Number(url.searchParams.get("limit") || 50)));

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  const text = await file.text();
  const parsed = parseMultiIndexCsv(text, { headerDepth: 2, joinWith: "_" });

  if (!parsed.headers.length) {
    return NextResponse.json({ error: "CSV tidak valid / header tidak ditemukan" }, { status: 400 });
  }

  const rows = parsed.rows.map((r) => ({
    ...r,
    imported_at: new Date().toISOString(),
    imported_by: user.username ?? user.name ?? "unknown",
    source_file: file.name,
  }));

  if (commit) {
    const sheet = await ensureSheet(sheetTitle, [...parsed.headers, "imported_at", "imported_by", "source_file"]);
    await sheet.addRows(rows as SheetRow[]);
    return NextResponse.json({
      committed: true,
      sheet: sheetTitle,
      headers: parsed.headers,
      totalRows: parsed.rows.length,
      preview: rows.slice(0, limit),
    });
  }

  return NextResponse.json({
    committed: false,
    sheet: sheetTitle,
    headers: parsed.headers,
    totalRows: parsed.rows.length,
    preview: rows.slice(0, limit),
  });
}
