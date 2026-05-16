"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import ChatInterface from "@/components/chat/ChatInterface";
import type { CollectionId } from "@/lib/types";

function ChatContent() {
  const searchParams = useSearchParams();
  const collection = searchParams.get("collection") as CollectionId | null;

  return <ChatInterface initialCollection={collection || undefined} />;
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="flex-1 min-h-0" />}>
      <ChatContent />
    </Suspense>
  );
}
