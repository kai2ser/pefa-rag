import { getServerClient } from "./supabase";
import { embedQuery } from "./embeddings";
import { getCollection } from "./collections";
import type { CollectionId, ChunkResult, ImageResult } from "./types";

export async function retrieveChunks(
  query: string,
  collectionId: CollectionId,
  topK: number = 15,
  threshold: number = 0.5
): Promise<ChunkResult[]> {
  const collection = getCollection(collectionId);
  const supabase = getServerClient();
  const embedding = await embedQuery(query);

  const { data, error } = await supabase.rpc(collection.rpcName, {
    query_embedding: embedding,
    match_threshold: threshold,
    match_count: topK,
  });

  if (error) throw new Error(`Vector search failed: ${error.message}`);
  if (!data || data.length === 0) return [];

  // Fetch document metadata for results
  const docIds = [...new Set(data.map((r: ChunkResult) => r.document_id))];
  const { data: docs } = await supabase
    .from("documents")
    .select("*")
    .in("id", docIds);

  const docMap = new Map(docs?.map((d) => [d.id, d]) ?? []);

  return data.map((chunk: ChunkResult) => ({
    ...chunk,
    document: docMap.get(chunk.document_id),
  }));
}

export async function retrieveImages(
  query: string,
  collectionId: CollectionId,
  topK: number = 3
): Promise<ImageResult[]> {
  const supabase = getServerClient();
  const embedding = await embedQuery(query);

  const { data, error } = await supabase.rpc("match_document_images", {
    query_embedding: embedding,
    collection_filter: collectionId,
    match_threshold: 0.4,
    match_count: topK,
  });

  if (error) return [];
  return data ?? [];
}
