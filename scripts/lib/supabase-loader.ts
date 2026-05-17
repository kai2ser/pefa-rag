import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Chunk } from "./chunker";

let client: SupabaseClient | null = null;

export function getClient(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    }
    client = createClient(url, key);
  }
  return client;
}

export interface DocumentInsert {
  collection_id: string;
  filename: string;
  filepath: string;
  title: string | null;
  year: number | null;
  organization: string | null;
  country: string | null;
  file_type: string;
  file_size_bytes: number;
  page_count: number | null;
  chunk_count: number;
  metadata?: Record<string, unknown>;
}

export async function upsertDocument(
  doc: DocumentInsert
): Promise<string> {
  const supabase = getClient();

  const { data, error } = await supabase
    .from("documents")
    .upsert(doc, { onConflict: "collection_id,filepath" })
    .select("id")
    .single();

  if (error) throw new Error(`Document upsert failed: ${error.message}`);
  return data.id;
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function insertChunks(
  tableName: string,
  documentId: string,
  chunks: Chunk[],
  embeddings: number[][]
): Promise<void> {
  const supabase = getClient();
  // 50 rows × ~3072-dim vectors keeps each PostgREST payload well under
  // the default 8 MB body limit and well under any HTTP/2 frame timeouts
  // we were seeing on the original BATCH=500 setting.
  const BATCH = 50;
  const MAX_RETRIES = 4;

  const rows = chunks.map((chunk, i) => ({
    document_id: documentId,
    chunk_index: chunk.chunkIndex,
    content: chunk.content,
    token_count: chunk.tokenCount,
    embedding: embeddings[i],
    page_number: chunk.pageNumber,
    section_heading: chunk.sectionHeading,
  }));

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    let attempt = 0;
    let lastErr: unknown = null;
    while (attempt < MAX_RETRIES) {
      try {
        const { error } = await supabase.from(tableName).insert(batch);
        if (error) throw error;
        lastErr = null;
        break;
      } catch (err) {
        lastErr = err;
        attempt++;
        if (attempt >= MAX_RETRIES) break;
        const delay = 500 * Math.pow(2, attempt); // 1s, 2s, 4s
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(
          `  Chunk insert batch ${i / BATCH + 1} attempt ${attempt} failed (${msg}); retrying in ${delay}ms`
        );
        await sleep(delay);
      }
    }
    if (lastErr) {
      const msg =
        lastErr instanceof Error ? lastErr.message : String(lastErr);
      throw new Error(
        `Chunk insert failed (batch ${i / BATCH + 1}, ${MAX_RETRIES} attempts): ${msg}`
      );
    }
  }
}

export async function updateCollectionStats(
  collectionId: string
): Promise<void> {
  const supabase = getClient();

  // Count documents
  const { count: docCount } = await supabase
    .from("documents")
    .select("*", { count: "exact", head: true })
    .eq("collection_id", collectionId);

  // Sum chunks from documents
  const { data: chunkData } = await supabase
    .from("documents")
    .select("chunk_count")
    .eq("collection_id", collectionId);

  const totalChunks = (chunkData ?? []).reduce(
    (sum, d) => sum + (d.chunk_count || 0),
    0
  );

  // Count images
  const { count: imgCount } = await supabase
    .from("document_images")
    .select("*", { count: "exact", head: true })
    .eq("collection_id", collectionId);

  await supabase
    .from("collections")
    .update({
      document_count: docCount ?? 0,
      chunk_count: totalChunks,
      image_count: imgCount ?? 0,
      last_ingested_at: new Date().toISOString(),
    })
    .eq("id", collectionId);
}
