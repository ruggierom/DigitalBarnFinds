import { importCarByUrlAction } from "@/app/actions";
import { PendingSubmitButton } from "@/components/pending-submit-button";

type ImportUrlPanelProps = {
  defaultUrl?: string;
  result?: {
    sourceUrl: string;
    scraperKey: string;
    sourceName: string;
    carId: string;
    serialNumber: string;
    make: string;
    model: string;
    sourceCount: number;
    mediaCount: number;
    alreadyKnownUrl: boolean;
  };
  error?: string;
};

export function ImportUrlPanel({ defaultUrl, result, error }: ImportUrlPanelProps) {
  return (
    <section className="card">
      <h2 className="section-title">Import by URL</h2>
      <p className="empty">
        Paste a supported detail-page URL from one of the scraped sites and import or refresh that car directly. If
        we do not support the site yet, we will tell you and consider adding it.
      </p>
      <form action={importCarByUrlAction} className="import-url-form">
        <input
          className="field"
          defaultValue={defaultUrl ?? ""}
          name="url"
          placeholder="https://www.mecum.com/lots/480219/2002-ferrari-360-spider/"
          type="url"
        />
        <PendingSubmitButton idleLabel="Import URL" pendingLabel="Importing..." />
      </form>
      {error ? <div className="fetch-result fetch-result__error-block">{error}</div> : null}
      {result ? (
        <div className="fetch-result">
          <strong>
            {result.alreadyKnownUrl ? "Refreshed" : "Imported"} vehicle ID {result.serialNumber} from{" "}
            {result.sourceName}.
          </strong>
          <div className="empty">
            {result.make} {result.model}. Scraper: {result.scraperKey}. Media: {result.mediaCount}. Sources on car:{" "}
            {result.sourceCount}.
          </div>
          <div className="empty">{result.sourceUrl}</div>
        </div>
      ) : null}
    </section>
  );
}
