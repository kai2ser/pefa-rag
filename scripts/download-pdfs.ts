/**
 * Downloads the full PDF for every Public PEFA report in
 * data/latest_national_pefas.csv into _dataPEFA/.
 *
 * Each row's `Assessment Page URL` (https://www.pefa.org/node/<id>) is
 * an HTML page; we scrape the first .pdf link from the rendered page
 * and stream it to disk under the row's Suggested Filename.
 *
 * Non-public reports are skipped. Already-downloaded files are skipped
 * (resume-by-existence).
 *
 * Usage:
 *   npm run download:pdfs              # download all public
 *   npm run download:pdfs -- --limit 5 # first 5 only (smoke-test)
 */
import fs from "fs";
import path from "path";
import { loadPefaCsv, isPublic, type PefaRow } from "./lib/pefa-csv";

const DATA_DIR = path.resolve(__dirname, "../_dataPEFA");
const CONCURRENCY = 4;
const USER_AGENT =
  "PEFA-Reports-AI/0.1 (research project; respectful crawler)";

function parseLimit(): number | null {
  const idx = process.argv.indexOf("--limit");
  if (idx === -1) return null;
  const n = parseInt(process.argv[idx + 1] ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

async function findPdfUrl(pageUrl: string): Promise<string | null> {
  const res = await fetch(pageUrl, {
    headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
    redirect: "follow",
  });
  if (!res.ok) {
    throw new Error(`page fetch ${res.status} ${res.statusText}`);
  }
  const html = await res.text();

  // Capture href="...pdf" or href='...pdf' (case-insensitive)
  const matches = [...html.matchAll(/href=["']([^"']+\.pdf)["']/gi)].map(
    (m) => m[1]
  );
  if (matches.length === 0) return null;

  // Prefer an absolute URL on pefa.org; otherwise the first hit, made absolute.
  const onSite = matches.find((u) => /pefa\.org/i.test(u));
  const chosen = onSite ?? matches[0];

  try {
    return new URL(chosen, pageUrl).toString();
  } catch {
    return null;
  }
}

async function downloadPdf(url: string, destPath: string): Promise<number> {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    redirect: "follow",
  });
  if (!res.ok) {
    throw new Error(`pdf fetch ${res.status} ${res.statusText}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(destPath, buf);
  return buf.length;
}

async function processRow(
  row: PefaRow,
  idx: number,
  total: number
): Promise<{ ok: boolean; skipped: boolean; bytes: number; err?: string }> {
  const dest = path.join(DATA_DIR, row.suggestedFilename);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0) {
    console.log(`[${idx}/${total}] SKIP  (exists) ${row.suggestedFilename}`);
    return { ok: true, skipped: true, bytes: fs.statSync(dest).size };
  }

  try {
    const pdfUrl = await findPdfUrl(row.pageUrl);
    if (!pdfUrl) {
      console.warn(
        `[${idx}/${total}] MISS  (no pdf link) ${row.pageUrl}`
      );
      return { ok: false, skipped: false, bytes: 0, err: "no pdf link" };
    }
    const bytes = await downloadPdf(pdfUrl, dest);
    console.log(
      `[${idx}/${total}] OK    ${(bytes / 1024 / 1024).toFixed(1)}MB  ${row.suggestedFilename}`
    );
    return { ok: true, skipped: false, bytes };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(
      `[${idx}/${total}] FAIL  ${row.suggestedFilename}: ${msg}`
    );
    return { ok: false, skipped: false, bytes: 0, err: msg };
  }
}

async function runWithConcurrency<T, R>(
  items: T[],
  worker: (item: T, idx: number) => Promise<R>,
  concurrency: number
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (true) {
        const i = next++;
        if (i >= items.length) return;
        results[i] = await worker(items[i], i);
      }
    })
  );
  return results;
}

async function main() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  const rows = loadPefaCsv();
  const publicRows = rows.filter(isPublic);
  console.log(
    `Public reports: ${publicRows.length} / ${rows.length} total`
  );

  const limit = parseLimit();
  const queue = limit ? publicRows.slice(0, limit) : publicRows;
  console.log(`Downloading ${queue.length} reports (concurrency=${CONCURRENCY})\n`);

  const results = await runWithConcurrency(
    queue,
    (row, i) => processRow(row, i + 1, queue.length),
    CONCURRENCY
  );

  const ok = results.filter((r) => r.ok && !r.skipped).length;
  const skipped = results.filter((r) => r.skipped).length;
  const failed = results.filter((r) => !r.ok).length;
  const bytes = results.reduce((s, r) => s + r.bytes, 0);

  console.log("\n=== Download summary ===");
  console.log(`Downloaded: ${ok}`);
  console.log(`Skipped (already on disk): ${skipped}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total bytes: ${(bytes / 1024 / 1024).toFixed(1)} MB`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
