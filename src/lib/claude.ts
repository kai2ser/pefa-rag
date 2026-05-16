import Anthropic from "@anthropic-ai/sdk";
import type { Collection, ChunkResult } from "./types";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

function buildSystemPrompt(
  collection: Collection,
  chunks: ChunkResult[]
): string {
  const contextParts = chunks.map((chunk, i) => {
    const doc = chunk.document;
    const source = doc
      ? `[${doc.title || doc.filename}${doc.organization ? ` | ${doc.organization}` : ""}${doc.year ? ` | ${doc.year}` : ""}${doc.country ? ` | ${doc.country}` : ""}${chunk.page_number ? ` | p.${chunk.page_number}` : ""}]`
      : `[Source ${i + 1}]`;
    return `--- Source ${i + 1} ${source} (similarity: ${chunk.similarity.toFixed(3)}) ---\n${chunk.content}`;
  });

  return `You are a specialist in Public Expenditure and Financial Accountability (PEFA) assessments and public financial management (PFM) reform.
You answer questions using the provided document excerpts from the "${collection.displayName}" collection — country-level PEFA assessment reports.

RULES:
- Cite sources by referencing country, year, and page number when available
- When comparing countries, name each one explicitly and cite each PEFA report
- If the provided context is insufficient to answer, clearly state that and suggest what information might help
- Distinguish PEFA scores (A, B, C, D, D+, etc.) from narrative judgments — quote PEFA indicator codes (PI-1, PI-2, …) where used
- Be precise and analytical — this is for PFM specialists, fiscal authorities, and policy researchers
- Structure long answers with clear headings and bullet points

RETRIEVED CONTEXT (${chunks.length} excerpts, ranked by relevance):

${contextParts.join("\n\n")}`;
}

export async function streamChatResponse(
  collection: Collection,
  chunks: ChunkResult[],
  userMessage: string,
  history: Array<{ role: "user" | "assistant"; content: string }>
) {
  const anthropic = getClient();
  const systemPrompt = buildSystemPrompt(collection, chunks);

  const messages = [
    ...history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user" as const, content: userMessage },
  ];

  return anthropic.messages.stream({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: systemPrompt,
    messages,
  });
}
