"use client";

/**
 * Upload gambar langsung dari browser ke Cloudinary (unsigned upload).
 * Tidak melalui server — lebih cepat dan tidak memakan function timeout.
 *
 * Membutuhkan env:
 *   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
 *   NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET  (harus unsigned preset, contoh: "supervisi")
 *   NEXT_PUBLIC_CLOUDINARY_FOLDER         (base folder, default: "supervisi/image")
 */
export async function uploadImageToCloudinary(
  file: File,
  subfolder: "apd" | "p3k"
): Promise<string> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (!cloudName) {
    throw new Error("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME tidak di-set");
  }

  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  if (!uploadPreset) {
    throw new Error("NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET tidak di-set");
  }

  const baseFolder = (process.env.NEXT_PUBLIC_CLOUDINARY_FOLDER ?? "supervisi/image")
    .replace(/\/$/, "");
  const folder = `${baseFolder}/${subfolder}`;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);
  formData.append("folder", folder);

  const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000); // 30 detik timeout

  try {
    const res = await fetch(url, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({})) as { error?: { message?: string } };
      throw new Error(errData?.error?.message ?? `Cloudinary upload gagal (HTTP ${res.status})`);
    }

    const data = await res.json() as { secure_url?: string };
    if (!data.secure_url) {
      throw new Error("Cloudinary tidak mengembalikan URL gambar");
    }

    return data.secure_url;
  } finally {
    clearTimeout(timeoutId);
  }
}
