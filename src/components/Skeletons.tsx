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

export function ProfileCardSkeleton() {
  return (
    <div role="status" aria-label="Loading profile" className="animate-pulse">
      <div className="flex items-start gap-5 rounded-lg border p-6">
        <div className="h-16 w-16 rounded-full bg-gray-200" />
        <div className="flex-1">
          <div className="h-6 w-36 bg-gray-200 rounded mb-2" />
          <div className="h-4 w-24 bg-gray-200 rounded mb-2" />
          <div className="h-4 w-64 bg-gray-200 rounded" />
        </div>
      </div>
    </div>
  );
}

export function StatsGridSkeleton() {
  return (
    <div role="status" aria-label="Loading stats" className="animate-pulse">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="rounded-lg border p-4 text-center">
            <div className="mx-auto h-8 w-12 bg-gray-200 rounded mb-1" />
            <div className="mx-auto h-3 w-16 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function HeatmapSkeleton() {
  return (
    <div role="status" aria-label="Loading heatmap" className="animate-pulse">
      <div className="h-5 w-32 bg-gray-200 rounded mb-3" />
      <div className="h-24 w-full bg-gray-200 rounded" />
    </div>
  );
}

export function TimelineSkeleton() {
  return (
    <div role="status" aria-label="Loading timeline" className="animate-pulse">
      <div className="h-5 w-40 bg-gray-200 rounded mb-3" />
      <div className="h-64 w-full bg-gray-200 rounded" />
    </div>
  );
}
