import { DataTable } from "@/components/data-table";
import { getSources } from "@/lib/api";

export default async function SourcesPage() {
  const rows = await getSources();

  return (
    <>
      <section className="hero">
        <div className="hero__eyebrow">Operational visibility</div>
        <h1 className="section-title">See what each source is contributing.</h1>
        <p className="hero__copy">
          Sources are code-backed in v1, but the admin view still shows scrape
          health, last-run status, and what each registry is feeding into the
          system.
        </p>
      </section>
      <DataTable title="Sources" rows={rows} />
    </>
  );
}

