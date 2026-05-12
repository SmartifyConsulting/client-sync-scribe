export function RowSkeleton({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="divide-y divide-[hsl(var(--admin-border-subtle))]">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-3 px-4 py-2.5">
          {Array.from({ length: cols }).map((_, c) => (
            <div
              key={c}
              className="h-3 flex-1 animate-pulse rounded bg-[hsl(var(--admin-border-subtle))]"
              style={{ maxWidth: c === 0 ? "180px" : "100%" }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export default RowSkeleton;
