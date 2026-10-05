type VoiceOrbProps = {
  activity: number;
  hearing: boolean;
  compact: boolean;
};

export default function VoiceOrb({ activity, hearing, compact }: VoiceOrbProps) {
  return (
    <span
      aria-hidden="true"
      className={`relative flex shrink-0 items-center justify-center ${compact ? "size-10" : "size-18"}`}
    >
      <span
        className={`absolute inset-0 rounded-full transition-[background-color] duration-300 ease-out motion-safe:animate-orb-breathe ${
          hearing ? "voice-orb-ring-heard" : "voice-orb-ring"
        }`}
      />
      {!compact && (
        <span
          className={`absolute inset-2 rounded-full transition-[background-color] duration-300 ease-out ${
            hearing ? "voice-orb-ring-heard" : "voice-orb-ring"
          }`}
        />
      )}
      {activity > 0 && (
        <span
          key={`ripple-${activity}`}
          className="voice-orb-ring-heard absolute inset-0 rounded-full opacity-0 motion-safe:animate-orb-pulse"
        />
      )}
      <span
        key={`core-${activity}`}
        className={`voice-orb relative rounded-full transition-[scale] duration-300 ease-out motion-safe:animate-orb-bump ${
          compact ? "size-6" : "size-10"
        } ${hearing ? "scale-110" : ""}`}
      />
    </span>
  );
}
