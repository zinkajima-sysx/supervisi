import { v2 as cloudinary } from "cloudinary";

let configured = false;

function ensureConfigured() {
  if (configured) return;

  // Prioritas 1: CLOUDINARY_URL — format: cloudinary://API_KEY:API_SECRET@CLOUD_NAME
  const cloudinaryUrl = process.env.CLOUDINARY_URL;
  if (cloudinaryUrl) {
    cloudinary.config({ cloudinary_url: cloudinaryUrl });
    // Terapkan secure delivery jika diaktifkan
    if (process.env.CLOUDINARY_SECURE_DELIVERY === "true") {
      cloudinary.config({ secure: true });
    }
    configured = true;
    return;
  }

  // Prioritas 2: individual env vars
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Cloudinary tidak terkonfigurasi. Set CLOUDINARY_URL atau " +
        "CLOUDINARY_CLOUD_NAME + CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET di .env"
    );
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: process.env.CLOUDINARY_SECURE_DELIVERY === "true",
  });
  configured = true;
}

/**
 * Ambil folder upload dari env.
 * Base folder: CLOUDINARY_FOLDER (default: "supervisi/image")
 * Subfolder opsional: misal "apd" → "supervisi/image/apd"
 */
export function getUploadFolder(subfolder?: string): string {
  const base = (process.env.CLOUDINARY_FOLDER ?? "supervisi/image").replace(/\/$/, "");
  return subfolder ? `${base}/${subfolder}` : base;
}

export async function uploadToCloudinary(params: {
  fileName: string;
  mimeType: string;
  buffer: Buffer;
  folder?: string;
}): Promise<{ publicId: string; secureUrl: string }> {
  ensureConfigured();

  const folder = params.folder ?? getUploadFolder();
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;

  const result = await new Promise<{ public_id: string; secure_url: string }>(
    (resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: "image",
          // public_id tanpa ekstensi
          public_id: params.fileName.replace(/\.[^/.]+$/, ""),
          overwrite: false,
          // Upload preset dari env (opsional — hanya dipakai jika di-set)
          ...(uploadPreset ? { upload_preset: uploadPreset } : {}),
          // Kompresi & format otomatis
          quality: "auto",
          fetch_format: "auto",
        },
        (error, result) => {
          if (error || !result) {
            reject(error ?? new Error("Cloudinary upload tidak mengembalikan hasil"));
          } else {
            resolve(result as { public_id: string; secure_url: string });
          }
        }
      );
      uploadStream.end(params.buffer);
    }
  );

  return {
    publicId: result.public_id,
    secureUrl: result.secure_url,
  };
}
