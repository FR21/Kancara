"use client";

import Sheet from "@/components/ui/Sheet";
import { useMessages } from "@/lib/use-messages";
import FieldPassBody from "./FieldPassBody";

type FieldPassSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  destination: string;
};

// The trip's field pass, opened from the trip and from the tools used on the road. A sheet from the bottom edge
// on a phone, a centred dialog from 640px.
export default function FieldPassSheet({ isOpen, onClose, tripId, destination }: FieldPassSheetProps) {
  const text = useMessages("fieldPass");
  return (
    <Sheet open={isOpen} title={text.title} closeLabel={text.close} onClose={onClose}>
      <FieldPassBody tripId={tripId} destination={destination} />
    </Sheet>
  );
}
