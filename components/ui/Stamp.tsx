type StampProps = {
  label: string;
  /** When and how the stamp lands, for example an entrance animation. */
  className?: string;
};

/** The round stamp a boarding pass gets once it has been checked. */
export default function Stamp({ label, className = "" }: StampProps) {
  return (
    <p className={`flex -rotate-3 items-center gap-2 text-success ${className}`}>
      <svg viewBox="0 0 48 48" aria-hidden="true" className="size-10 shrink-0" fill="none" stroke="currentColor">
        <circle cx="24" cy="24" r="22" strokeWidth="2" />
        <circle cx="24" cy="24" r="17" strokeWidth="1" strokeDasharray="2 3" />
        <path d="M15 24.5l6 6 12-13" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="text-label font-extrabold tracking-wider uppercase">{label}</span>
    </p>
  );
}
