import Link from "next/link";

interface StatCardProps {
  title: string;
  value: number;
  accent: string;
  href: string;
  icon: React.ReactNode;
}

export function StatCard({ title, value, accent, href, icon }: StatCardProps) {
  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-xl border border-stone-200 bg-white p-5 shadow-sm transition-all hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:border-stone-300"
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${accent}`} />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-stone-500">{title}</p>
          <p className="mt-1 text-3xl font-semibold text-stone-900 tabular-nums">{value}</p>
        </div>
        <div className="rounded-lg bg-stone-50 p-2 text-stone-400 group-hover:bg-stone-100 transition-colors">
          {icon}
        </div>
      </div>
      <div className="mt-3 flex items-center text-xs font-medium text-stone-400 group-hover:text-stone-600 transition-colors">
        See all
        <svg className="ml-1 h-3 w-3 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        </svg>
      </div>
    </Link>
  );
}
