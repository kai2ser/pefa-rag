<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version (Next.js 16) has breaking changes — APIs, conventions, and file
structure may all differ from your training data. Read the relevant guide in
`node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Project shape

Single-collection clone of `pim-guidance`:

- Collection id: `pefa`
- Chunk table: `pefa_chunks` (vector(3072), cosine, IVFFlat)
- RPC: `match_pefa_chunks(query_embedding, match_threshold, match_count)`
- Documents table is shared across collections on the pim-guidance Supabase
  project — `collection_id = 'pefa'` scopes our rows.
- Source-of-truth catalogue is `data/latest_national_pefas.csv` (148 reports;
  103 Public; 45 Non-public). Non-public rows are catalogued but never
  downloaded or embedded.

## When ingesting

- Each row's `Suggested Filename` maps to `_dataPEFA/<filename>`.
- The unique key `(collection_id, filepath)` ties together the overview-seed
  row, the downloaded PDF, and the ingested chunks. Don't break it.
- Embedding model is `text-embedding-3-large` (3072d) — must match what
  pim-guidance uses or shared infrastructure breaks.
