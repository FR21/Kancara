"use client";

import { FileDown, ImageDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Checkbox from "@/components/ui/Checkbox";
import { FIELD_LABEL, INPUT, PRIMARY_BUTTON, buttonClass } from "@/components/ui/styles";
import { fillTemplate } from "@/lib/plan-draft";
import { CARD_HEIGHT, CARD_WIDTH, drawCard, saveCardImage, saveCardPdf } from "@/lib/safety/card";
import { MAX_PHONE_CHARS } from "@/lib/safety/contact";
import { helpLanguages } from "@/lib/safety/help-phrases";
import type { SafetyMember } from "@/lib/safety/safety-pack";
import { type HelpContext, nameIn } from "@/components/safety/help-context";
import Sheet from "@/components/ui/Sheet";

type CardSheetProps = {
  context: HelpContext;
  /** The member whose card is shown, or null while the sheet is closed. */
  member: SafetyMember | null;
  onClose: () => void;
};

// The card cannot be drawn without one number to call. It is asked for here, where it is missed, instead of
// sending the visitor off to find the field. It is kept as the leader's own number when the leader is the one
// typing, and as the trip's second number otherwise.
function CardNumber({ context }: { context: HelpContext }) {
  const { pack, text } = context;
  const copy = text.card;
  const [phone, setPhone] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "invalid" | "failed">("idle");
  if (!pack.canManage) return <p className="text-body text-pretty text-text">{copy.needLead}</p>;

  const viewerId = pack.viewerMemberId;
  const save = async () => {
    setState("saving");
    const outcome = await context.act(
      viewerId !== null && viewerId === pack.leadMemberId
        ? { type: "member", memberId: viewerId, phone, hasPhone: true }
        : { type: "secondaryPhone", phone },
    );
    setState(outcome === "done" ? "idle" : outcome === "invalid" ? "invalid" : "failed");
  };

  return (
    <div>
      <p className="text-body text-pretty text-text">{copy.needNumber}</p>
      <label htmlFor="card-number" className={`${FIELD_LABEL} mt-4 block`}>
        {copy.numberLabel}
      </label>
      <input
        id="card-number"
        type="tel"
        inputMode="tel"
        autoComplete="off"
        maxLength={MAX_PHONE_CHARS}
        value={phone}
        placeholder="+62 812 3456 7890"
        aria-describedby="card-number-hint"
        aria-invalid={state === "invalid"}
        onChange={(event) => {
          setPhone(event.target.value);
          setState("idle");
        }}
        className={`${INPUT} mt-2 tabular-nums`}
      />
      <p id="card-number-hint" role="status" className={`mt-2 text-caption text-pretty ${state === "idle" || state === "saving" ? "text-text-muted" : "text-error"}`}>
        {state === "invalid" ? text.member.phoneInvalid : state === "failed" ? (context.online ? text.failed : text.offlineOnly) : text.member.phoneHint}
      </p>
      <button type="button" disabled={phone.trim() === "" || state === "saving"} onClick={save} className={`${PRIMARY_BUTTON} mt-6 w-full`}>
        {text.save}
      </button>
    </div>
  );
}

// A member's meeting card: what they show a stranger when they are separated and carry no phone, or cannot use
// it. It is drawn on the phone, so it can be made, saved, and printed without a connection.
export default function CardSheet({ context, member, onClose }: CardSheetProps) {
  const { pack, text } = context;
  const copy = text.card;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawn, setDrawn] = useState<string | null>(null);
  const lead = pack.members.find((entry) => entry.id === pack.leadMemberId);
  // The leader's number leads the card. Until there is one, the trip's second number stands in for it.
  const leadPhone = lead?.phone ?? pack.secondaryPhone;
  const secondPhone = lead?.phone ? pack.secondaryPhone : null;
  const name = member ? nameIn(context, member) : "";
  const fileName = fillTemplate(copy.fileName, { name: name.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-") });
  const cardToken = member?.cardToken ?? "";
  const languages = helpLanguages(pack.countryCodes).join(",");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !leadPhone || cardToken === "") return;
    let cancelled = false;
    // The card is drawn once the page's own typefaces are in, or it would be set in a fallback face.
    document.fonts.ready.then(() => {
      if (cancelled) return;
      drawCard(canvas, {
        name,
        leadPhone,
        secondaryPhone: secondPhone,
        languages: helpLanguages(pack.countryCodes),
        url: `${window.location.origin}/f/${cardToken}`,
        title: copy.open,
      });
      setDrawn(cardToken);
    });
    return () => {
      cancelled = true;
    };
  }, [cardToken, name, leadPhone, secondPhone, pack.countryCodes, languages, copy.open]);

  const ready = drawn === cardToken && cardToken !== "";
  const markSaved = () => {
    if (member && !member.cardSavedAt) context.act({ type: "cardSaved", memberId: member.id, saved: true });
  };

  return (
    <Sheet
      open={member !== null}
      title={fillTemplate(copy.title, { name })}
      closeLabel={text.close}
      onClose={onClose}
      footer={
        member && leadPhone ? (
          <>
            <button
              type="button"
              disabled={!ready}
              onClick={async () => {
                if (canvasRef.current && (await saveCardImage(canvasRef.current, fileName))) markSaved();
              }}
              className={`${buttonClass("primary")} min-w-0 flex-1 whitespace-nowrap`}
            >
              <ImageDown className="size-4" aria-hidden="true" />
              {copy.savePng}
            </button>
            <button
              type="button"
              disabled={!ready}
              onClick={async () => {
                if (canvasRef.current && (await saveCardPdf(canvasRef.current, fileName))) markSaved();
              }}
              className={`${buttonClass("outline")} min-w-0 flex-1 whitespace-nowrap`}
            >
              <FileDown className="size-4" aria-hidden="true" />
              {copy.savePdf}
            </button>
          </>
        ) : undefined
      }
    >
      {member && !leadPhone && <CardNumber context={context} />}
      {member && leadPhone && (
        <>
          <div className="mx-auto w-full max-w-xs">
            {!ready && (
              <p role="status" className="sr-only">
                {copy.drawing}
              </p>
            )}
            <canvas
              ref={canvasRef}
              width={CARD_WIDTH}
              height={CARD_HEIGHT}
              role="img"
              aria-label={fillTemplate(copy.alt, { name })}
              className={`h-auto w-full rounded-lg border border-border ${ready ? "motion-safe:animate-pop-in" : "bg-surface-muted motion-safe:animate-pulse"}`}
            />
          </div>
          {/* Where to keep the card, and the box that says it was kept there: one group, under the card. */}
          <div className="text-center">
            <p className="text-body-sm text-pretty text-text-muted">{copy.tip}</p>
            <label className="mt-2 inline-flex min-h-11 cursor-pointer items-center gap-3 text-body-sm text-text">
              <Checkbox
                checked={member.cardSavedAt !== null}
                onChange={(saved) => context.act({ type: "cardSaved", memberId: member.id, saved })}
              />
              {copy.saved}
            </label>
          </div>
        </>
      )}
    </Sheet>
  );
}
