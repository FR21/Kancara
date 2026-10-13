"use client";

import { ArrowRight, Check, UserRoundPlus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import PageBackdrop from "@/components/layout/PageBackdrop";
import ErrorAlert from "@/components/plan/ErrorAlert";
import MemberAvatar from "@/components/plan/MemberAvatar";
import { OUTLINE_BUTTON, PRIMARY_BUTTON } from "@/components/plan/styles";
import { type Invite, fetchInvite, joinAsSelf, joinTrip, readKeptLink, SafetyError } from "@/lib/api/safety";
import { fillTemplate } from "@/lib/plan-draft";
import { useMessages } from "@/lib/use-messages";
import { displayName } from "./help";

type Load = { status: "loading" } | { status: "ready"; invite: Invite } | { status: "invalid" } | { status: "failed" };

// What the group's link opens. Someone signed in joins by themselves, as a new member under their own name, or
// as a member the leader already added. Someone with no account picks their name and is taken to that member's
// own help page. The phone remembers that pick, so the same link leads straight there the next time, which is
// also what makes it the way back in for a member with no connection.
export default function JoinPage({ token }: { token: string }) {
  const router = useRouter();
  const text = useMessages("safety");
  const planText = useMessages("plan");
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [problem, setProblem] = useState("");
  const [joining, setJoining] = useState<string | null>(null);
  const [reloads, setReloads] = useState(0);

  useEffect(() => {
    // The pick kept on this phone is followed before anything is asked of the server: it has to work with no
    // connection, and after the leader has replaced the link.
    const kept = readKeptLink(token);
    if (kept) {
      router.replace(`/h/${kept}`);
      return;
    }
    const controller = new AbortController();
    fetchInvite(token, controller.signal).then(
      (invite) => setLoad({ status: "ready", invite }),
      (caught: unknown) => {
        if (controller.signal.aborted) return;
        setLoad({ status: caught instanceof SafetyError && caught.status === 404 ? "invalid" : "failed" });
      },
    );
    return () => controller.abort();
  }, [token, reloads, router]);

  const invite = load.status === "ready" ? load.invite : null;
  const helpHref = invite ? `/trips/${encodeURIComponent(invite.tripId)}/help` : "";
  const isMember = invite?.members.some((member) => member.mine) ?? false;
  const signInHref = `/login?redirect=${encodeURIComponent(`/join/${token}`)}`;

  const join = async (key: string, attempt: () => Promise<string | null | void>) => {
    setJoining(key);
    setProblem("");
    try {
      const ownLink = await attempt();
      router.push(ownLink ? `/h/${ownLink}` : helpHref);
    } catch (caught) {
      const taken = caught instanceof SafetyError && caught.status === 409;
      setProblem(taken ? (key === "self" ? text.join.full : text.who.taken) : text.join.failed);
      setJoining(null);
    }
  };

  return (
    <main className="relative isolate mx-auto w-full max-w-xl flex-1 px-4 pt-6 pb-16 sm:px-6 sm:pt-10">
      <PageBackdrop />
      <Image src="/images/logo/kancara_wordmark_logo.webp" alt="Kancara" width={866} height={288} loading="eager" className="mb-6 h-8 w-auto" />
      {load.status === "loading" && (
        <div role="status" className="space-y-4 motion-safe:animate-pulse">
          <span className="sr-only">{text.join.loading}</span>
          <div className="h-8 w-64 max-w-full rounded-full bg-surface-muted" />
          <div className="h-64 rounded-2xl border border-border bg-surface" />
        </div>
      )}
      {load.status === "invalid" && <p className="text-body text-pretty text-text-muted">{text.join.invalid}</p>}
      {load.status === "failed" && (
        <ErrorAlert
          message={text.join.error}
          retryLabel={text.retry}
          onRetry={() => {
            setLoad({ status: "loading" });
            setReloads((count) => count + 1);
          }}
        />
      )}

      {invite && (
        <div className="motion-safe:animate-message-in">
          <h1 className="text-h2 text-balance text-text sm:text-h1">{fillTemplate(text.join.title, { trip: invite.tripName })}</h1>
          {!invite.signedIn && (
            <p className="mt-2 text-body text-pretty text-text-muted">{invite.members.length > 0 ? text.join.leadOpen : text.join.emptyOpen}</p>
          )}

          {invite.signedIn && !isMember && (
            <div className="mt-6">
              <button
                type="button"
                disabled={joining !== null}
                onClick={() => join("self", () => joinAsSelf(token))}
                className={`${PRIMARY_BUTTON} h-14 w-full shadow-md shadow-primary/20`}
              >
                <UserRoundPlus className="size-5" aria-hidden="true" />
                {invite.viewerName ? fillTemplate(text.join.asSelf, { name: invite.viewerName }) : text.join.asAccount}
              </button>
              <p className="mt-2 text-center text-caption text-pretty text-text-muted">{text.join.asSelfHint}</p>
            </div>
          )}

          {invite.members.length > 0 && (
            <>
              {invite.signedIn && !isMember && <h2 className="mt-8 text-label text-text">{text.join.listed}</h2>}
              <ul className={`space-y-3 ${invite.signedIn && !isMember ? "mt-3" : "mt-8"}`}>
                {invite.members.map((member, index) => {
                  const name = displayName(member, invite.members, planText.ageGroups);
                  return (
                    <li key={member.id}>
                      <button
                        type="button"
                        disabled={member.taken || joining !== null}
                        aria-label={fillTemplate(invite.signedIn ? text.join.pick : text.join.pickOpen, { name })}
                        onClick={() => join(member.id, () => joinTrip(token, member.id))}
                        className={`group/pick flex min-h-16 w-full cursor-pointer items-center gap-4 rounded-2xl border px-4 py-3 text-left transition-[background-color,border-color,scale] duration-150 ease-out active:scale-[0.99] disabled:cursor-not-allowed ${
                          member.mine
                            ? "border-primary bg-primary-subtle"
                            : "border-border-strong bg-surface hover:border-primary hover:bg-primary-subtle disabled:opacity-40"
                        }`}
                      >
                        <MemberAvatar ageGroup={member.ageGroup} variant={index} className="size-10 shrink-0" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-label-lg text-pretty text-text">{name}</span>
                          {(member.mine || member.taken) && (
                            <span className="mt-1 block text-caption text-text-muted">{member.mine ? text.join.mine : text.join.taken}</span>
                          )}
                        </span>
                        {member.mine ? (
                          <Check className="size-5 shrink-0 text-primary" strokeWidth={3} aria-hidden="true" />
                        ) : (
                          <ArrowRight
                            className="size-5 shrink-0 text-text-muted transition-[translate,color] duration-200 ease-out group-hover/pick:translate-x-1 group-hover/pick:text-primary"
                            aria-hidden="true"
                          />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          {problem && (
            <p role="alert" className="mt-4 rounded-2xl bg-warning-subtle px-4 py-3 text-body-sm text-pretty text-on-warning-subtle">
              {problem}
            </p>
          )}
          {isMember && (
            <Link href={helpHref} className={`${PRIMARY_BUTTON} mt-8 w-full`}>
              {text.join.open}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          )}
          {!invite.signedIn && (
            <div className="mt-8">
              <p className="text-body-sm text-pretty text-text-muted">{text.join.haveAccount}</p>
              <Link href={signInHref} className={`${invite.members.length > 0 ? OUTLINE_BUTTON : PRIMARY_BUTTON} mt-3 w-full`}>
                {text.join.signIn}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
