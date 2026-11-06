/**
 * Minimal CSV writer — RFC 4180 quoting, UTF-8, BOM prepended so Excel
 * on Windows opens it in the correct encoding. Kept dependency-free;
 * the volumes we ship fit comfortably in memory.
 */

export function toCsv(rows: Array<Record<string, string | number | null | undefined>>, headers?: string[]): string {
  const cols = headers ?? (rows[0] ? Object.keys(rows[0]) : []);
  const escape = (v: string | number | null | undefined) => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "number" ? String(v) : v;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = cols.map(escape).join(",");
  const body = rows.map((r) => cols.map((c) => escape(r[c])).join(",")).join("\n");
  return `﻿${head}\n${body}\n`;
}

export function csvResponse(csv: string, filename: string): Response {
  return new Response(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename.replace(/"/g, "")}"`,
      "cache-control": "no-store"
    }
  });
}

/** YYYY-MM-DD stamp useful in export filenames. */
export function todayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}
