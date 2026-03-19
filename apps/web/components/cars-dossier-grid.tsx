import { upsertWatchlistAction } from "@/app/actions";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import type { CarRow } from "@/lib/api";
import { CarMediaGallery } from "@/components/car-media-gallery";

type CarsDossierGridProps = {
  rows: CarRow[];
};

const statusOptions = ["candidate", "researching", "contacted", "acquired", "dropped"];
const SOURCE_PREVIEW_COUNT = 3;
const TIMELINE_PREVIEW_COUNT = 5;

export function CarsDossierGrid({ rows }: CarsDossierGridProps) {
  return (
    <section className="dossier-grid">
      {rows.map((row) => {
        const lastSeenFlag = countryFlagEmoji(row.last_seen_country_code);
        const lastSeenPlace = formatLastSeenPlace(row);
        const previewSources = row.sources.slice(0, SOURCE_PREVIEW_COUNT);
        const hiddenSourcesCount = Math.max(0, row.sources.length - previewSources.length);
        const previewTimeline = row.timeline.slice(0, TIMELINE_PREVIEW_COUNT);
        const hiddenTimelineCount = Math.max(0, row.timeline.length - previewTimeline.length);

        return (
          <article className="dossier-card" key={row.id}>
            <div className="dossier-card__lead">
              <div className="dossier-card__top">
                <div>
                  <div className="dossier-card__eyebrow">{row.make}</div>
                  <h2 className="dossier-card__title">{row.model}</h2>
                  <div className="dossier-card__serial">Vehicle ID {row.serial_number}</div>
                </div>
                <div className="badge-row">
                  <span className={`badge ${row.is_currently_dark ? "badge--alert" : ""}`}>
                    {row.is_currently_dark ? "Currently dark" : "Recently seen"}
                  </span>
                  {row.qualifies_primary ? <span className="badge badge--hot">Primary flag</span> : null}
                  {row.qualifies_secondary ? <span className="badge">Secondary flag</span> : null}
                </div>
              </div>

              <div className="dossier-stats">
                <div className="stat-chip">
                  <span className="stat-chip__label">Darkness</span>
                  <strong>{row.darkness_score ?? "—"}</strong>
                </div>
                <div className="stat-chip">
                  <span className="stat-chip__label">Last seen</span>
                  <strong>{row.last_known_year ?? "—"}</strong>
                  {lastSeenFlag ? (
                    <span className="stat-chip__meta" title={row.last_seen_country_name ?? undefined}>
                      {lastSeenFlag} {row.last_seen_country_code}
                    </span>
                  ) : null}
                </div>
                <div className="stat-chip">
                  <span className="stat-chip__label">Longest gap</span>
                  <strong>{row.gap_years ?? "—"}</strong>
                </div>
                <div className="stat-chip">
                  <span className="stat-chip__label">Sources</span>
                  <strong>{row.source_count}</strong>
                </div>
              </div>
            </div>

            <CarMediaGallery media={row.media} serialNumber={row.serial_number} sources={row.sources} />

            <div className="dossier-columns">
              <section className="dossier-panel">
                <h3 className="dossier-panel__title">Car profile</h3>
                <dl className="meta-list">
                  <div>
                    <dt>Variant</dt>
                    <dd>{row.variant ?? "—"}</dd>
                  </div>
                  <div>
                    <dt>Built</dt>
                    <dd>{row.build_date_label ?? row.year_built ?? "—"}</dd>
                  </div>
                  <div>
                    <dt>Body</dt>
                    <dd>{row.body_style ?? "—"}</dd>
                  </div>
                  <div>
                    <dt>Drive side</dt>
                    <dd>{row.drive_side ?? "—"}</dd>
                  </div>
                  <div>
                    <dt>Original color</dt>
                    <dd>{row.original_color ?? "—"}</dd>
                  </div>
                  <div>
                    <dt>Years dark</dt>
                    <dd>{row.years_since_last_seen ?? "—"}</dd>
                  </div>
                  <div>
                    <dt>Last seen place</dt>
                    <dd>{lastSeenPlace}</dd>
                  </div>
                </dl>
                {row.notes ? <p className="panel-copy">{row.notes}</p> : null}
              </section>

              <section className="dossier-panel">
                <h3 className="dossier-panel__title">Source pages</h3>
                <div className="source-stack">
                  {previewSources.map((source) => (
                    <a
                      className="source-link"
                      href={source.source_url}
                      key={`${row.id}-${source.source_url}`}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <span className="source-link__name">{source.source_name}</span>
                      <span className="source-link__meta">
                        Vehicle ID {source.source_serial_number} · scraped{" "}
                        {new Date(source.scraped_at).toLocaleDateString()}
                      </span>
                    </a>
                  ))}
                </div>
                {hiddenSourcesCount > 0 ? (
                  <p className="panel-copy">Showing the latest {previewSources.length} of {row.sources.length} sources.</p>
                ) : null}
              </section>
            </div>

            <section className="dossier-panel">
              <h3 className="dossier-panel__title">Watchlist</h3>
              <form action={upsertWatchlistAction} className="watchlist-form">
                <input name="car_id" type="hidden" value={row.id} />
                <select className="field" defaultValue="3" name="priority">
                  <option value="1">Priority 1</option>
                  <option value="2">Priority 2</option>
                  <option value="3">Priority 3</option>
                  <option value="4">Priority 4</option>
                  <option value="5">Priority 5</option>
                </select>
                <select className="field" defaultValue={row.watchlist_status ?? "candidate"} name="status">
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                <input
                  className="field"
                  name="interest_reason"
                  placeholder="Why this car matters"
                  type="text"
                />
                <textarea
                  className="field field--expanding"
                  name="agent_instructions"
                  placeholder="Agent instructions: what should the agent go try to figure out?"
                  rows={2}
                />
                <textarea
                  className="field field--expanding"
                  name="notes"
                  placeholder="Research notes"
                  rows={2}
                />
                <PendingSubmitButton idleLabel="Save watchlist state" pendingLabel="Saving..." />
              </form>
            </section>

            <section className="dossier-panel">
              <div className="dossier-panel__header">
                <h3 className="dossier-panel__title">Timeline</h3>
                <span className="panel-count">{row.timeline.length} entries</span>
              </div>
              {hiddenTimelineCount > 0 ? (
                <p className="panel-copy">Showing the most recent {previewTimeline.length} entries first.</p>
              ) : null}
              <div className="timeline-list">
                {previewTimeline.map((item, index) => (
                  <div className="timeline-item" key={`${row.id}-${item.kind}-${index}`}>
                    <div className="timeline-item__date">{item.event_date_label}</div>
                    <div className="timeline-item__body">
                      <div className="timeline-item__kind">{item.kind}</div>
                      <div className="timeline-item__title">{item.title}</div>
                      {item.subtitle ? <div className="timeline-item__subtitle">{item.subtitle}</div> : null}
                      {item.detail ? <div className="timeline-item__detail">{item.detail}</div> : null}
                      {item.source_reference ? (
                        <div className="timeline-item__ref">Ref: {item.source_reference}</div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </article>
        );
      })}
    </section>
  );
}

function countryFlagEmoji(countryCode: string | null) {
  if (!countryCode || countryCode.length !== 2) {
    return null;
  }

  const upper = countryCode.toUpperCase();
  return String.fromCodePoint(...upper.split("").map((character) => 127397 + character.charCodeAt(0)));
}

function formatLastSeenPlace(row: CarRow) {
  const flag = countryFlagEmoji(row.last_seen_country_code);
  const label = row.last_seen_location ?? row.last_seen_country_name;
  if (!label) {
    return "—";
  }
  return flag ? `${flag} ${label}` : label;
}
