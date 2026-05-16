"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { CollectionId } from "@/lib/types";
import CollectionSelector from "./CollectionSelector";
import SourceCard from "./SourceCard";

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: Array<{
    id: string;
    content: string;
    page_number: number | null;
    section_heading: string | null;
    similarity: number;
    document: {
      title: string | null;
      filename: string;
      organization: string | null;
      year: number | null;
      country: string | null;
    } | null;
  }>;
}

interface Props {
  initialCollection?: CollectionId;
}

export default function ChatInterface({ initialCollection }: Props) {
  const [collection, setCollection] = useState<CollectionId>(
    initialCollection || "pefa"
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isStreaming) return;

    setInput("");
    const userMessage: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setIsStreaming(true);

    const assistantMessage: Message = {
      role: "assistant",
      content: "",
      sources: [],
    };
    setMessages((prev) => [...prev, assistantMessage]);

    try {
      const history = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, collection, history }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Request failed");
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const json = JSON.parse(line.slice(6));

          if (json.type === "sources") {
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = {
                ...updated[updated.length - 1],
                sources: json.data,
              };
              return updated;
            });
          } else if (json.type === "text") {
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = {
                ...updated[updated.length - 1],
                content: updated[updated.length - 1].content + json.data,
              };
              return updated;
            });
          }
        }
      }
    } catch (err) {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          content: `Error: ${err instanceof Error ? err.message : "Something went wrong"}`,
        };
        return updated;
      });
    } finally {
      setIsStreaming(false);
    }
  }

  return (
    <div className="flex flex-1 min-h-0 flex-col">
      {/* Top bar */}
      <div className="border-b border-border bg-white px-4 py-3 sm:px-6">
        <div className="mx-auto max-w-4xl flex items-center justify-between">
          <h1 className="font-heading text-lg font-semibold text-foreground">
            Query Documents
          </h1>
          <CollectionSelector value={collection} onChange={setCollection} />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-4xl space-y-6">
          {messages.length === 0 && (
            <div className="text-center py-24">
              <h2 className="font-heading text-2xl font-semibold text-foreground">
                Ask a question
              </h2>
              <p className="mt-2 text-sm text-muted max-w-md mx-auto">
                Search across PEFA national assessments using natural
                language. Responses cite country, year, and page number.
              </p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i}>
              {msg.role === "user" ? (
                <div className="flex justify-end">
                  <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-accent/10 px-5 py-3 text-sm text-foreground">
                    {msg.content}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="prose prose-sm max-w-none text-foreground">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content || (isStreaming && i === messages.length - 1 ? "Thinking..." : "")}
                    </ReactMarkdown>
                  </div>
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted uppercase tracking-wider">
                        Sources ({msg.sources.length})
                      </p>
                      <div className="grid gap-2">
                        {msg.sources.slice(0, 5).map((source) => (
                          <SourceCard key={source.id} source={source} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-border bg-white px-4 py-4 sm:px-6">
        <form
          onSubmit={handleSubmit}
          className="mx-auto max-w-4xl flex items-center gap-3"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about PEFA scores, PFM systems, country comparisons..."
            disabled={isStreaming}
            className="flex-1 rounded-lg border border-border bg-bg-light/30 px-4 py-3 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isStreaming || !input.trim()}
            className="rounded-lg bg-primary px-5 py-3 text-sm font-medium text-white shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isStreaming ? (
              <svg
                className="h-5 w-5 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            ) : (
              "Send"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
