import { getTopics } from "@/lib/data";
import { PipelineBoard } from "@/components/pipeline-board";

export const dynamic = "force-dynamic";

export default function PipelinePage() {
  const topics = getTopics();

  return (
    <div>
      <h1 className="text-xl font-semibold text-foreground mb-6">Pipeline Overview</h1>
      <PipelineBoard topics={topics} />
    </div>
  );
}
