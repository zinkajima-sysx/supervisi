import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/auth";
import { updateRow, deleteRow } from "@/lib/sheets";

export const runtime = "nodejs";

function toNumber(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ rowNumber: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { rowNumber: rowNumberStr } = await params;
  const rowNumber = toNumber(rowNumberStr);
  if (!rowNumber) return NextResponse.json({ error: "rowNumber tidak valid" }, { status: 400 });

  const body = (await request.json().catch(() => null)) as { data?: Record<string, string> } | null;
  const data = body?.data;
  if (!data) return NextResponse.json({ error: "Missing data" }, { status: 400 });

  try {
    await updateRow("Data_APD", rowNumber, data);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[APD] update failed:", msg, err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ rowNumber: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { rowNumber: rowNumberStr } = await params;
  const rowNumber = toNumber(rowNumberStr);
  if (!rowNumber) return NextResponse.json({ error: "rowNumber tidak valid" }, { status: 400 });

  try {
    await deleteRow("Data_APD", rowNumber);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[APD] delete failed:", msg, err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
