import { NextRequest } from "next/server";
import { retrieveChunks, retrieveImages } from "@/lib/retrieval";
import { streamChatResponse } from "@/lib/claude";
import { getCollection } from "@/lib/collections";
import type { CollectionId } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const VALID_COLLECTIONS = new Set(["pefa"]);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, collection, history = [], includeImages = true } = body;

    if (!message || typeof message !== "string") {
      return Response.json({ error: "Message is required" }, { status: 400 });
    }

    if (!collection || !VALID_COLLECTIONS.has(collection)) {
      return Response.json(
        { error: "Invalid collection" },
        { status: 400 }
      );
    }

    const collectionId = collection as CollectionId;
    const col = getCollection(collectionId);

    if (!col.enabled) {
      return Response.json(
        { error: "This collection is not yet available" },
        { status: 400 }
      );
    }

    // Retrieve relevant chunks and images
    const [chunks, images] = await Promise.all([
      retrieveChunks(message, collectionId),
      includeImages ? retrieveImages(message, collectionId) : Promise.resolve([]),
    ]);

    // Stream response using Claude
    const stream = await streamChatResponse(col, chunks, message, history);

    // Create SSE response
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        // Send sources first
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "sources", data: chunks.map((c) => ({ id: c.id, document_id: c.document_id, content: c.content.slice(0, 200), page_number: c.page_number, section_heading: c.section_heading, similarity: c.similarity, document: c.document ? { title: c.document.title, filename: c.document.filename, organization: c.document.organization, year: c.document.year, country: c.document.country } : null })) })}\n\n`
          )
        );

        // Send images
        if (images.length > 0) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "images", data: images })}\n\n`
            )
          );
        }

        // Stream text from Claude
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "text", data: event.delta.text })}\n\n`
              )
            );
          }
        }

        // Done
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`)
        );
        controller.close();
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
