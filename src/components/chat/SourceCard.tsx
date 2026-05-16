"use client";

import { useState } from "react";

interface Source {
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
}

export default function SourceCard({ source }: { source: Source }) {
  const [expanded, setExpanded] = useState(false);
  const doc = source.document;

  return (
    <button
      onClick={() => setExpanded(!expanded)}
      className="w-full text-left rounded-lg border border-border p-3 text-sm hover:bg-bg-light/50 transition-colors"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className="shrink-0 inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent/10 text-xs font-medium text-accent">
            {Math.round(source.similarity * 100)}
          </span>
          <span className="font-medium text-foreground truncate">
            {doc?.title || doc?.filename || "Unknown source"}
          </span>
        </div>
        <svg
          className={`h-4 w-4 text-muted transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </div>
      {doc && (
        <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted">
          {doc.organization && <span>{doc.organization}</span>}
          {doc.year && <span>{doc.year}</span>}
          {doc.country && <span>{doc.country}</span>}
          {source.page_number && <span>p.{source.page_number}</span>}
        </div>
      )}
      {expanded && (
        <p className="mt-3 text-xs text-muted leading-relaxed border-t border-border pt-3">
          {source.content}
        </p>
      )}
    </button>
  );
}
