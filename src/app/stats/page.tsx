"use client";

import { useEffect, useState } from "react";
import Footer from "@/components/layout/Footer";

interface CollectionStat {
  id: string;
  display_name: string;
  description: string | null;
  document_count: number;
  chunk_count: number;
  image_count: number;
  total_tokens: number;
  last_ingested_at: string | null;
  file_types: Record<string, number>;
  year_range: { min: number; max: number } | null;
}

const FILE_TYPE_COLORS: Record<string, string> = {
  pdf: "bg-accent/10 text-accent",
  docx: "bg-green-100 text-green-700",
  xlsx: "bg-orange-100 text-orange-700",
};

export default function StatsPage() {
  const [stats, setStats] = useState<CollectionStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then(setStats)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-accent">
          Database Overview
        </p>
        <h1 className="font-heading text-3xl font-bold mt-2 text-foreground">
          Collection Statistics
        </h1>
        <p className="mt-4 text-muted max-w-2xl">
          Real-time summary of the PEFA corpus: catalogued documents,
          embedded chunks, country coverage, and year range.
        </p>

        {loading ? (
          <div className="mt-12 space-y-6">
            {[1].map((i) => (
              <div
                key={i}
                className="h-48 rounded-xl border border-border bg-white animate-pulse"
              />
            ))}
          </div>
        ) : error ? (
          <div className="mt-12 rounded-xl border border-red-200 bg-red-50 p-8 text-sm text-red-600">
            Failed to load statistics: {error}
          </div>
        ) : (
          <div className="mt-12 space-y-6">
            {stats.map((col) => {
              const maxChunks = Math.max(...stats.map((s) => s.chunk_count), 1);
              const barWidth = (col.chunk_count / maxChunks) * 100;

              return (
                <div
                  key={col.id}
                  className="rounded-xl border border-border bg-white p-8 shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="font-heading text-xl font-semibold text-foreground">
                        {col.display_name}
                      </h2>
                      {col.description && (
                        <p className="mt-1 text-sm text-muted">
                          {col.description}
                        </p>
                      )}
                    </div>
                    {col.last_ingested_at && (
                      <span className="text-xs text-muted">
                        Last updated:{" "}
                        {new Date(col.last_ingested_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-6">
                    <div>
                      <p className="text-2xl font-bold text-foreground">
                        {col.document_count.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted mt-1">Documents</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">
                        {col.chunk_count.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted mt-1">Chunks</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">
                        {col.image_count.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted mt-1">Images</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">
                        {col.total_tokens > 0
                          ? `${(col.total_tokens / 1_000_000).toFixed(1)}M`
                          : "0"}
                      </p>
                      <p className="text-xs text-muted mt-1">Tokens</p>
                    </div>
                  </div>

                  {/* Relative size bar */}
                  <div className="mt-4">
                    <div className="h-2 rounded-full bg-bg-light overflow-hidden">
                      <div
                        className="h-full rounded-full bg-accent/60 transition-all"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    {Object.entries(col.file_types).map(([type, count]) => (
                      <span
                        key={type}
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${FILE_TYPE_COLORS[type] || "bg-gray-100 text-gray-600"}`}
                      >
                        {type.toUpperCase()} ({count})
                      </span>
                    ))}
                    {col.year_range && (
                      <span className="text-xs text-muted">
                        {col.year_range.min}&#8211;{col.year_range.max}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
