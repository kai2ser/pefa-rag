import fs from "fs";
import mammoth from "mammoth";

export interface ParsedDocx {
  text: string;
  metadata: Record<string, unknown>;
}

export async function parseDocx(filePath: string): Promise<ParsedDocx> {
  const buffer = fs.readFileSync(filePath);
  const result = await mammoth.extractRawText({ buffer });

  return {
    text: result.value,
    metadata: {},
  };
}
