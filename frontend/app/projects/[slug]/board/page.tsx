"use client";
import { useParams } from "next/navigation";
import { KanbanBoard } from "@/components/KanbanBoard";

export default function BoardPage() {
  const { slug } = useParams<{ slug: string }>();
  return (
    <div className="p-6">
      <KanbanBoard project={slug} />
    </div>
  );
}
