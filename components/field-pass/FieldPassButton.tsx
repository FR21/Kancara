"use client";

import { Compass } from "lucide-react";
import { useState } from "react";
import { buttonClass } from "@/components/ui/styles";
import { useMessages } from "@/lib/use-messages";
import FieldPassSheet from "./FieldPassSheet";

type FieldPassButtonProps = { tripId: string; destination: string };

// The way into the field pass from a page used on the road (the menu scanner, the translator).
export default function FieldPassButton({ tripId, destination }: FieldPassButtonProps) {
  const text = useMessages("fieldPass");
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={buttonClass("outline", "small")}>
        <Compass className="size-4 text-primary" aria-hidden="true" />
        {text.open}
      </button>
      <FieldPassSheet isOpen={open} onClose={() => setOpen(false)} tripId={tripId} destination={destination} />
    </>
  );
}
