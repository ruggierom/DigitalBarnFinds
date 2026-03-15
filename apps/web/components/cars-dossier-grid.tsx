import { upsertWatchlistAction } from "@/app/actions";
import type { CarRow } from "@/lib/api";
import { CarMediaGallery } from "@/components/car-media-gallery";

type CarsDossierGridProps = {
  rows: CarRow[];
};

const statusOptions = ["candidate", "researching", "contacted", "acquired", "dropped"];

export function CarsDossierGrid({ rows }: CarsDossierGridProps) {
  return (
    <section className="dossier-grid">
      {rows.map((row) => {
        return (
          <article className="dossier-card" key={row.id}>
            <div className="dossier-card__lead">
              <div className="dossier-card__top">
                <div>
                  <div className="dossier-card__eyebrow">{row.make}</div>
                  <h2 className="dossier-card__title">{row.model}</h2>
                  <div className="dossier-card__serial">s/n {row.serial_number}</div>
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
                  <span>Darkness</span>
                  <strong>{row.darkness_score ?? "—"}</strong>
                </div>
                <div className="stat-chip">
                  <span>Last seen</span>
                  <strong>{row.last_known_year ?? "—"}</strong>
                </div>
                <div className="stat-chip">
                  <span>Longest gap</span>
                  <strong>{row.gap_years ?? "—"}</strong>
                </div>
                <div className="stat-chip">
                  <span>Sources</span>
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
                </dl>
                {row.notes ? <p className="panel-copy">{row.notes}</p> : null}
              </section>

              <section className="dossier-panel">
                <h3 className="dossier-panel__title">Source pages</h3>
                <div className="source-stack">
                  {row.sources.map((source) => (
                    <a
                      className="source-link"
                      href={source.source_url}
                      key={`${row.id}-${source.source_url}`}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <span className="source-link__name">{source.source_name}</span>
                      <span className="source-link__meta">
                        {source.source_serial_number} · scraped{" "}
                        {new Date(source.scraped_at).toLocaleDateString()}
                      </span>
                    </a>
                  ))}
                </div>
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
                <button className="button" type="submit">
                  Save watchlist state
                </button>
              </form>
            </section>

            <section className="dossier-panel">
              <div className="dossier-panel__header">
                <h3 className="dossier-panel__title">Timeline</h3>
                <span className="panel-count">{row.timeline.length} entries</span>
              </div>
              <div className="timeline-list">
                {row.timeline.map((item, index) => (
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
