import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

import { authOptions } from "@/auth";
import { uploadToDrive } from "@/lib/drive";
import { findUserByUsername } from "@/lib/users";
import { appendRow } from "@/lib/sheets";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");

  const payload: Record<string, unknown> = {};
  for (const [key, value] of form.entries()) {
    if (key === "file") continue;
    payload[key] = typeof value === "string" ? value : String(value);
  }

  const username = session.user.username ?? session.user.email ?? "";
  let submitterNama = session.user.name ?? "";
  if (username && !payload.id) {
    const userRow = await findUserByUsername(username);
    if (userRow?.id) payload.id = userRow.id;
    if (userRow?.nama_lengkap) submitterNama = userRow.nama_lengkap;
  }

  let foto_url = "";
  if (file instanceof File && file.size > 0) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploaded = await uploadToDrive({
      fileName: `${uuidv4()}-${file.name}`,
      mimeType: file.type || "application/octet-stream",
      buffer,
    });
    foto_url = uploaded.webViewLink;
  }

  await appendRow("Data_P3K", {
    laporan_id: uuidv4(),
    timestamp: new Date().toISOString(),
    submitter_username: username,
    submitter_nama: submitterNama,
    ...payload,
    foto_url,
  });

  return NextResponse.json({ ok: true });
}
