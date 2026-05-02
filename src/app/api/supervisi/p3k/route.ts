import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

import { authOptions } from "@/auth";
import { findUserByUsername } from "@/lib/users";
import { appendRow } from "@/lib/sheets";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const form = await request.formData();

    // Ambil semua field kecuali file binary (foto sudah diupload dari client)
    const payload: Record<string, unknown> = {};
    for (const [key, value] of form.entries()) {
      payload[key] = typeof value === "string" ? value : String(value);
    }

    // foto_url sudah berisi URL Cloudinary yang dikirim dari client
    const foto_url = String(payload.foto_url ?? "");
    delete payload.foto_url;

    const username = session.user.username ?? session.user.email ?? "";
    let submitterNama = session.user.name ?? "";
    if (username && !payload.id) {
      const userRow = await findUserByUsername(username);
      if (userRow?.id) payload.id = userRow.id;
      if (userRow?.nama_lengkap) submitterNama = userRow.nama_lengkap;
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
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    const status = /quota|rate limit|429|too many requests/i.test(msg) ? 429 : 500;
    console.error("[P3K] submit failed:", msg);
    console.error("[P3K] full error:", err);
    return NextResponse.json({ error: msg }, { status });
  }
}
