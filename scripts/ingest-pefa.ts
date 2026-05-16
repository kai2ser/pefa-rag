/**
 * PEFA ingestion: parse each downloaded PDF in _dataPEFA/, chunk +
 * embed with OpenAI text-embedding-3-large, and upsert into the
 * Supabase documents table + pefa_chunks vector table.
 *
 * Uses the CSV as the source of truth for which files to ingest
 * (Public assessments only) and for canonical metadata (country, year,
 * title, node id). Files in _dataPEFA/ that aren't in the CSV are
 * skipped with a warning.
 *
 * Resume support: --resume reads a checkpoint of completed files.
 * Re-running without --resume re-ingests (existing chunks are cleared
 * before re-insertion).
 *
 * Usage:
 *   npm run ingest:pefa
 *   npm run ingest:pefa -- --resume
 *   npm run ingest:pefa -- --verbose
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import { parsePdf } from "./lib/pdf-parser";
import { chunkText } from "./lib/chunker";
import { embedTexts } from "./lib/embeddings";
import {
  upsertDocument,
  insertChunks,
  updateCollectionStats,
  getClient,
} from "./lib/supabase-loader";
import { loadPefaCsv, isPublic, type PefaRow } from "./lib/pefa-csv";

const DATA_DIR = path.resolve(__dirname, "../_dataPEFA");
const COLLECTION_ID = "pefa";
const TABLE_NAME = "pefa_chunks";
const CHECKPOINT_FILE = path.join(__dirname, "pefa-checkpoint.json");

const RESUME = process.argv.includes("--resume");
const VERBOSE = process.argv.includes("--verbose");

interface Checkpoint {
  processedFiles: string[];
  lastFile: string;
  lastTimestamp: string;
}

function loadCheckpoint(): Set<string> {
  if (!RESUME || !fs.existsSync(CHECKPOINT_FILE)) return new Set();
  const data: Checkpoint = JSON.parse(
    fs.readFileSync(CHECKPOINT_FILE, "utf-8")
  );
  console.log(
    `Resuming from checkpoint (${data.processedFiles.length} files already processed)`
  );
  return new Set(data.processedFiles);
}

function saveCheckpoint(processedFiles: string[], lastFile: string) {
  const data: Checkpoint = {
    processedFiles,
    lastFile,
    lastTimestamp: new Date().toISOString(),
  };
  fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(data, null, 2));
}

async function main() {
  console.log("=== PEFA Ingestion ===");
  console.log(`Data directory: ${DATA_DIR}`);

  if (!fs.existsSync(DATA_DIR)) {
    console.error(`Data dir does not exist. Run \`npm run download:pdfs\` first.`);
    process.exit(1);
  }

  const csvRows = loadPefaCsv();
  const publicByFilename = new Map<string, PefaRow>();
  for (const row of csvRows) {
    if (isPublic(row)) publicByFilename.set(row.suggestedFilename, row);
  }
  console.log(`CSV: ${publicByFilename.size} public reports catalogued`);

  const onDisk = fs
    .readdirSync(DATA_DIR)
    .filter((f) => f.toLowerCase().endsWith(".pdf"));
  console.log(`Files on disk: ${onDisk.length}\n`);

  const processed = loadCheckpoint();
  const processedList = [...processed];

  let totalChunks = 0;
  let totalTokens = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < onDisk.length; i++) {
    const filename = onDisk[i];
    const filePath = path.join(DATA_DIR, filename);
    // We use the same filepath shape as seed-overview-db.ts so the
    // (collection_id, filepath) upsert key matches.
    const dbFilepath = path.posix.join("_dataPEFA", filename);

    if (processed.has(filePath)) {
      skipped++;
      continue;
    }

    const row = publicByFilename.get(filename);
    if (!row) {
      console.warn(`[${i + 1}/${onDisk.length}] ${filename}: not in CSV, skipping`);
      continue;
    }

    const stats = fs.statSync(filePath);
    const title = row.title || filename.replace(/\.pdf$/i, "");

    console.log(
      `[${i + 1}/${onDisk.length}] ${filename} (${(stats.size / 1024 / 1024).toFixed(1)}MB)`
    );
    if (VERBOSE) {
      console.log(`  Country: ${row.country}  Year: ${row.year}`);
    }

    try {
      const parsed = await parsePdf(filePath);
      const text = parsed.text;
      if (!text.trim()) {
        console.warn(`  Skipping: no text extracted`);
        continue;
      }

      const chunks = chunkText(text, parsed.pageOffsets);
      if (VERBOSE) {
        console.log(
          `  Pages: ${parsed.pageCount}, Chunks: ${chunks.length}`
        );
      }

      const chunkTokens = chunks.reduce((sum, c) => sum + c.tokenCount, 0);
      totalChunks += chunks.length;
      totalTokens += chunkTokens;

      const embeddings = await embedTexts(chunks.map((c) => c.content));

      const docId = await upsertDocument({
        collection_id: COLLECTION_ID,
        filename,
        filepath: dbFilepath,
        title,
        year: row.year,
        organization: "PEFA Secretariat",
        country: row.country,
        file_type: "pdf",
        file_size_bytes: stats.size,
        page_count: parsed.pageCount,
        chunk_count: chunks.length,
        metadata: {
          status: row.status,
          availability: row.availability,
          is_public: true,
          node_id: row.nodeId,
          page_url: row.pageUrl,
        },
      });

      const supabase = getClient();
      await supabase.from(TABLE_NAME).delete().eq("document_id", docId);
      await insertChunks(TABLE_NAME, docId, chunks, embeddings);

      processedList.push(filePath);
      saveCheckpoint(processedList, filePath);

      if (VERBOSE) {
        console.log(`  Stored ${chunks.length} chunks\n`);
      }
    } catch (err) {
      errors++;
      console.error(`  ERROR: ${err instanceof Error ? err.message : err}`);
    }
  }

  await updateCollectionStats(COLLECTION_ID);

  console.log("\n=== Complete ===");
  console.log(`Total files on disk:        ${onDisk.length}`);
  console.log(`Processed this run:         ${processedList.length - skipped}`);
  console.log(`Skipped (already done):     ${skipped}`);
  console.log(`Errors:                     ${errors}`);
  console.log(`Total chunks:               ${totalChunks}`);
  console.log(`Total tokens:               ${totalTokens.toLocaleString()}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
