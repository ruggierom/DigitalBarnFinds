"use client";

import { useMemo, useState } from "react";

import type { ChassisSeedRow, DealerLookupRow, ProvenanceContactRow, ProvenanceReportRow } from "@/lib/api";

type ProvenanceReportViewProps = {
  report: ProvenanceReportRow;
  seed: ChassisSeedRow | null;
};

export function ProvenanceReportView({ report, seed }: ProvenanceReportViewProps) {
  const [currentReport, setCurrentReport] = useState(report);
  const [activeContactId, setActiveContactId] = useState<string | null>(null);
  const [lookupOutcome, setLookupOutcome] = useState("not_reached");
  const [lookupNotes, setLookupNotes] = useState("");
  const [submittingContactId, setSubmittingContactId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const lookupsByContact = useMemo(() => {
    const grouped = new Map<string, DealerLookupRow[]>();

    currentReport.dealer_lookups.forEach((lookup) => {
      if (!lookup.contact_id) {
        return;
      }
      const existing = grouped.get(lookup.contact_id) ?? [];
      existing.push(lookup);
      existing.sort((left, right) => right.attempted_at.localeCompare(left.attempted_at));
      grouped.set(lookup.contact_id, existing);
    });

    return grouped;
  }, [currentReport.dealer_lookups]);

  async function logLookup(contact: ProvenanceContactRow) {
    setSubmittingContactId(contact.id);
    setError(null);

    try {
      const response = await fetch("/api/dealer-lookups", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          provenance_report_id: currentReport.id,
          contact_id: contact.id,
          outcome: lookupOutcome,
          notes: lookupNotes || null
        })
      });

      if (!response.ok) {
        throw new Error(await readClientError(response));
      }

      const lookup = (await response.json()) as DealerLookupRow;
      setCurrentReport((currentValue) => ({
        ...currentValue,
        dealer_lookups: [lookup, ...currentValue.dealer_lookups]
      }));
      setActiveContactId(null);
      setLookupOutcome("not_reached");
      setLookupNotes("");
      setMessage(`Logged outreach for ${contact.name ?? contact.org ?? "contact"}.`);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not log dealer lookup.");
    } finally {
      setSubmittingContactId(null);
    }
  }

  const title = [seed?.vehicle_make, seed?.vehicle_model, seed?.vehicle_variant].filter(Boolean).join(" ") || "Provenance";
  const valueLabel = currentReport.estimated_value_usd ? formatUsd(currentReport.estimated_value_usd) : "—";
  const events = currentReport.custody_chain.map((item, index) => ({
    id: `${currentReport.id}-${index}`,
    period: typeof item.period === "string" ? item.period : "Undated",
    custodian: typeof item.custodian === "string" ? item.custodian : "Unknown custodian",
    confidence: normalizeConfidence(item.confidence),
    source: typeof item.source === "string" ? item.source : null,
    location: typeof item.location === "string" ? item.location : null,
    notes: typeof item.notes === "string" ? item.notes : null
  }));

  return (
    <section className="provenance-shell">
      <article className="card provenance-header">
        <div className="provenance-header__copy">
          <div className="hero__eyebrow">{seed?.vehicle_make ?? "Research report"}</div>
          <h2 className="hero__title provenance-header__title">{title}</h2>
          <p className="hero__copy">
            Chassis {seed?.chassis_number ?? "—"}
            {seed?.production_number ? ` · Production ${seed.production_number}` : ""}
          </p>
          {currentReport.summary ? <p className="panel-copy">{currentReport.summary}</p> : null}
        </div>
        <div className="provenance-header__stats">
          <div className="stat-chip">
            <span className="stat-chip__label">Darkness</span>
            <strong>{currentReport.darkness_score ?? "—"}</strong>
          </div>
          <div className="stat-chip">
            <span className="stat-chip__label">Estimated value</span>
            <strong>{valueLabel}</strong>
          </div>
          <div className="stat-chip">
            <span className="stat-chip__label">Last known place</span>
            <strong>{currentReport.last_known_location ?? seed?.last_known_location ?? "—"}</strong>
          </div>
          <div className="stat-chip">
            <span className="stat-chip__label">Geo region</span>
            <strong>{currentReport.geo_region ?? seed?.destination_region ?? "—"}</strong>
          </div>
        </div>
      </article>

      {error ? <p className="status-note status-note--error">{error}</p> : null}
      {message ? <p className="status-note">{message}</p> : null}

      <div className="provenance-grid">
        <article className="card provenance-card">
          <div className="dossier-panel__header">
            <h3 className="dossier-panel__title">Custody timeline</h3>
            <span className="panel-count">{events.length} events</span>
          </div>
          {events.length === 0 ? (
            <p className="empty">No structured custody events yet.</p>
          ) : (
            <div className="provenance-timeline">
              {events.map((event) => (
                <div className={`provenance-event provenance-event--${event.confidence}`} key={event.id}>
                  <div className="provenance-event__period">{event.period}</div>
                  <div className="provenance-event__custodian">{event.custodian}</div>
                  {event.location ? <div className="provenance-event__meta">{event.location}</div> : null}
                  {event.source ? <div className="provenance-event__meta">Source: {event.source}</div> : null}
                  {event.notes ? <div className="provenance-event__notes">{event.notes}</div> : null}
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="card provenance-card">
          <div className="dossier-panel__header">
            <h3 className="dossier-panel__title">Contact queue</h3>
            <span className="panel-count">{currentReport.contacts.length} leads</span>
          </div>
          {currentReport.contacts.length === 0 ? (
            <p className="empty">No contact leads were extracted for this run.</p>
          ) : (
            <div className="contact-queue">
              {currentReport.contacts.map((contact) => {
                const latestLookup = (lookupsByContact.get(contact.id) ?? [])[0] ?? null;
                const effectiveStatus = latestLookup?.outcome ?? contact.contact_status;

                return (
                  <article className="contact-card" key={contact.id}>
                    <div className="contact-card__header">
                      <div>
                        <div className="contact-card__title">
                          {contact.priority}. {contact.name ?? contact.org ?? "Unnamed lead"}
                        </div>
                        <div className="contact-card__meta">
                          {[contact.org, contact.city, contact.phone].filter(Boolean).join(" · ") || "No contact details yet"}
                        </div>
                      </div>
                      <span className={`badge ${statusTone(effectiveStatus)}`}>{effectiveStatus.replace(/_/g, " ")}</span>
                    </div>
                    {contact.rationale ? <p className="panel-copy">{contact.rationale}</p> : null}
                    {latestLookup ? (
                      <div className="contact-card__history">
                        Latest outreach: {latestLookup.outcome ?? "—"} on {new Date(latestLookup.attempted_at).toLocaleDateString()}
                      </div>
                    ) : null}
                    <div className="contact-card__actions">
                      <button
                        className="button button--secondary"
                        onClick={() => setActiveContactId((currentId) => (currentId === contact.id ? null : contact.id))}
                        type="button"
                      >
                        Log call
                      </button>
                    </div>
                    {activeContactId === contact.id ? (
                      <div className="contact-card__form">
                        <select
                          className="field"
                          onChange={(event) => setLookupOutcome(event.target.value)}
                          value={lookupOutcome}
                        >
                          <option value="not_reached">Not reached</option>
                          <option value="reached">Reached</option>
                          <option value="warm">Warm</option>
                          <option value="declined">Declined</option>
                        </select>
                        <textarea
                          className="field field--expanding"
                          onChange={(event) => setLookupNotes(event.target.value)}
                          placeholder="Notes from the call"
                          rows={3}
                          value={lookupNotes}
                        />
                        <div className="contact-card__actions">
                          <button
                            className="button"
                            disabled={submittingContactId === contact.id}
                            onClick={() => void logLookup(contact)}
                            type="button"
                          >
                            {submittingContactId === contact.id ? "Saving…" : "Save lookup"}
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </article>

        <article className="card provenance-card provenance-card--wide">
          <div className="dossier-panel__header">
            <h3 className="dossier-panel__title">Recommended actions</h3>
            <span className="panel-count">{currentReport.recommended_actions.length} items</span>
          </div>
          {currentReport.recommended_actions.length === 0 ? (
            <p className="empty">No recommendations were captured yet.</p>
          ) : (
            <ul className="action-checklist">
              {currentReport.recommended_actions.map((item) => (
                <li className="action-checklist__item" key={item}>
                  <span className="action-checklist__marker" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
        </article>
      </div>
    </section>
  );
}

function normalizeConfidence(value: unknown) {
  if (typeof value !== "string") {
    return "speculated";
  }

  const normalized = value.toLowerCase();
  if (normalized === "confirmed") {
    return "confirmed";
  }
  if (normalized === "probable") {
    return "probable";
  }
  return "speculated";
}

function statusTone(status: string) {
  if (status === "warm" || status === "reached") {
    return "badge--hot";
  }
  if (status === "declined") {
    return "badge--alert";
  }
  return "";
}

function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}

async function readClientError(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = (await response.json()) as { error?: string; detail?: string };
    return body.error ?? body.detail ?? `Request failed: ${response.status}`;
  }
  return (await response.text()) || `Request failed: ${response.status}`;
}
