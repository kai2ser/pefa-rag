import fs from "fs";
import { PDFParse } from "pdf-parse";

export interface ParsedDocument {
  text: string;
  pageCount: number;
  pageTexts: Map<number, string>;  // page number -> text
  pageOffsets: Map<number, number>; // char offset -> page number (offset where the page starts in `text`)
  metadata: Record<string, unknown>;
}

export async function parsePdf(filePath: string): Promise<ParsedDocument> {
  const buffer = fs.readFileSync(filePath);
  const parser = new PDFParse({ data: new Uint8Array(buffer) });

  let textResult;
  let infoResult;
  try {
    textResult = await parser.getText();
    infoResult = await parser.getInfo();
  } finally {
    await parser.destroy();
  }

  const pageTexts = new Map<number, string>();
  const pageOffsets = new Map<number, number>();
  let fullText = "";

  for (const page of textResult.pages) {
    pageOffsets.set(fullText.length, page.num); // offset BEFORE we append
    pageTexts.set(page.num, page.text);
    fullText += page.text + "\n\n";
  }

  return {
    text: textResult.text || fullText,
    pageCount: textResult.total ?? infoResult.total ?? textResult.pages.length,
    pageTexts,
    pageOffsets,
    metadata: (infoResult.info ?? {}) as Record<string, unknown>,
  };
}
