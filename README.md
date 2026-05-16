# PEFA Reports AI

AI-powered semantic search across PEFA (Public Expenditure and Financial
Accountability) national assessment reports. Sister application to
[PIM Global Guidance](https://pim-ai-global.vercel.app/) — same Next.js +
Supabase pgvector + Anthropic Claude architecture, scoped to a single
collection of PEFA national reports.

## Architecture

- **Framework**: Next.js 16 (App Router) on Vercel
- **Embeddings**: OpenAI `text-embedding-3-large` (3072 dimensions)
- **Vector store**: Supabase Postgres with `pgvector`, table `pefa_chunks`
- **LLM**: Anthropic Claude Sonnet 4 (streaming)
- **Document catalogue**: shared `documents` table on Supabase, scoped by
  `collection_id = 'pefa'`. Source of truth is `data/latest_national_pefas.csv`.

## Data pipeline

```
data/latest_national_pefas.csv         (PEFA Secretariat catalogue: 148 reports)
        │
        ▼  npm run seed:overview       (CSV → documents table on Supabase)
   documents table                     (overview row per report, public + non-public)
        │
        ▼  npm run download:pdfs       (scrape & download 103 Public PDFs)
   _dataPEFA/*.pdf
        │
        ▼  npm run ingest:pefa         (parse + chunk + embed + upsert)
   pefa_chunks table                   (vector embeddings)
        │
        ▼  /api/chat?collection=pefa   (retrieve + stream from Claude)
   Browser UI at /chat
```

## Setup

```bash
npm install
cp .env.example .env             # then fill in the five secrets
```

Required env vars (all five must be set for chat + ingest to work):

| Var | Used by |
|-----|---------|
| `ANTHROPIC_API_KEY` | `/api/chat` (Claude generation) |
| `OPENAI_API_KEY` | `/api/chat` (query embedding) + `ingest:pefa` |
| `NEXT_PUBLIC_SUPABASE_URL` | client + server |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client read |
| `SUPABASE_SERVICE_ROLE_KEY` | server-side writes, RPCs |

## First-time data load

```bash
# 1. Run the Supabase migration (one-time, against the project that hosts pim-guidance)
#    via the Supabase SQL editor or supabase CLI:
psql "$SUPABASE_DB_URL" -f supabase/migrations/001_pefa.sql

# 2. Seed the documents table with all 148 reports from the CSV
npm run seed:overview

# 3. Download the 103 public PDFs from pefa.org
npm run download:pdfs            # or `-- --limit 5` for a smoke test

# 4. Parse + chunk + embed + upload
npm run ingest:pefa              # add `-- --resume` to continue after interruption
```

Cost estimate for full ingest: ~$5–15 in OpenAI embedding fees
(`text-embedding-3-large` at $0.13 / 1M tokens, expect 1–3M tokens across
~100 reports averaging ~150 pages each).

## Dev

```bash
npm run dev      # http://localhost:3000
npm run build    # production build
npm run lint
```
