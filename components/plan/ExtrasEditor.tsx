"use client";

import { Check, Plus, X } from "lucide-react";
import { type Dispatch, useState } from "react";
import type { Messages } from "@/lib/messages";
import {
  type ExtraTextKey,
  type PlanDraft,
  type PlanDraftAction,
  fillTemplate,
  MAX_NOTES_CHARS,
  sameText,
  TRANSPORT_KEYS,
} from "@/lib/plan-draft";
import CustomAdd, { CustomChip } from "@/components/plan/CustomAdd";
import IconButton from "@/components/ui/IconButton";
import { buttonClass, choiceClass, FIELD_LABEL, INPUT, TEXTAREA } from "@/components/ui/styles";

type ExtrasEditorProps = {
  draft: PlanDraft;
  dispatch: Dispatch<PlanDraftAction>;
  text: Messages["plan"];
};

type GroupKey = "arrival" | "daily" | "lodging" | "mustVisit" | "avoid" | "occasion";
type Group = { key: GroupKey; fields: ExtraTextKey[]; kind: "time" | "text" };
type PlaceholderKey = "lodgingPlaceholder" | "mustVisitPlaceholder" | "avoidPlaceholder" | "occasionPlaceholder";

const GROUPS: Group[] = [
  { key: "arrival", fields: ["arrivalTime", "departureTime"], kind: "time" },
  { key: "daily", fields: ["dayStart", "dayEnd"], kind: "time" },
  { key: "lodging", fields: ["lodging"], kind: "text" },
  { key: "mustVisit", fields: ["mustVisit"], kind: "text" },
  { key: "avoid", fields: ["avoid"], kind: "text" },
  { key: "occasion", fields: ["occasion"], kind: "text" },
];

const PLACEHOLDERS: Partial<Record<ExtraTextKey, PlaceholderKey>> = {
  lodging: "lodgingPlaceholder",
  mustVisit: "mustVisitPlaceholder",
  avoid: "avoidPlaceholder",
  occasion: "occasionPlaceholder",
};

export default function ExtrasEditor({ draft, dispatch, text }: ExtrasEditorProps) {
  const { extras } = draft;
  const [opened, setOpened] = useState<GroupKey[]>([]);

  const isOpen = (group: Group) => opened.includes(group.key) || group.fields.some((field) => extras[field] !== "");
  const closedGroups = GROUPS.filter((group) => !isOpen(group));
  const openGroups = GROUPS.filter(isOpen);

  const removeGroup = (group: Group) => {
    group.fields.forEach((field) => dispatch({ type: "setExtraText", key: field, value: "" }));
    setOpened((current) => current.filter((key) => key !== group.key));
  };

  // Typing the name of a listed choice picks that choice instead of adding a twin of it.
  const addTransport = (value: string) => {
    const listed = TRANSPORT_KEYS.find((transport) => sameText(text.transport[transport], value));
    if (!listed) dispatch({ type: "addCustomTransport", value });
    else if (!extras.transport.includes(listed)) dispatch({ type: "toggleTransport", value: listed });
  };

  return (
    <div className="space-y-6">
      <fieldset className="min-w-0">
        <legend className={FIELD_LABEL}>{text.pass.transportLegend}</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {TRANSPORT_KEYS.map((transport) => {
            const selected = extras.transport.includes(transport);
            return (
              <button
                key={transport}
                type="button"
                aria-pressed={selected}
                onClick={() => dispatch({ type: "toggleTransport", value: transport })}
                className={choiceClass(selected)}
              >
                {selected && <Check className="size-4" strokeWidth={3} aria-hidden="true" />}
                {text.transport[transport]}
              </button>
            );
          })}
          {extras.customTransport.map((transport) => (
            <CustomChip
              key={transport}
              label={transport}
              removeLabel={fillTemplate(text.custom.remove, { name: transport })}
              onRemove={() => dispatch({ type: "removeCustomTransport", value: transport })}
            />
          ))}
        </div>
        <div className="mt-4">
          <CustomAdd
            id="extra-custom-transport"
            label={text.custom.transport}
            placeholder={text.custom.transportPlaceholder}
            count={extras.customTransport.length}
            text={text.custom}
            onAdd={addTransport}
          />
        </div>
      </fieldset>

      {openGroups.map((group) => {
        const title = text.extrasAdd[group.key];
        const single = group.fields.length === 1;
        return (
          <div key={group.key} className="motion-safe:animate-message-in">
            {/* The title row carries the way out: the field's own label when the group is one field. */}
            <div className="-my-2 flex items-center justify-between gap-2">
              {single ? (
                <label htmlFor={`extra-${group.fields[0]}`} className={FIELD_LABEL}>
                  {text.pass[group.fields[0]]}
                </label>
              ) : (
                <p className={FIELD_LABEL}>{title}</p>
              )}
              <IconButton label={fillTemplate(text.custom.remove, { name: title })} onClick={() => removeGroup(group)}>
                <X className="size-5" aria-hidden="true" />
              </IconButton>
            </div>
            <div className={group.kind === "time" ? "mt-2 grid grid-cols-2 gap-4" : "mt-2"}>
              {group.fields.map((field) => {
                const placeholderKey = PLACEHOLDERS[field];
                return (
                  <div key={field}>
                    {!single && (
                      <label htmlFor={`extra-${field}`} className={`${FIELD_LABEL} mb-2 block`}>
                        {text.pass[field]}
                      </label>
                    )}
                    <input
                      id={`extra-${field}`}
                      type={group.kind}
                      autoComplete="off"
                      value={extras[field]}
                      placeholder={placeholderKey ? text.pass[placeholderKey] : undefined}
                      onChange={(event) => dispatch({ type: "setExtraText", key: field, value: event.target.value })}
                      className={INPUT}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {closedGroups.length > 0 && (
        <fieldset>
          <legend className={FIELD_LABEL}>{text.extrasAdd.legend}</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {closedGroups.map((group) => (
              <button
                key={group.key}
                type="button"
                onClick={() => setOpened((current) => [...current, group.key])}
                className={`${buttonClass("outline", "small")} border-dashed`}
              >
                <Plus className="size-4 text-primary" aria-hidden="true" />
                {text.extrasAdd[group.key]}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <div>
        <label htmlFor="extra-notes" className={FIELD_LABEL}>
          {text.extrasAdd.notes}
        </label>
        <textarea
          id="extra-notes"
          rows={3}
          maxLength={MAX_NOTES_CHARS}
          value={draft.notes}
          placeholder={text.extrasAdd.notesPlaceholder}
          onChange={(event) => dispatch({ type: "setNotes", value: event.target.value })}
          className={`${TEXTAREA} mt-2 block resize-y`}
        />
        <p className="mt-2 text-caption text-text-muted">{text.extrasAdd.notesHint}</p>
      </div>
    </div>
  );
}
