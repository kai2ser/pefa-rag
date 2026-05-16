import { encoding_for_model } from "tiktoken";

const enc = encoding_for_model("gpt-4o");

export interface Chunk {
  content: string;
  tokenCount: number;
  chunkIndex: number;
  pageNumber: number | null;
  sectionHeading: string | null;
}

const TARGET_TOKENS = 1500;
const OVERLAP_TOKENS = 200;

function countTokens(text: string): number {
  return enc.encode(text).length;
}

function detectSectionHeading(text: string): string | null {
  const lines = text.split("\n").slice(0, 3);
  for (const line of lines) {
    const trimmed = line.trim();
    // ALL CAPS headings or numbered sections
    if (
      (trimmed.length > 3 &&
        trimmed.length < 200 &&
        trimmed === trimmed.toUpperCase() &&
        /[A-Z]/.test(trimmed)) ||
      /^\d+(\.\d+)*\s+[A-Z]/.test(trimmed)
    ) {
      return trimmed;
    }
  }
  return null;
}

export function chunkText(
  text: string,
  pageNumbers?: Map<number, number> // char offset -> page number
): Chunk[] {
  const chunks: Chunk[] = [];

  // Split hierarchy: paragraphs -> sentences -> words
  const paragraphs = text.split(/\n\n+/);
  let currentContent = "";
  let currentTokens = 0;
  let chunkIndex = 0;

  function flush() {
    if (currentContent.trim()) {
      const content = currentContent.trim();
      const heading = detectSectionHeading(content);

      // Determine page number from offset
      let pageNumber: number | null = null;
      if (pageNumbers) {
        const offset = text.indexOf(content);
        for (const [charOffset, page] of pageNumbers) {
          if (charOffset <= offset) pageNumber = page;
          else break;
        }
      }

      chunks.push({
        content,
        tokenCount: countTokens(content),
        chunkIndex,
        pageNumber,
        sectionHeading: heading,
      });
      chunkIndex++;

      // Keep overlap
      const words = content.split(/\s+/);
      let overlapText = "";
      let overlapTokens = 0;
      for (let i = words.length - 1; i >= 0; i--) {
        const candidate = words.slice(i).join(" ");
        const tokens = countTokens(candidate);
        if (tokens > OVERLAP_TOKENS) break;
        overlapText = candidate;
        overlapTokens = tokens;
      }
      currentContent = overlapText;
      currentTokens = overlapTokens;
    }
  }

  for (const para of paragraphs) {
    const paraTokens = countTokens(para);

    if (currentTokens + paraTokens > TARGET_TOKENS && currentContent) {
      flush();
    }

    if (paraTokens > TARGET_TOKENS) {
      // Split large paragraphs by sentences
      const sentences = para.split(/(?<=[.!?])\s+/);
      for (const sentence of sentences) {
        const sentTokens = countTokens(sentence);
        if (currentTokens + sentTokens > TARGET_TOKENS && currentContent) {
          flush();
        }
        currentContent += (currentContent ? " " : "") + sentence;
        currentTokens += sentTokens;
      }
    } else {
      currentContent += (currentContent ? "\n\n" : "") + para;
      currentTokens += paraTokens;
    }
  }

  flush();
  return chunks;
}

export { countTokens };
