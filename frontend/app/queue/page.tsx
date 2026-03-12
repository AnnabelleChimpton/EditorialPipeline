import { getTopics } from "@/lib/data";
import { QueueTable } from "@/components/queue-table";

export const dynamic = "force-dynamic";

const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };

export default function QueuePage() {
  const topics = getTopics().sort(
    (a, b) =>
      (priorityOrder[a.priority || "low"] ?? 3) -
      (priorityOrder[b.priority || "low"] ?? 3)
  );

  return (
    <div>
      <h1 className="text-xl font-semibold text-foreground mb-6">Topic Queue</h1>
      <QueueTable topics={topics} />
    </div>
  );
}
