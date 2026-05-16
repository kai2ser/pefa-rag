"use client";

import { COLLECTIONS } from "@/lib/collections";
import type { CollectionId } from "@/lib/types";

interface Props {
  value: CollectionId;
  onChange: (id: CollectionId) => void;
}

export default function CollectionSelector({ value, onChange }: Props) {
  const collections = Object.values(COLLECTIONS);

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as CollectionId)}
      className="rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-medium text-foreground shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
    >
      {collections.map((col) => (
        <option key={col.id} value={col.id} disabled={!col.enabled}>
          {col.displayName}
          {!col.enabled ? " (Coming Soon)" : ""}
        </option>
      ))}
    </select>
  );
}
