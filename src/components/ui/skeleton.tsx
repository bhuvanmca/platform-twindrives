import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}

/** Placeholder rows shaped like a <DataTable>, for query loading states. */
function TableSkeleton({
  rows = 5,
  columns = 4,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div role="status" aria-label="Loading" className="divide-y divide-border">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 px-5 py-4">
          {Array.from({ length: columns }).map((_, c) => (
            <Skeleton
              key={c}
              className={cn("h-4", c === 0 ? "w-1/3" : "flex-1 max-w-28")}
              // Slight length variation reads as content rather than a grid.
              style={{ opacity: 1 - r * 0.09 }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Placeholder grid shaped like a row of <StatCard>s. */
function CardsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="grid grid-cols-2 xl:grid-cols-3 gap-4"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-card rounded-xl border border-border p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="size-8 rounded-lg" />
          </div>
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

export { Skeleton, TableSkeleton, CardsSkeleton };
