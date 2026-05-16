import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const BATCH_SIZE = 100;
const MAX_RETRIES = 5;

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    let retries = 0;

    while (retries < MAX_RETRIES) {
      try {
        const response = await client.embeddings.create({
          model: "text-embedding-3-large",
          input: batch,
        });
        for (const item of response.data) {
          allEmbeddings.push(item.embedding);
        }
        break;
      } catch (error: unknown) {
        retries++;
        if (retries >= MAX_RETRIES) throw error;
        const err = error as { status?: number };
        const delay = err.status === 429 ? 60000 : Math.pow(2, retries) * 1000;
        console.warn(
          `Embedding batch ${i / BATCH_SIZE + 1} failed (attempt ${retries}), retrying in ${delay / 1000}s...`
        );
        await sleep(delay);
      }
    }

    // Rate limit spacing
    if (i + BATCH_SIZE < texts.length) {
      await sleep(200);
    }
  }

  return allEmbeddings;
}

export async function embedSingle(text: string): Promise<number[]> {
  const [embedding] = await embedTexts([text]);
  return embedding;
}
