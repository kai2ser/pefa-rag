export type CollectionId = "pefa";

export interface Collection {
  id: CollectionId;
  displayName: string;
  description: string;
  tableName: string;
  rpcName: string;
  enabled: boolean;
}

export interface DocumentRecord {
  id: string;
  collection_id: CollectionId;
  filename: string;
  filepath: string;
  title: string | null;
  year: number | null;
  organization: string | null;
  country: string | null;
  file_type: string;
  file_size_bytes: number | null;
  page_count: number | null;
  chunk_count: number;
  ingested_at: string;
  metadata: Record<string, unknown>;
}

export interface ChunkResult {
  id: string;
  document_id: string;
  content: string;
  page_number: number | null;
  section_heading: string | null;
  similarity: number;
  document?: DocumentRecord;
}

export interface ImageResult {
  id: string;
  document_id: string;
  page_number: number;
  storage_path: string;
  caption: string | null;
  similarity: number;
}

export interface CollectionStats {
  id: CollectionId;
  display_name: string;
  description: string | null;
  document_count: number;
  chunk_count: number;
  image_count: number;
  total_tokens: number;
  last_ingested_at: string | null;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  sources?: ChunkResult[];
  images?: ImageResult[];
}
