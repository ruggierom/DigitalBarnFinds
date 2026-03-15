import { fetchMoreCarsAction } from "@/app/actions";

type FetchMorePanelProps = {
  result?: {
    requested: number;
    discovered: number;
    imported: number;
    skipped: number;
    mode: string;
    source: string;
    errors?: string;
  };
};

export function FetchMorePanel({ result }: FetchMorePanelProps) {
  return (
    <section className="card">
      <h2 className="section-title">Fetch More Cars</h2>
      <p className="empty">
        Pull a random batch of unseen cars into the registry. In local dev, the
        fetch will automatically fall back to saved fixture pages if the live
        source blocks discovery.
      </p>
      <form action={fetchMoreCarsAction} className="fetch-form">
        <input className="field" defaultValue="5" max="50" min="1" name="limit" type="number" />
        <button className="button" type="submit">
          Fetch N more cars
        </button>
      </form>
      {result ? (
        <div className="fetch-result">
          <strong>
            Imported {result.imported} of {result.requested} requested from {result.source}.
          </strong>
          <div className="empty">
            Mode: {result.mode}. Discovered: {result.discovered}. Skipped existing: {result.skipped}.
          </div>
          {result.errors ? <div className="fetch-result__error">{result.errors}</div> : null}
        </div>
      ) : null}
    </section>
  );
}
