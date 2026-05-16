import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";

export interface PefaRow {
  country: string;
  year: number | null;
  title: string;
  status: string;        // "Final", "Draft", ...
  availability: string;  // "Public", "Non-public"
  nodeId: string;        // pefa.org node id
  pageUrl: string;       // https://www.pefa.org/node/<id>
  suggestedFilename: string;
}

export const CSV_PATH = path.resolve(
  __dirname,
  "../../data/latest_national_pefas.csv"
);

export function loadPefaCsv(csvPath: string = CSV_PATH): PefaRow[] {
  const raw = fs.readFileSync(csvPath, "utf-8");
  const records: Record<string, string>[] = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
  return records.map((r) => {
    const yearStr = r["Year"]?.trim();
    const year = yearStr && /^\d{4}$/.test(yearStr) ? parseInt(yearStr, 10) : null;
    return {
      country: r["Country"] ?? "",
      year,
      title: r["Title"] ?? "",
      status: r["Status"] ?? "",
      availability: r["Availability"] ?? "",
      nodeId: r["Node ID"] ?? "",
      pageUrl: r["Assessment Page URL"] ?? "",
      suggestedFilename: r["Suggested Filename"] ?? "",
    };
  });
}

export function isPublic(row: PefaRow): boolean {
  return row.availability.toLowerCase() === "public";
}
