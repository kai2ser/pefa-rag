/**
 * Seeds the `documents` table on Supabase with one row per PEFA report
 * listed in data/latest_national_pefas.csv.
 *
 * This populates the "overview SQL database" of all PEFA reports — both
 * Public and Non-public assessments — *before* any PDFs have been
 * downloaded or embedded. Public availability is preserved in metadata.
 *
 * When `download:pdfs` and `ingest:pefa` are run later, they upsert
 * against the same `(collection_id, filepath)` unique key, so existing
 * overview rows are filled in with file_size_bytes, page_count, etc.
 *
 * Usage:
 *   npm run seed:overview
 */
import dotenv from "dotenv";
import path from "path";
// Mirror Next.js convention: .env.local overrides .env (and both are gitignored).
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });
dotenv.config({ path: path.resolve(__dirname, "../.env") });
import { loadPefaCsv, isPublic, type PefaRow } from "./lib/pefa-csv";
import { getClient } from "./lib/supabase-loader";

const COLLECTION_ID = "pefa";
const DATA_SUBDIR = "_dataPEFA";

function rowFilepath(row: PefaRow): string {
  // Stable filepath = local destination of the downloaded PDF
  // (uses suggested filename from PEFA Secretariat catalogue).
  return path.posix.join(DATA_SUBDIR, row.suggestedFilename);
}

async function main() {
  const rows = loadPefaCsv();
  console.log(`Loaded ${rows.length} rows from CSV`);

  const supabase = getClient();

  let upserted = 0;
  let publicCount = 0;
  let nonPublicCount = 0;

  for (const row of rows) {
    const filepath = rowFilepath(row);
    const pub = isPublic(row);
    if (pub) publicCount++;
    else nonPublicCount++;

    const { error } = await supabase
      .from("documents")
      .upsert(
        {
          collection_id: COLLECTION_ID,
          filename: row.suggestedFilename,
          filepath,
          title: row.title,
          year: row.year,
          organization: "PEFA Secretariat",
          country: row.country,
          file_type: "pdf",
          // file_size_bytes / page_count: filled in by ingest-pefa.ts later
          file_size_bytes: null,
          page_count: null,
          chunk_count: 0,
          metadata: {
            status: row.status,
            availability: row.availability,
            is_public: pub,
            node_id: row.nodeId,
            page_url: row.pageUrl,
          },
        },
        { onConflict: "collection_id,filepath", ignoreDuplicates: false }
      );

    if (error) {
      console.error(`  upsert failed for ${row.title}: ${error.message}`);
      continue;
    }
    upserted++;
  }

  // Refresh the collection's document_count
  const { count: docCount } = await supabase
    .from("documents")
    .select("*", { count: "exact", head: true })
    .eq("collection_id", COLLECTION_ID);

  await supabase
    .from("collections")
    .update({
      document_count: docCount ?? 0,
      last_ingested_at: new Date().toISOString(),
    })
    .eq("id", COLLECTION_ID);

  console.log("\n=== Overview seed complete ===");
  console.log(`Upserted:           ${upserted}`);
  console.log(`Public (ingestible): ${publicCount}`);
  console.log(`Non-public:         ${nonPublicCount}`);
  console.log(`Collection document_count now: ${docCount ?? 0}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
