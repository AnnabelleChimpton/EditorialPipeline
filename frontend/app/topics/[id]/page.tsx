import { notFound } from "next/navigation";
import Link from "next/link";
import { getTopicById } from "@/lib/data";
import { getManifest, getBadgeStyle } from "@/lib/manifest";
import { getFeedbackForTopic, isPrioritized } from "@/lib/state";
import { StageBadge } from "@/components/stage-badge";
import { ArtifactTabs } from "@/components/artifact-tabs";
import { CopyButton } from "@/components/copy-button";
import { PriorityToggle } from "@/components/priority-toggle";
import { FeedbackPanel } from "@/components/feedback-panel";

export const dynamic = "force-dynamic";

export default async function TopicDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const topic = getTopicById(id);
  if (!topic) notFound();

  const manifest = getManifest();
  const topicFeedback = getFeedbackForTopic(id);
  const topicIsPrioritized = isPrioritized(id);

  // Build lane list based on available artifacts, always include "*"
  const allLanes = ["*", "brief", "draft", "qa", "revision", "short-form"];
  const artifactLaneMap: Record<string, string> = {
    brief: "brief",
    draft: "draft",
    qa: "qa",
    revision: "revision",
    shortForm: "short-form",
  };
  const availableLanes = ["*"];
  for (const [artifactKey, lane] of Object.entries(artifactLaneMap)) {
    if (topic.artifacts[artifactKey as keyof typeof topic.artifacts]) {
      availableLanes.push(lane);
    }
  }
  // Always include all lanes so feedback can be set proactively
  const feedbackLanes = allLanes;

  const finalDraft = topic.artifacts.revision || topic.artifacts.draft;
  const subtitle = manifest.subtitleField
    ? (topic.meta[manifest.subtitleField] as string | undefined)
    : undefined;
  const priorityVal = topic.meta[manifest.priority.field] as string | undefined;

  // Collect non-badge metadata fields that have values
  const tagFields = manifest.metadata
    .filter((mf) => !mf.badge)
    .map((mf) => ({ label: mf.label, value: topic.meta[mf.field] as string | undefined }))
    .filter((f) => f.value);

  // Collect badge metadata fields that have values
  const badgeFields = manifest.metadata
    .filter((mf) => mf.badge)
    .map((mf) => ({
      label: mf.label,
      value: topic.meta[mf.field] as string | undefined,
      color: mf.colors?.[(topic.meta[mf.field] as string) || ""],
    }))
    .filter((f) => f.value);

  const hasMetadata = tagFields.length > 0 || badgeFields.length > 0 || priorityVal;

  return (
    <div className="max-w-5xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-stone-400 mb-5">
        <Link href="/" className="hover:text-stone-600 transition-colors">
          Dashboard
        </Link>
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        </svg>
        <Link href="/board" className="hover:text-stone-600 transition-colors">
          Story Board
        </Link>
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        </svg>
        <span className="text-stone-600 font-medium truncate max-w-xs">{topic.title}</span>
      </nav>

      {/* Header card */}
      <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm mb-8">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-sm font-mono text-stone-400">{topic.id}</span>
              <StageBadge stage={topic.currentStage} />
              <PriorityToggle topicId={topic.id} isPrioritized={topicIsPrioritized} />
              {topic.qaStatus && (
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                  topic.qaStatus === "approved"
                    ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200"
                    : "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200"
                }`}>
                  {topic.qaStatus === "approved" ? (
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                  ) : (
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                    </svg>
                  )}
                  {topic.qaStatus === "approved" ? "Review Approved" : "Review: Needs Revision"}
                </span>
              )}
              {topic.revisionRound && (
                <span className="text-xs font-medium text-orange-600">
                  Revision {topic.revisionRound}
                  {topic.revisionStatus && (
                    <span className="ml-1 text-stone-400">· {topic.revisionStatus}</span>
                  )}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-stone-900 leading-tight">{topic.title}</h1>
            {subtitle && (
              <p className="mt-2 text-base text-stone-600 italic leading-relaxed">{subtitle}</p>
            )}
            {hasMetadata && (
              <div className="mt-3 flex flex-wrap gap-2">
                {tagFields.map((f) => (
                  <span key={f.label} className="inline-flex items-center rounded-md bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-600 ring-1 ring-inset ring-stone-200">
                    {f.value}
                  </span>
                ))}
                {badgeFields.map((f) => (
                  <span key={f.label} className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${getBadgeStyle(f.color)}`}>
                    {f.value}
                  </span>
                ))}
                {priorityVal && (
                  <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${getBadgeStyle(manifest.priority.colors[priorityVal])}`}>
                    {priorityVal} {manifest.priority.label.toLowerCase()}
                  </span>
                )}
              </div>
            )}
          </div>
          {topic.currentStage === "done" && (
            <div className="flex shrink-0 items-center gap-2">
              {topic.artifacts.shortForm && (
                <CopyButton text={topic.artifacts.shortForm} label="Copy Short Post" />
              )}
              {finalDraft && (
                <CopyButton text={finalDraft} label="Copy Final Draft" />
              )}
            </div>
          )}
        </div>
      </div>

      <FeedbackPanel topicId={topic.id} initialFeedback={topicFeedback} lanes={feedbackLanes} />

      {typeof topic.meta.notes === "string" && topic.meta.notes && (
        <div className="rounded-xl border border-amber-200/60 bg-amber-50/40 p-4 mb-8">
          <div className="flex items-center gap-2 mb-1.5">
            <svg className="h-4 w-4 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
            </svg>
            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Editorial Notes</span>
          </div>
          <p className="text-sm text-amber-900/80 leading-relaxed">{topic.meta.notes as string}</p>
        </div>
      )}

      <ArtifactTabs
        artifacts={topic.artifacts}
        currentStage={topic.currentStage}
        revisionRound={topic.revisionRound}
        qaStatus={topic.qaStatus}
        artifactTimestamps={topic.artifactTimestamps}
      />
    </div>
  );
}
