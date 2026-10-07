const CARDS = [0, 1, 2];
const BAR = "rounded-full bg-surface-muted";

// Same footprint as a trip card, so the grid does not jump when the list arrives.
export default function TripsSkeleton({ label }: { label: string }) {
  return (
    <div role="status" className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <span className="sr-only">{label}</span>
      {CARDS.map((card) => (
        <div
          key={card}
          aria-hidden="true"
          className="rounded-2xl border border-border bg-surface motion-safe:animate-pulse"
        >
          <div className="flex flex-col gap-3 p-5">
            <div className={`h-6 w-24 ${BAR}`} />
            <div className={`h-5 w-40 ${BAR}`} />
            <div className={`h-6 ${BAR}`} />
            <div className={`h-5 w-32 ${BAR}`} />
            <div className={`mt-1 h-8 w-28 ${BAR}`} />
          </div>
          <div className="border-t border-dashed border-border-strong px-5 py-4">
            <div className={`h-6 w-36 ${BAR}`} />
          </div>
        </div>
      ))}
    </div>
  );
}
