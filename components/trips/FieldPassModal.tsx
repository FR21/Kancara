"use client";

import { X } from "lucide-react";
import { useEffect } from "react";
import FieldPassCard from "./FieldPassCard";

type FieldPassModalProps = {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  tripName: string;
  destination: string;
  memberCount: number;
  needs?: string[];
  customNeeds?: string[];
  lodgingText?: string;
  onDownloaded?: () => void;
};

export default function FieldPassModal({
  isOpen,
  onClose,
  tripId,
  tripName,
  destination,
  memberCount,
  needs,
  customNeeds,
  lodgingText,
  onDownloaded,
}: FieldPassModalProps) {
  // ESC to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-neutral-950/70 backdrop-blur-sm animate-fade-in"
    >
      <div className="relative w-full max-w-xl my-auto">
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup"
          className="absolute -top-3.5 -right-2 z-10 flex size-9 cursor-pointer items-center justify-center rounded-full bg-surface border border-border text-text shadow-lg hover:bg-surface-muted transition-all active:scale-95"
        >
          <X className="size-4" />
        </button>

        <FieldPassCard
          tripId={tripId}
          tripName={tripName}
          destination={destination}
          memberCount={memberCount}
          needs={needs}
          customNeeds={customNeeds}
          lodgingText={lodgingText}
          onDownloaded={onDownloaded}
        />
      </div>
    </div>
  );
}
