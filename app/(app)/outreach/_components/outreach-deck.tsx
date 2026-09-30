"use client";

import { useMemo, useState, useTransition } from "react";
import { HudPanel } from "@/components/ui/hud-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/forms";
import { logOutreachOutcome, type OutreachOutcome } from "../actions";
import {
  openerForCategory,
  voicemailFor,
  smsFor,
  smsHref,
  telHref,
  OBJECTION_HANDLERS,
} from "@/lib/outreach-scripts";
import { TargetRadar } from "./target-radar";

export type DeckTarget = {
  id: string;
  company: string;
  firstName: string;
  phone: string;
  town: string;
  category: string;
  notes: string;
  worked: boolean;
};

type ScriptTab = "opener" | "voicemail" | "objections";

const OUTCOMES: { key: OutreachOutcome; label: string; tone: string }[] = [
  { key: "connected", label: "Connected", tone: "bg-hud-green text-black" },
  { key: "voicemail", label: "Voicemail", tone: "bg-hud-amber text-black" },
  { key: "no-answer", label: "No answer", tone: "bg-hud-violet text-white" },
  {
    key: "not-interested",
    label: "Not interested",
    tone: "bg-hud-red/20 text-hud-red border border-hud-red/40",
  },
];

export function OutreachDeck({ initialTargets }: { initialTargets: DeckTarget[] }) {
  const [queue, setQueue] = useState<string[]>(
    initialTargets.filter((t) => !t.worked).map((t) => t.id),
  );
  const [workedCount, setWorkedCount] = useState(
    initialTargets.filter((t) => t.worked).length,
  );
  const [tab, setTab] = useState<ScriptTab>("opener");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [justLogged, setJustLogged] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const byId = useMemo(
    () => new Map(initialTargets.map((t) => [t.id, t])),
    [initialTargets],
  );
  const total = initialTargets.length;
  const current = queue.length > 0 ? byId.get(queue[0]) ?? null : null;

  const progress = total === 0 ? 0 : Math.round((workedCount / total) * 100);

  function advance(id: string) {
    setQueue((q) => q.filter((x) => x !== id));
    setWorkedCount((c) => c + 1);
    setNote("");
    setTab("opener");
  }

  function handleOutcome(outcome: OutreachOutcome) {
    if (!current || isPending) return;
    setError(null);
    setJustLogged(null);
    const id = current.id;
    startTransition(async () => {
      const res = await logOutreachOutcome({
        contactId: id,
        outcome,
        note: note.trim() || undefined,
      });
      if (res.ok) {
        setJustLogged(id);
        // Brief beat so the confirmation registers, then move to next target.
        setTimeout(() => advance(id), 650);
      } else {
        setError(res.error);
      }
    });
  }

  function jumpTo(id: string) {
    setQueue((q) => [id, ...q.filter((x) => x !== id)]);
    setNote("");
    setTab("opener");
    setError(null);
  }

  return (
    <div className="space-y-6">
      {/* ── Mission header ─────────────────────────────────── */}
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-hud-muted">
          Outreach deck
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-hud-ink">
          Today&apos;s mission
        </h1>
        <div className="mt-3 flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-hud-line/40">
            <div
              className="h-full rounded-full bg-[var(--hud-accent)] transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="font-mono text-sm tabular-nums text-hud-muted">
            {workedCount}/{total} · {progress}%
          </p>
        </div>
      </div>

      {error ? (
        <p className="rounded-sm border border-hud-red/40 bg-hud-red/10 px-3 py-2 text-sm text-hud-red">
          {error}
        </p>
      ) : null}

      {current ? (
        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          {/* radar */}
          <HudPanel title="Target scope" subtitle="Tap a blip to jump to it">
            <TargetRadar
              targets={initialTargets.map((t) => ({
                id: t.id,
                company: t.company,
                worked: t.worked || !queue.includes(t.id),
              }))}
              activeId={current.id}
              onSelect={jumpTo}
            />
          </HudPanel>

          {/* current target */}
          <HudPanel
            title="Active target"
            subtitle={`${queue.length} remaining in the queue`}
            actions={
              queue.length > 1 ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setQueue((q) => (q.length > 1 ? [...q.slice(1), q[0]] : q))
                  }
                >
                  Skip →
                </Button>
              ) : null
            }
          >
            <div className="space-y-5">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-semibold text-hud-ink">
                    {current.company}
                  </h2>
                  <Badge tone="amber">hot</Badge>
                </div>
                <p className="mt-1 text-sm text-hud-muted">
                  {current.firstName || "—"}
                  {current.town ? ` · ${current.town}` : ""}
                  {current.category ? ` · ${current.category}` : ""}
                </p>
                {current.notes ? (
                  <p className="mt-2 border-l-2 border-[var(--hud-accent)]/50 pl-3 text-sm text-hud-ink/90">
                    {current.notes.split("\n")[0]}
                  </p>
                ) : null}
              </div>

              {/* call / text */}
              {current.phone ? (
                <div className="grid grid-cols-2 gap-3">
                  <a
                    href={telHref(current.phone)}
                    className="flex items-center justify-center gap-2 rounded-sm bg-hud-green px-4 py-4 text-lg font-bold text-black transition-transform active:scale-95"
                  >
                    <span aria-hidden>📞</span> CALL
                  </a>
                  <a
                    href={smsHref(current.phone, smsFor(current.firstName))}
                    className="flex items-center justify-center gap-2 rounded-sm bg-[var(--hud-accent)] px-4 py-4 text-lg font-bold text-black transition-transform active:scale-95"
                  >
                    <span aria-hidden>💬</span> TEXT
                  </a>
                </div>
              ) : (
                <p className="text-sm text-hud-muted">
                  No phone number on file for this target.
                </p>
              )}
              {current.phone ? (
                <p className="font-mono text-sm tabular-nums text-hud-muted">
                  {current.phone}
                </p>
              ) : null}

              {/* scripts */}
              <div>
                <div className="flex gap-1 border-b border-hud-line">
                  {(
                    [
                      ["opener", "Opener"],
                      ["voicemail", "Voicemail"],
                      ["objections", "Objections"],
                    ] as [ScriptTab, string][]
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setTab(key)}
                      className={`px-3 py-2 text-sm font-medium ${
                        tab === key
                          ? "border-b-2 border-[var(--hud-accent)] text-[var(--hud-accent)]"
                          : "text-hud-muted hover:text-hud-ink"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="mt-3 rounded-sm border border-hud-line bg-hud-panel2 p-4">
                  {tab === "opener" ? (
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-hud-ink">
                      {openerForCategory(current.category, current.firstName)}
                    </p>
                  ) : tab === "voicemail" ? (
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-hud-ink">
                      {voicemailFor(current.firstName)}
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {OBJECTION_HANDLERS.map((o) => (
                        <div key={o.title}>
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-hud-amber">
                            {o.title}
                          </p>
                          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-hud-ink">
                            {o.script}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* outcome */}
              <div>
                <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-hud-muted">
                  Log outcome
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {OUTCOMES.map((o) => (
                    <button
                      key={o.key}
                      type="button"
                      disabled={isPending}
                      onClick={() => handleOutcome(o.key)}
                      className={`rounded-sm px-3 py-2.5 text-sm font-semibold transition-transform active:scale-95 disabled:opacity-50 ${o.tone}`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add a note (optional) — e.g. “call back Thursday”"
                  className="mt-2 w-full rounded-sm border border-hud-line bg-hud-bg px-3 py-2 text-sm text-hud-ink placeholder:text-hud-muted/60"
                />
                {justLogged === current.id ? (
                  <p className="mt-2 text-sm font-medium text-hud-green">
                    ✓ Logged — lining up your next target…
                  </p>
                ) : null}
              </div>
            </div>
          </HudPanel>
        </div>
      ) : (
        <HudPanel title="Deck clear" subtitle="All hot targets worked">
          <div className="py-8 text-center">
            <p className="text-4xl">🎯</p>
            <p className="mt-3 text-lg font-semibold text-hud-ink">
              Mission complete — {workedCount} of {total} hot targets worked.
            </p>
            <p className="mt-1 text-sm text-hud-muted">
              Follow-ups were scheduled automatically. Check Tasks for what&apos;s
              next.
            </p>
          </div>
        </HudPanel>
      )}
    </div>
  );
}
