import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";
import { google } from "googleapis";

import { getServiceAccountCredentials, requireEnv } from "@/lib/env";

export function createJwt(scopes: string[]) {
  const creds = getServiceAccountCredentials();
  return new JWT({
    email: creds.email,
    key: creds.key,
    scopes,
  });
}

export async function getSpreadsheet() {
  const jwt = createJwt(["https://www.googleapis.com/auth/spreadsheets"]);
  const doc = new GoogleSpreadsheet(requireEnv("GOOGLE_SHEETS_ID"), jwt);
  await doc.loadInfo();
  return doc;
}

export function getDriveClient() {
  const creds = getServiceAccountCredentials();
  const auth = new google.auth.JWT({
    email: creds.email,
    key: creds.key,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });

  return google.drive({ version: "v3", auth });
}
