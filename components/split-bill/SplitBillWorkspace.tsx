"use client";

import { FilePlus2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import Notice, { type NoticeMessage } from "@/components/layout/Notice";
import PageHeader from "@/components/layout/PageHeader";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import ErrorAlert from "@/components/ui/ErrorAlert";
import Stepper, { type StepperStep } from "@/components/ui/Stepper";
import { buttonClass } from "@/components/ui/styles";
import { splitBills } from "@/lib/client/split-bill";
import { fillTemplate } from "@/lib/plan-draft";
import { type BillExpense, type SettledTransfer, type SplitBill, emptyBill, hasContent } from "@/lib/split-bill/bill";
import { addMembers, memberNameTaken, newId, paidExpenseCount, removeExpense, removeMember, saveExpense, setSettled } from "@/lib/split-bill/edit";
import { formatBillDate, formatRupiah } from "@/lib/split-bill/format";
import { forgetLegacyBill, readLegacyBill } from "@/lib/split-bill/legacy-draft";
import { settleUp } from "@/lib/split-bill/settle-up";
import { plural } from "@/lib/trips/format";
import { useLocale } from "@/lib/use-locale";
import { useMessages } from "@/lib/use-messages";
import { useSavedProfiles } from "@/lib/use-saved-profiles";
import { billSummaryText } from "./bill-summary-text";
import ExpensesStage from "./ExpensesStage";
import MembersStage from "./MembersStage";
import { saveReceiptImage } from "./receipt-image";
import ResultsStage from "./ResultsStage";
import SavedMembersSheet, { type SavedProfileChoice } from "./SavedMembersSheet";
import { useBillAutosave } from "./use-bill-autosave";

type Stage = "members" | "expenses" | "results";

type SplitBillWorkspaceProps = {
  initialBill: SplitBill;
  /** Whether the bill is already in the account, rather than a fresh one not saved yet. */
  stored: boolean;
};

function stageFor(bill: SplitBill): Stage {
  if (bill.expenses.length > 0) return "results";
  if (bill.members.length > 0) return "expenses";
  return "members";
}

async function copyText(value: string): Promise<boolean> {
  if (!navigator.clipboard?.writeText) return false;
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

// The "saved" notice is a glance, not news: shorter than the notices about something the person did.
const SAVED_NOTICE_MS = 2500;

export default function SplitBillWorkspace({ initialBill, stored }: SplitBillWorkspaceProps) {
  const text = useMessages("splitBill");
  const locale = useLocale();
  const [bill, setBill] = useState(initialBill);
  const [stage, setStage] = useState<Stage>(() => stageFor(initialBill));
  const [notice, setNotice] = useState<NoticeMessage | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null);
  const [newBillOpen, setNewBillOpen] = useState(false);
  const [newBillPending, setNewBillPending] = useState(false);
  const [newBillError, setNewBillError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const autosave = useBillAutosave(bill, stored);
  const { enqueue, markSaved } = autosave;
  const { profiles } = useSavedProfiles();
  const summary = useMemo(() => settleUp(bill), [bill]);
  const date = formatBillDate(locale);

  const billRef = useRef(bill);
  const noticeCountRef = useRef(0);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const stageMovedRef = useRef(false);

  useEffect(() => {
    billRef.current = bill;
  });

  const notify = (tone: NoticeMessage["tone"], message: string) => {
    noticeCountRef.current += 1;
    setNotice({ id: noticeCountRef.current, tone, message });
  };

  // A bill kept in this browser before bills were saved to the account is moved there once, when the account has
  // none yet. The copy in the browser is removed only after the account has it.
  const legacyMovedText = text.notice.legacyMoved;
  useEffect(() => {
    if (stored) return;
    const timer = setTimeout(() => {
      const legacy = readLegacyBill(initialBill.id);
      if (!legacy) return;
      enqueue(() => splitBills.save(legacy)).then(
        () => {
          forgetLegacyBill();
          if (hasContent(billRef.current)) return;
          markSaved(legacy, true);
          setBill(legacy);
          setStage(stageFor(legacy));
          noticeCountRef.current += 1;
          setNotice({ id: noticeCountRef.current, tone: "success", message: legacyMovedText });
        },
        () => undefined,
      );
    }, 0);
    return () => clearTimeout(timer);
  }, [stored, initialBill.id, enqueue, markSaved, legacyMovedText]);

  // A save that lands after a change says so briefly. It never covers a notice already showing, such as "2 people
  // added", which the same change has just raised.
  const savedText = text.save.saved;
  const lastStatusRef = useRef(autosave.status);
  useEffect(() => {
    const was = lastStatusRef.current;
    lastStatusRef.current = autosave.status;
    if (was !== "pending" || autosave.status !== "saved") return;
    noticeCountRef.current += 1;
    const saved: NoticeMessage = { id: noticeCountRef.current, tone: "success", message: savedText, duration: SAVED_NOTICE_MS };
    setNotice((current) => current ?? saved);
  }, [autosave.status, savedText]);

  // After moving to another step, its heading takes the focus so a screen reader starts there.
  useEffect(() => {
    if (!stageMovedRef.current) return;
    topRef.current?.scrollIntoView({ block: "start" });
    headingRef.current?.focus({ preventScroll: true });
  }, [stage]);

  const goTo = (next: Stage) => {
    stageMovedRef.current = true;
    setStage(next);
  };

  const steps: StepperStep[] = [
    { key: "members", label: text.stages.members, done: bill.members.length > 0, current: stage === "members", onSelect: () => goTo("members") },
    {
      key: "expenses",
      label: text.stages.expenses,
      done: bill.expenses.length > 0,
      current: stage === "expenses",
      onSelect: bill.members.length > 0 ? () => goTo("expenses") : null,
    },
    {
      key: "results",
      label: text.stages.results,
      done: bill.expenses.length > 0 && summary.transfers.length === bill.settled.length,
      current: stage === "results",
      onSelect: bill.expenses.length > 0 ? () => goTo("results") : null,
    },
  ];

  const profileChoices: SavedProfileChoice[] = useMemo(() => {
    const seen = new Set<string>();
    return profiles.flatMap((profile) => {
      const name = profile.name.trim();
      if (name === "" || seen.has(name.toLocaleLowerCase())) return [];
      seen.add(name.toLocaleLowerCase());
      return [{ id: profile.id, name, relationship: profile.relationship, ageGroup: profile.ageGroup, added: memberNameTaken(bill, name) }];
    });
  }, [profiles, bill]);

  const addNames = (names: string[]) => {
    const result = addMembers(bill, names);
    setBill(result.bill);
    return result.added;
  };

  const openPicker = () => {
    setPicked(profileChoices.filter((choice) => !choice.added).map((choice) => choice.id));
    setPickerOpen(true);
  };

  const confirmPicked = () => {
    const names = profileChoices.filter((choice) => picked.includes(choice.id)).map((choice) => choice.name);
    const added = addNames(names);
    setPickerOpen(false);
    if (added > 0) notify("success", plural(text.notice.membersAdded, added, locale));
  };

  const requestRemoveMember = (memberId: string) => {
    if (paidExpenseCount(bill, memberId) > 0) setMemberToRemove(memberId);
    else setBill(removeMember(bill, memberId));
  };

  const memberName = bill.members.find((member) => member.id === memberToRemove)?.name ?? "";

  const copySummary = async () => {
    const copied = await copyText(billSummaryText(bill, summary, date, text, locale));
    notify(copied ? "success" : "error", copied ? text.notice.summaryCopied : text.notice.copyFailed);
  };

  const copyReminder = async (transfer: SettledTransfer) => {
    const nameOf = (id: string) => bill.members.find((member) => member.id === id)?.name ?? "";
    const message = fillTemplate(text.results.reminder, {
      debtor: nameOf(transfer.fromMemberId),
      creditor: nameOf(transfer.toMemberId),
      amount: formatRupiah(transfer.amount, locale),
    });
    const copied = await copyText(message);
    notify(
      copied ? "success" : "error",
      copied ? fillTemplate(text.notice.reminderCopied, { name: nameOf(transfer.fromMemberId) }) : text.notice.copyFailed,
    );
  };

  const download = async () => {
    setDownloading(true);
    try {
      if (!(await saveReceiptImage({ bill, summary, date, text, locale }))) notify("error", text.notice.downloadFailed);
    } catch {
      notify("error", text.notice.downloadFailed);
    } finally {
      setDownloading(false);
    }
  };

  const startNewBill = async () => {
    setNewBillPending(true);
    setNewBillError(null);
    // The bill is about to go, so a save of it still waiting must not bring it back after the delete.
    markSaved(bill, true);
    try {
      const oldId = bill.id;
      await enqueue(() => splitBills.remove(oldId));
      const fresh = emptyBill(newId());
      markSaved(fresh, false);
      setBill(fresh);
      setNewBillOpen(false);
      goTo("members");
      notify("success", text.notice.newBillReady);
    } catch {
      setNewBillError(text.newBill.failed);
    } finally {
      setNewBillPending(false);
    }
  };

  return (
    <div ref={topRef} className="flex scroll-mt-28 flex-col gap-8">
      <Notice notice={notice} dismissLabel={text.notice.dismiss} onDismiss={() => setNotice(null)} />

      <PageHeader
        title={text.title}
        lead={text.subtitle}
        actions={
          hasContent(bill) && (
            <button
              type="button"
              onClick={() => {
                setNewBillError(null);
                setNewBillOpen(true);
              }}
              className={buttonClass("outline", "small")}
            >
              <FilePlus2 className="size-4" aria-hidden="true" />
              {text.newBill.action}
            </button>
          )
        }
      />

      {autosave.status === "failed" && (
        <div className="motion-safe:animate-message-in">
          <ErrorAlert message={text.save.failed} retryLabel={text.save.retry} onRetry={autosave.retry} />
        </div>
      )}
      {autosave.status === "conflict" && (
        <div className="motion-safe:animate-message-in">
          <ErrorAlert message={text.save.conflict} retryLabel={text.save.reload} onRetry={() => window.location.reload()} />
        </div>
      )}

      <Stepper steps={steps} text={text.stages} />

      {stage === "members" && (
        <MembersStage
          bill={bill}
          text={text.members}
          locale={locale}
          headingRef={headingRef}
          onAdd={(name) => addNames([name])}
          onRemove={requestRemoveMember}
          onOpenSaved={openPicker}
          onNext={() => goTo("expenses")}
        />
      )}
      {stage === "expenses" && (
        <ExpensesStage
          bill={bill}
          text={text.expenses}
          categories={text.categories}
          locale={locale}
          headingRef={headingRef}
          onSave={(expense: BillExpense) => setBill(saveExpense(bill, expense))}
          onRemove={(expenseId) => setBill(removeExpense(bill, expenseId))}
          onBack={() => goTo("members")}
          onNext={() => goTo("results")}
        />
      )}
      {stage === "results" && (
        <ResultsStage
          bill={bill}
          summary={summary}
          text={text}
          locale={locale}
          headingRef={headingRef}
          downloading={downloading}
          onDownload={download}
          onCopySummary={copySummary}
          onToggleSettled={(transfers, paid) => setBill(setSettled(bill, transfers, paid))}
          onCopyReminder={copyReminder}
          onBack={() => goTo("expenses")}
        />
      )}

      <SavedMembersSheet
        open={pickerOpen}
        profiles={profileChoices}
        selected={picked}
        text={text.picker}
        locale={locale}
        onToggle={(id, checked) => setPicked((current) => (checked ? [...current, id] : current.filter((entry) => entry !== id)))}
        onToggleAll={() => {
          const pickable = profileChoices.filter((choice) => !choice.added).map((choice) => choice.id);
          setPicked((current) => (pickable.every((id) => current.includes(id)) ? [] : pickable));
        }}
        onConfirm={confirmPicked}
        onClose={() => setPickerOpen(false)}
      />

      <ConfirmDialog
        open={memberToRemove !== null}
        title={fillTemplate(text.members.removeTitle, { name: memberName })}
        body={fillTemplate(plural(text.members.removeBody, memberToRemove ? paidExpenseCount(bill, memberToRemove) : 0, locale), { name: memberName })}
        cancelLabel={text.members.cancel}
        confirmLabel={text.members.removeConfirm}
        pendingLabel={text.members.removePending}
        pending={false}
        onCancel={() => setMemberToRemove(null)}
        onConfirm={() => {
          if (memberToRemove) setBill(removeMember(bill, memberToRemove));
          setMemberToRemove(null);
        }}
      />

      <ConfirmDialog
        open={newBillOpen}
        title={text.newBill.title}
        body={text.newBill.body}
        cancelLabel={text.newBill.cancel}
        confirmLabel={text.newBill.confirm}
        pendingLabel={text.newBill.pending}
        pending={newBillPending}
        error={newBillError}
        onCancel={() => {
          if (!newBillPending) setNewBillOpen(false);
        }}
        onConfirm={startNewBill}
      />
      <Notice notice={notice} dismissLabel={text.notice.dismiss} onDismiss={() => setNotice(null)} />
    </div>
  );
}
