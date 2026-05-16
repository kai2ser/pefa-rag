-- Additive migration: adds the PEFA collection alongside any existing
-- collections in this Supabase project (pim_lit, pima, wbg_pers).
-- Safe to run against a fresh project (creates extension, register row)
-- and idempotent against the pim-guidance schema.

-- Required extension (pim-guidance project already has it; no-op there)
CREATE EXTENSION IF NOT EXISTS vector;

-- Shared infrastructure (no-op if already created by pim-guidance migration)
CREATE TABLE IF NOT EXISTS collections (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  description TEXT,
  document_count INT DEFAULT 0,
  chunk_count INT DEFAULT 0,
  image_count INT DEFAULT 0,
  total_tokens BIGINT DEFAULT 0,
  last_ingested_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id TEXT NOT NULL REFERENCES collections(id),
  filename TEXT NOT NULL,
  filepath TEXT NOT NULL,
  title TEXT,
  year INT,
  organization TEXT,
  country TEXT,
  file_type TEXT NOT NULL,
  file_size_bytes BIGINT,
  page_count INT,
  chunk_count INT DEFAULT 0,
  ingested_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(collection_id, filepath)
);

CREATE INDEX IF NOT EXISTS idx_documents_collection ON documents(collection_id);
CREATE INDEX IF NOT EXISTS idx_documents_country    ON documents(country);
CREATE INDEX IF NOT EXISTS idx_documents_year       ON documents(year);

-- Register the PEFA collection
INSERT INTO collections (id, display_name, description) VALUES
  ('pefa',
   'PEFA National Reports',
   'Public Expenditure and Financial Accountability assessments — final, publicly available country-level reports from the PEFA Secretariat.')
ON CONFLICT (id) DO UPDATE
  SET display_name = EXCLUDED.display_name,
      description  = EXCLUDED.description;

-- PEFA chunk table
CREATE TABLE IF NOT EXISTS pefa_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index INT NOT NULL,
  content TEXT NOT NULL,
  token_count INT,
  embedding vector(3072),
  page_number INT,
  section_heading TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pefa_chunks_document ON pefa_chunks(document_id);

-- IVFFlat index on the embedding (cosine). lists=50 is a sensible default for
-- ~100 documents → low thousands of chunks. Increase to ~200 if the corpus grows.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_pefa_chunks_embedding'
  ) THEN
    EXECUTE 'CREATE INDEX idx_pefa_chunks_embedding ON pefa_chunks
             USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50)';
  END IF;
END $$;

-- Vector match RPC for the PEFA collection
CREATE OR REPLACE FUNCTION match_pefa_chunks(
  query_embedding vector(3072),
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  id UUID, document_id UUID, content TEXT,
  page_number INT, section_heading TEXT, similarity FLOAT
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.document_id, c.content, c.page_number, c.section_heading,
         (1 - (c.embedding <=> query_embedding))::FLOAT AS similarity
  FROM pefa_chunks c
  WHERE 1 - (c.embedding <=> query_embedding) > match_threshold
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- get_year_ranges RPC: required by /api/stats. Created here in idempotent
-- form so a fresh Supabase project also gets it. (No-op rename on pim-guidance.)
CREATE OR REPLACE FUNCTION get_year_ranges()
RETURNS TABLE (
  collection_id TEXT,
  min_year INT,
  max_year INT
)
LANGUAGE sql AS $$
  SELECT collection_id,
         MIN(year)::INT AS min_year,
         MAX(year)::INT AS max_year
  FROM documents
  WHERE year IS NOT NULL
  GROUP BY collection_id;
$$;
