export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing env var: ${name}`);
  }
  return value;
}

export function getPrivateKeyFromEnv(): string {
  const raw = requireEnv("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY");
  return raw.replace(/\\n/g, "\n");
}

type ServiceAccountJson = {
  project_id?: string;
  client_email?: string;
  private_key?: string;
};

export function getServiceAccountCredentials(): {
  projectId?: string;
  email: string;
  key: string;
} {
  const jsonPath = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_PATH;
  if (jsonPath) {
    const fs = require("fs") as typeof import("fs");
    const path = require("path") as typeof import("path");
    const absPath = path.isAbsolute(jsonPath)
      ? jsonPath
      : path.resolve(process.cwd(), jsonPath);
    const raw = fs.readFileSync(absPath, "utf8");
    const parsed = JSON.parse(raw) as ServiceAccountJson;
    if (!parsed.client_email || !parsed.private_key) {
      throw new Error(
        "Invalid GOOGLE_SERVICE_ACCOUNT_JSON_PATH (missing client_email/private_key)"
      );
    }
    return {
      projectId: parsed.project_id,
      email: parsed.client_email,
      key: parsed.private_key,
    };
  }

  return {
    projectId: process.env.GOOGLE_PROJECT_ID,
    email: requireEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL"),
    key: getPrivateKeyFromEnv(),
  };
}
