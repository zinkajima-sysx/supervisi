import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

import { getServiceAccountCredentials, requireEnvClean } from "@/lib/env";

type CachedDoc = { expiresAt: number; doc: GoogleSpreadsheet };

export function createJwt(scopes: string[]) {
  const creds = getServiceAccountCredentials();
  return new JWT({
    email: creds.email,
    key: creds.key,
    scopes,
  });
}

export async function getSpreadsheet() {
  const cacheKey = "__SUPERVISI_SHEETS_DOC_CACHE__";
  const globalAny = globalThis as unknown as Record<string, unknown>;
  const cached = globalAny[cacheKey] as CachedDoc | undefined;
  const now = Date.now();
  if (cached && cached.expiresAt > now) return cached.doc;

  const jwt = createJwt(["https://www.googleapis.com/auth/spreadsheets"]);
  const doc = new GoogleSpreadsheet(requireEnvClean("GOOGLE_SHEETS_ID"), jwt);
  await doc.loadInfo();

  globalAny[cacheKey] = { expiresAt: now + 60_000, doc } satisfies CachedDoc;
  return doc;
}

