interface EmptyStateProps {
  title?: string;
  description?: string;
}

export function EmptyState({
  title = "No bitcoin contributions found",
  description = "Try adjusting your filters or date range.",
}: EmptyStateProps) {
  return (
    <div className="py-8 text-center">
      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{title}</p>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
    </div>
  );
}
