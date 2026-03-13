import Link from "next/link";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: { label: string; href: string };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-stone-200 bg-white/50 py-12 px-6 text-center">
      {icon && <div className="mb-3 text-stone-300">{icon}</div>}
      <p className="text-sm font-medium text-stone-500">{title}</p>
      {description && <p className="mt-1 text-xs text-stone-400 max-w-xs">{description}</p>}
      {action && (
        <Link
          href={action.href}
          className="mt-4 inline-flex items-center rounded-md bg-stone-900 px-3.5 py-1.5 text-sm font-medium text-white hover:bg-stone-800 transition-colors"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
