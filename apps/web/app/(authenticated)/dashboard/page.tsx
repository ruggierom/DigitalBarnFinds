import { DashboardMetrics } from "@/components/dashboard-metrics";
import { DataTable } from "@/components/data-table";
import { getDashboardSnapshot, getWatchlist } from "@/lib/api";

export default async function DashboardPage() {
  const [snapshot, watchlist] = await Promise.all([
    getDashboardSnapshot(),
    getWatchlist()
  ]);

  return (
    <>
      <section className="hero">
        <div className="hero__eyebrow">Authenticated research dashboard</div>
        <h1 className="hero__title">Surface the cars that went dark.</h1>
        <p className="hero__copy">
          Prioritize long-gap chassis, inspect source-by-source provenance, and
          keep an editable watchlist for the leads worth pursuing.
        </p>
      </section>
      <DashboardMetrics
        metrics={[
          {
            label: "candidate cars",
            value: snapshot.candidate_count,
            href: "/cars?candidates_only=true&sort=darkness_score_desc"
          },
          { label: "watchlist entries", value: snapshot.watchlist_count, href: "/watchlist" },
          { label: "active sources", value: snapshot.source_count, href: "/sources" },
          {
            label: "currently dark",
            value: snapshot.dark_now_count,
            href: "/cars?dark_now=true&sort=darkness_score_desc"
          }
        ]}
      />
      <DataTable title="Watchlist snapshot" rows={watchlist} />
    </>
  );
}
