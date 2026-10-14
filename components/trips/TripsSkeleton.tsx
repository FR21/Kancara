const ROWS = [0, 1, 2, 3];
const BAR = "rounded-full bg-surface-muted";

// Same footprint as the list and the detail panel, so nothing jumps when the trips arrive.
export default function TripsSkeleton({ label }: { label: string }) {
  return (
    <div role="status" className="lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start lg:gap-8">
      <span className="sr-only">{label}</span>
      <div
        aria-hidden="true"
        className="divide-y divide-border overflow-clip rounded-surface border border-border bg-surface motion-safe:animate-pulse"
      >
        {ROWS.map((row) => (
          <div key={row} className="flex items-center gap-3 px-surface py-3">
            <div className="size-10 shrink-0 rounded-full bg-surface-muted" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className={`h-4 w-40 max-w-full ${BAR}`} />
              <div className={`h-3 w-56 max-w-full ${BAR}`} />
            </div>
            <div className={`h-4 w-12 ${BAR}`} />
          </div>
        ))}
      </div>
      <div
        aria-hidden="true"
        className="hidden overflow-clip rounded-surface border border-border bg-surface motion-safe:animate-pulse lg:block"
      >
        <div className="h-36 bg-surface-muted" />
        <div className="space-y-6 p-surface">
          <div className="grid grid-cols-4 gap-4">
            {ROWS.map((row) => (
              <div key={row} className={`h-10 ${BAR}`} />
            ))}
          </div>
          <div className={`h-8 w-48 ${BAR}`} />
          <div className="h-20 rounded-lg bg-surface-muted" />
          <div className={`h-12 w-44 ${BAR}`} />
        </div>
      </div>
    </div>
  );
}
