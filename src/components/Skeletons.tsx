export function OverviewSkeleton() {
  return (
    <div role="status" aria-label="Loading overview" className="animate-pulse">
      <div className="h-8 w-48 bg-gray-200 rounded mb-4" />
      <div className="h-4 w-64 bg-gray-200 rounded mb-2" />
      <div className="h-4 w-32 bg-gray-200 rounded" />
    </div>
  );
}

export function ContributionsSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading contributions"
      className="animate-pulse"
    >
      <div className="h-32 w-full bg-gray-200 rounded mb-4" />
      <div className="h-4 w-48 bg-gray-200 rounded" />
    </div>
  );
}

export function RepoListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          role="status"
          aria-label={`Loading repo ${i + 1}`}
          className="animate-pulse mb-3"
        >
          <div className="h-5 w-40 bg-gray-200 rounded mb-1" />
          <div className="h-4 w-56 bg-gray-200 rounded" />
        </div>
      ))}
    </>
  );
}
