import { Readable } from "stream";

import { getDriveClient } from "@/lib/google";
import { requireEnvClean } from "@/lib/env";

export async function uploadToDrive(params: {
  fileName: string;
  mimeType: string;
  buffer: Buffer;
}): Promise<{ fileId: string; webViewLink: string }> {
  const drive = getDriveClient();
  const folderId = requireEnvClean("GOOGLE_DRIVE_FOLDER_ID");

  const createRes = await drive.files.create({
    requestBody: {
      name: params.fileName,
      parents: [folderId],
    },
    media: {
      mimeType: params.mimeType,
      body: Readable.from(params.buffer),
    },
    fields: "id, webViewLink",
  });

  const fileId = createRes.data.id;
  if (!fileId) {
    throw new Error("Drive upload failed (missing file id)");
  }

  await drive.permissions.create({
    fileId,
    requestBody: {
      role: "reader",
      type: "anyone",
    },
  });

  const getRes = await drive.files.get({
    fileId,
    fields: "webViewLink",
  });

  const webViewLink = getRes.data.webViewLink;
  if (!webViewLink) {
    throw new Error("Drive upload failed (missing webViewLink)");
  }

  return { fileId, webViewLink };
}
