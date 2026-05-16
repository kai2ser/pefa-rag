import type { Collection, CollectionId } from "./types";

export const COLLECTIONS: Record<CollectionId, Collection> = {
  pefa: {
    id: "pefa",
    displayName: "PEFA National Reports",
    description:
      "Public Expenditure and Financial Accountability assessments — final, publicly available country-level reports from the PEFA Secretariat.",
    tableName: "pefa_chunks",
    rpcName: "match_pefa_chunks",
    enabled: true,
  },
};

export function getCollection(id: CollectionId): Collection {
  return COLLECTIONS[id];
}

export function getEnabledCollections(): Collection[] {
  return Object.values(COLLECTIONS).filter((c) => c.enabled);
}
