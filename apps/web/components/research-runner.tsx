"use client";

import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import type { AgentRunRow, ChassisSeedRow } from "@/lib/api";

type ResearchRunnerProps = {
  knownSeeds: ChassisSeedRow[];
  initialChassis?: string;
};

export function ResearchRunner({ knownSeeds, initialChassis = "" }: ResearchRunnerProps) {
  const router = useRouter();
  const [chassisNumber, setChassisNumber] = useState(initialChassis);
  const [run, setRun] = useState<AgentRunRow | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const redirectedRef = useRef(false);

  const suggestedSeeds = useMemo(
    () =>
      [...knownSeeds]
        .sort((left, right) => (right.dark_pct_est ?? -1) - (left.dark_pct_est ?? -1))
        .slice(0, 9),
    [knownSeeds]
  );

  const provenanceHref =
    run == null
      ? null
      : ((run.car_id ? `/cars/${run.car_id}/provenance` : `/research/runs/${run.id}`) as Route);

  useEffect(() => {
    if (!runId || !run || run.status === "failed" || run.status === "complete") {
      return;
    }

    let cancelled = false;
    const intervalId = window.setInterval(async () => {
      const response = await fetch(`/api/agent-runs/${runId}`, {
        cache: "no-store"
      });

      if (!response.ok || cancelled) {
        return;
      }

      const nextRun = (await response.json()) as AgentRunRow;
      if (cancelled) {
        return;
      }
      setRun(nextRun);
    }, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [router, run, runId]);

  useEffect(() => {
    if (run?.status !== "complete" || !provenanceHref || redirectedRef.current) {
      return;
    }

    redirectedRef.current = true;
    router.push(provenanceHref);
  }, [provenanceHref, router, run]);

  async function startResearchRun() {
    if (!chassisNumber.trim()) {
      setError("Enter a chassis number to start a run.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    redirectedRef.current = false;

    try {
      const response = await fetch("/api/research", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          chassis_number: chassisNumber.trim(),
          triggered_by: "manual"
        })
      });

      if (!response.ok) {
        throw new Error(await readClientError(response));
      }

      const accepted = (await response.json()) as {
        run_id: string;
        status: string;
      };

      const nextRun: AgentRunRow = {
        id: accepted.run_id,
        chassis_seed_id: null,
        car_id: null,
        chassis_number: chassisNumber.trim(),
        serial_number: null,
        status: accepted.status,
        phases_completed: 0,
        triggered_by: "manual",
        triggered_by_user: null,
        started_at: new Date().toISOString(),
        completed_at: null,
        error: null
      };

      setRunId(accepted.run_id);
      setRun(nextRun);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not start the research run.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const phasesCompleted = Math.max(0, Math.min(3, run?.phases_completed ?? 0));
  const progressPercent = (phasesCompleted / 3) * 100;

  return (
    <section className="card research-shell">
      <div className="research-shell__intro">
        <div>
          <h2 className="section-title">Run research</h2>
          <p className="empty">Start from a chassis number, poll the run, and jump into the provenance report when the agent finishes.</p>
        </div>
        <div className="research-shell__meta">
          <span className="active-filter">{knownSeeds.length} seeded chassis</span>
          {run ? <span className="active-filter">Run {run.id.slice(0, 8)}</span> : null}
        </div>
      </div>

      <div className="research-form">
        <input
          className="field research-form__input"
          onChange={(event) => setChassisNumber(event.target.value)}
          placeholder="Enter chassis number"
          type="search"
          value={chassisNumber}
        />
        <button className="button" disabled={isSubmitting} onClick={() => void startResearchRun()} type="button">
          {isSubmitting ? "Starting…" : "Go"}
        </button>
      </div>

      {suggestedSeeds.length > 0 ? (
        <div className="research-suggestions">
          <span className="car-search__label">Known dark chassis</span>
          <div className="car-search__presets">
            {suggestedSeeds.map((row) => (
              <button
                className={`filter-pill${chassisNumber === row.chassis_number ? " filter-pill--active" : ""}`}
                key={row.id}
                onClick={() => setChassisNumber(row.chassis_number)}
                type="button"
              >
                {row.chassis_number}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {error ? <p className="status-note status-note--error">{error}</p> : null}

      {run ? (
        <div className="research-progress">
          <div className="research-progress__header">
            <div>
              <div className="section-title">Progress</div>
              <div className="empty">
                {run.status === "complete"
                  ? "Run complete. Redirecting to provenance."
                  : run.status === "failed"
                    ? `Run failed${run.error ? `: ${run.error}` : "."}`
                    : "Working through sweep, open web, and auction phases."}
              </div>
            </div>
            <div className="badge-row">
              <span className={`badge${run.status === "failed" ? " badge--alert" : run.status === "complete" ? " badge--hot" : ""}`}>
                {run.status}
              </span>
              <span className="badge">Phase {phasesCompleted}/3</span>
            </div>
          </div>
          {run.status === "complete" && provenanceHref ? (
            <div className="badge-row">
              <Link className="button button--secondary" href={provenanceHref}>
                Open provenance
              </Link>
            </div>
          ) : null}
          <div className="research-progress__bar" role="progressbar" aria-valuemax={3} aria-valuemin={0} aria-valuenow={phasesCompleted}>
            <span style={{ width: `${progressPercent}%` }} />
          </div>
          <div className="research-progress__steps">
            <span className={phasesCompleted >= 1 ? "research-progress__step research-progress__step--done" : "research-progress__step"}>
              1. Site sweep
            </span>
            <span className={phasesCompleted >= 2 ? "research-progress__step research-progress__step--done" : "research-progress__step"}>
              2. Open web
            </span>
            <span className={phasesCompleted >= 3 ? "research-progress__step research-progress__step--done" : "research-progress__step"}>
              3. Auction cross-check
            </span>
          </div>
        </div>
      ) : null}
    </section>
  );
}

async function readClientError(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = (await response.json()) as { error?: string; detail?: string };
    return body.error ?? body.detail ?? `Request failed: ${response.status}`;
  }
  return (await response.text()) || `Request failed: ${response.status}`;
}
