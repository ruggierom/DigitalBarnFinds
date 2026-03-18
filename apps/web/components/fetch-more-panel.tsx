import { fetchMoreCarsAction } from "@/app/actions";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import type { SourceRow } from "@/lib/api";

type FetchMorePanelProps = {
  sources: SourceRow[];
  defaultScraperKey?: string;
  result?: {
    requested: number;
    discovered: number;
    imported: number;
    skipped: number;
    mode: string;
    source: string;
    scraperKey?: string;
    errors?: string;
  };
};

export function FetchMorePanel({ sources, defaultScraperKey, result }: FetchMorePanelProps) {
  const enabledSources = sources.filter((row) => row.enabled);
  const selectedScraperKey = defaultScraperKey ?? enabledSources[0]?.scraper_key ?? "";

  return (
    <section className="card">
      <h2 className="section-title">Fetch More Cars</h2>
      <p className="empty">
        Pull five unseen cars into the registry. In local dev, the fetch will
        automatically fall back to saved fixture pages if the live source blocks
        discovery.
      </p>
      <form action={fetchMoreCarsAction} className="fetch-form">
        <select aria-label="Source" className="field" defaultValue={selectedScraperKey} name="scraper_key">
          {enabledSources.map((source) => (
            <option key={source.id} value={source.scraper_key}>
              {source.name}
            </option>
          ))}
        </select>
        <PendingSubmitButton idleLabel="Import 5 cars" pendingLabel="Importing..." />
      </form>
      {result ? (
        <div className="fetch-result">
          <strong>
            Imported {result.imported} of {result.requested} requested from {result.source}.
          </strong>
          <div className="empty">
            Source key: {result.scraperKey ?? "unknown"}. Mode: {result.mode}. Discovered: {result.discovered}.
            Skipped existing: {result.skipped}.
          </div>
          {result.errors ? <div className="fetch-result__error">{result.errors}</div> : null}
        </div>
      ) : null}
    </section>
  );
}
