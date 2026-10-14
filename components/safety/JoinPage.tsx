"use client";

import { ArrowRight, Check, TriangleAlert, UserRoundPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type CSSProperties, useEffect, useState } from "react";
import PageHeader from "@/components/layout/PageHeader";
import ErrorAlert from "@/components/ui/ErrorAlert";
import MemberAvatar from "@/components/ui/MemberAvatar";
import { OUTLINE_BUTTON, PRIMARY_BUTTON, buttonClass } from "@/components/ui/styles";
import { type Invite, fetchInvite, joinAsSelf, joinTrip, readKeptLink, SafetyError } from "@/lib/client/safety";
import { fillTemplate } from "@/lib/plan-draft";
import { useMessages } from "@/lib/use-messages";
import { displayName } from "@/components/safety/help-context";
import StandaloneShell from "./StandaloneShell";

type Load = { status: "loading" } | { status: "ready"; invite: Invite } | { status: "invalid" } | { status: "failed" };

/** The names stand in one list frame, split by hairlines, rather than each in a box of its own. */
const LIST_FRAME = "divide-y divide-border overflow-clip rounded-surface border border-border bg-surface";
/** One name to pick: a row reaching the frame's edges, the whole of it one target. */
const PICK =
  "group/pick flex min-h-16 w-full cursor-pointer items-center gap-4 px-surface py-3 text-left -outline-offset-2 transition-[background-color,scale,opacity] duration-150 ease-out active:scale-[0.99] disabled:cursor-not-allowed";

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
  const offersSelf = invite !== null && invite.signedIn && !isMember;

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

  const lead = () => {
    if (!invite || invite.signedIn) return undefined;
    return invite.members.length > 0 ? text.join.leadOpen : text.join.emptyOpen;
  };

  return (
    <StandaloneShell width="narrow">
      {load.status === "loading" && (
        <div role="status">
          <span className="sr-only">{text.join.loading}</span>
          <div aria-hidden="true" className="h-9 w-64 max-w-full rounded-lg bg-surface-muted motion-safe:animate-pulse" />
          <div aria-hidden="true" className={`mt-8 ${LIST_FRAME} motion-safe:animate-pulse`}>
            {[0, 1, 2].map((row) => (
              <div key={row} className="flex min-h-16 items-center gap-4 px-surface py-3">
                <div className="size-10 shrink-0 rounded-full bg-surface-muted" />
                <div className="h-5 w-40 max-w-full rounded-lg bg-surface-muted" />
              </div>
            ))}
          </div>
        </div>
      )}
      {load.status === "invalid" && <p className="text-body text-pretty text-text-muted motion-safe:animate-message-in">{text.join.invalid}</p>}
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
        <>
          <PageHeader title={fillTemplate(text.join.title, { trip: invite.tripName })} lead={lead()} />

          <div className="motion-safe:animate-message-in">
            {offersSelf && (
              <div className="mt-8">
                <button
                  type="button"
                  disabled={joining !== null}
                  onClick={() => join("self", () => joinAsSelf(token))}
                  className={`${buttonClass("primary", "large")} w-full`}
                >
                  <UserRoundPlus className="size-5" aria-hidden="true" />
                  {invite.viewerName ? fillTemplate(text.join.asSelf, { name: invite.viewerName }) : text.join.asAccount}
                </button>
                <p className="mt-2 text-center text-caption text-pretty text-text-muted">{text.join.asSelfHint}</p>
              </div>
            )}

            {invite.members.length > 0 && (
              <section className="mt-8">
                {offersSelf && <h2 className="mb-4 text-h3 text-text">{text.join.listed}</h2>}
                <ul className={LIST_FRAME}>
                  {invite.members.map((member, index) => {
                    const name = displayName(member, invite.members, planText.ageGroups);
                    return (
                      <li key={member.id} style={{ "--item-index": index } as CSSProperties} className="motion-safe:animate-list-in">
                        <button
                          type="button"
                          disabled={member.taken || joining !== null}
                          aria-label={fillTemplate(invite.signedIn ? text.join.pick : text.join.pickOpen, { name })}
                          onClick={() => join(member.id, () => joinTrip(token, member.id))}
                          className={`${PICK} ${
                            member.mine ? "bg-primary-subtle" : "hover:bg-primary-subtle disabled:opacity-40 disabled:hover:bg-transparent"
                          }`}
                        >
                          <MemberAvatar ageGroup={member.ageGroup} variant={index} className="size-10 shrink-0" />
                          <span className="min-w-0 flex-1">
                            <span className="block text-label-lg text-pretty wrap-anywhere text-text">{name}</span>
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
              </section>
            )}

            {problem && (
              <p role="alert" className="mt-4 flex items-start gap-3 rounded-lg bg-warning-subtle px-4 py-3 text-body-sm text-pretty text-on-warning-subtle motion-safe:animate-message-in">
                <TriangleAlert className="size-5 shrink-0" aria-hidden="true" />
                {problem}
              </p>
            )}
            {isMember && (
              <Link href={helpHref} className={`group ${PRIMARY_BUTTON} mt-8 w-full`}>
                {text.join.open}
                <ArrowRight className="size-4 transition-[translate] duration-200 ease-out group-hover:translate-x-1" aria-hidden="true" />
              </Link>
            )}
            {!invite.signedIn && (
              <div className="mt-8 border-t border-border pt-8">
                <p className="text-body-sm text-pretty text-text-muted">{text.join.haveAccount}</p>
                <Link href={signInHref} className={`group ${invite.members.length > 0 ? OUTLINE_BUTTON : PRIMARY_BUTTON} mt-4 w-full`}>
                  {text.join.signIn}
                  <ArrowRight className="size-4 transition-[translate] duration-200 ease-out group-hover:translate-x-1" aria-hidden="true" />
                </Link>
              </div>
            )}
          </div>
        </>
      )}
    </StandaloneShell>
  );
}
