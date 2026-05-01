function normalizeCell(value: string | undefined): string {
  return (value ?? "").replace(/\r?\n/g, " ").trim();
}

function toSnakeKey(input: string): string {
  const cleaned = normalizeCell(input)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
  return cleaned || "col";
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (inQuotes) {
      if (ch === '"') {
        const next = line[i + 1];
        if (next === '"') {
          current += '"';
          i++;
          continue;
        }
        inQuotes = false;
        continue;
      }
      current += ch;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }

    if (ch === ",") {
      out.push(current);
      current = "";
      continue;
    }

    current += ch;
  }

  out.push(current);
  return out;
}

export function parseCsv(text: string): string[][] {
  const normalized = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n").filter((l) => l.length > 0);
  return lines.map(parseCsvLine);
}

function forwardFillRow(row: string[]): string[] {
  const out = [...row];
  let last = "";
  for (let i = 0; i < out.length; i++) {
    const curr = normalizeCell(out[i]);
    if (curr) {
      last = curr;
      out[i] = curr;
      continue;
    }
    out[i] = last;
  }
  return out;
}

type ParseSpec = {
  headerDepth: 2 | 3;
  joinWith?: string;
  forwardFill?: boolean[];
};

export type MultiIndexParseResult = {
  headers: string[];
  rows: Array<Record<string, string>>;
};

export function parseMultiIndexCsv(text: string, spec: ParseSpec): MultiIndexParseResult {
  const rows = parseCsv(text);
  if (rows.length < spec.headerDepth + 1) {
    return { headers: [], rows: [] };
  }

  const joinWith = spec.joinWith ?? "_";
  const defaultForwardFill =
    spec.headerDepth === 2 ? [true, false] : [true, true, false];
  const forwardFill = (spec.forwardFill ?? defaultForwardFill).slice(
    0,
    spec.headerDepth
  );
  const headerRows = rows.slice(0, spec.headerDepth).map((r) => r.map(normalizeCell));
  const maxCols = Math.max(...headerRows.map((r) => r.length));
  const padded = headerRows.map((r) => (r.length < maxCols ? [...r, ...Array(maxCols - r.length).fill("")] : r));

  const h1 = forwardFill[0] ? forwardFillRow(padded[0]) : padded[0];
  const h2 =
    spec.headerDepth >= 2
      ? forwardFill[1]
        ? forwardFillRow(padded[1])
        : padded[1]
      : [];
  const h3 =
    spec.headerDepth === 3
      ? forwardFill[2]
        ? forwardFillRow(padded[2])
        : padded[2]
      : [];

  const keys: string[] = [];
  const used = new Map<string, number>();

  for (let i = 0; i < maxCols; i++) {
    const partsRaw: string[] = [];

    const a = h1[i] ?? "";
    const b = spec.headerDepth >= 2 ? (h2[i] ?? "") : "";
    const c = spec.headerDepth === 3 ? (h3[i] ?? "") : "";

    if (a) partsRaw.push(a);
    if (b && b !== a) partsRaw.push(b);
    if (c && c !== b && c !== a) partsRaw.push(c);

    const base = partsRaw.length ? partsRaw.map(toSnakeKey).join(joinWith) : `col_${i + 1}`;
    const prevCount = used.get(base) ?? 0;
    used.set(base, prevCount + 1);
    keys.push(prevCount === 0 ? base : `${base}${joinWith}${prevCount + 1}`);
  }

  const dataRows = rows.slice(spec.headerDepth);
  const outRows = dataRows.map((r) => {
    const rowPadded = r.length < maxCols ? [...r, ...Array(maxCols - r.length).fill("")] : r;
    const obj: Record<string, string> = {};
    for (let i = 0; i < maxCols; i++) {
      obj[keys[i]] = normalizeCell(rowPadded[i]);
    }
    return obj;
  });

  return { headers: keys, rows: outRows };
}
