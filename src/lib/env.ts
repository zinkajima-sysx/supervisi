export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing env var: ${name}`);
  }
  return value;
}

function stripWrappingQuotes(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length >= 2) {
    const first = trimmed[0];
    const last = trimmed[trimmed.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return trimmed.slice(1, -1);
    }
  }
  return trimmed;
}

export function requireEnvClean(name: string): string {
  return stripWrappingQuotes(requireEnv(name));
}

function getFirstEnvValue(names: string[]): string | undefined {
  for (const name of names) {
    const raw = process.env[name];
    const cleaned = raw ? stripWrappingQuotes(raw) : "";
    if (cleaned) return cleaned;
  }
  return undefined;
}

export function requireFirstEnvClean(names: string[]): string {
  const value = getFirstEnvValue(names);
  if (!value) {
    throw new Error(`Missing env var: ${names.join(" | ")}`);
  }
  return value;
}

export function getPrivateKeyFromEnv(): string {
  const raw = requireFirstEnvClean([
    "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY",
    "GOOGLE_PRIVATE_KEY",
    "GOOGLE_CLIENT_PRIVATE_KEY",
  ]);
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
    projectId: getFirstEnvValue(["GOOGLE_PROJECT_ID"]) ?? undefined,
    email: requireFirstEnvClean(["GOOGLE_SERVICE_ACCOUNT_EMAIL", "GOOGLE_CLIENT_EMAIL"]),
    key: getPrivateKeyFromEnv(),
  };
}
