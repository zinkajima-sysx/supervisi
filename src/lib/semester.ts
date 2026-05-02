/**
 * Utilitas semester supervisi.
 * Semester 1: 1 Januari — 30 Juni
 * Semester 2: 1 Juli — 31 Desember
 */

export type Semester = 1 | 2;

export interface SemesterRange {
  year: number;
  semester: Semester;
  start: Date; // inclusive
  end: Date;   // inclusive (end of day)
}

/** Kembalikan semester aktif berdasarkan tanggal sekarang */
export function getCurrentSemester(): SemesterRange {
  const now = new Date();
  return getSemesterRange(now.getFullYear(), now.getMonth() < 6 ? 1 : 2);
}

/** Kembalikan range tanggal untuk semester tertentu */
export function getSemesterRange(year: number, semester: Semester): SemesterRange {
  if (semester === 1) {
    return {
      year,
      semester,
      start: new Date(year, 0, 1, 0, 0, 0, 0),       // 1 Jan
      end:   new Date(year, 5, 30, 23, 59, 59, 999),  // 30 Jun
    };
  }
  return {
    year,
    semester,
    start: new Date(year, 6, 1, 0, 0, 0, 0),          // 1 Jul
    end:   new Date(year, 11, 31, 23, 59, 59, 999),    // 31 Des
  };
}

/** Label semester untuk ditampilkan */
export function semesterLabel(range: SemesterRange): string {
  return `Semester ${range.semester} — ${range.year}`;
}

/** Cek apakah tanggal (string ISO atau Date) masuk dalam range semester */
export function isInSemester(dateValue: unknown, range: SemesterRange): boolean {
  if (!dateValue) return false;
  const d = dateValue instanceof Date ? dateValue : new Date(String(dateValue));
  if (isNaN(d.getTime())) return false;
  return d >= range.start && d <= range.end;
}

/**
 * Dari daftar rows supervisi, kembalikan Set nama UPT yang sudah
 * disupervisi dalam semester yang diberikan.
 */
export function getSupervisiUptSet(
  rows: Record<string, any>[],
  range: SemesterRange
): Set<string> {
  const done = new Set<string>();
  for (const r of rows) {
    const tanggal = r.tanggal_supervisi ?? r.timestamp ?? "";
    if (!isInSemester(tanggal, range)) continue;
    const upt = String(r.upt ?? r.nama_upt ?? "").trim();
    if (upt) done.add(upt);
  }
  return done;
}
