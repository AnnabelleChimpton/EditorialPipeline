import { getTopics, getTopicStats, getRecentActivity, getStageDistribution } from "@/lib/data";
import { StatCard } from "@/components/stat-card";
import { AttentionList } from "@/components/attention-list";
import { ActivityFeed } from "@/components/activity-feed";
import { StageDistributionBar } from "@/components/stage-distribution";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  const stats = getTopicStats();
  const topics = getTopics();
  const activity = getRecentActivity(8);
  const distribution = getStageDistribution();

  const attentionTopics = topics.filter(
    (t) => t.currentStage === "qa-failed" || t.currentStage === "revision"
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-stone-900">Dashboard</h1>
        <p className="mt-1 text-sm text-stone-500">
          Your editorial workflow at a glance
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Needs Attention"
          value={stats.qaFailed + stats.revision}
          accent="bg-amber-400"
          href="/board"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
          }
        />
        <StatCard
          title="In Progress"
          value={stats.inProgress}
          accent="bg-sky-400"
          href="/board"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
            </svg>
          }
        />
        <StatCard
          title="Incoming"
          value={stats.queued}
          accent="bg-stone-300"
          href="/queue"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" />
            </svg>
          }
        />
        <StatCard
          title="Ready to Publish"
          value={stats.done}
          accent="bg-emerald-400"
          href="/ready"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          }
        />
      </div>

      {/* Pipeline overview */}
      <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm mb-8">
        <h2 className="text-sm font-semibold text-stone-800 mb-3">Story Progress</h2>
        <StageDistributionBar distribution={distribution} />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attention items */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-stone-800">Needs Attention</h2>
              {attentionTopics.length > 0 && (
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                  {attentionTopics.length}
                </span>
              )}
            </div>
            <AttentionList topics={attentionTopics} />
          </div>
        </div>

        {/* Recent activity */}
        <div>
          <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-stone-800 mb-4">Recent Activity</h2>
            <ActivityFeed entries={activity} />
          </div>
        </div>
      </div>
    </div>
  );
}
