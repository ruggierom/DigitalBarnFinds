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
        <div className="hero__eyebrow">Research Dashboard</div>
        <h1 className="hero__title">Surface the cars that went dark.</h1>
        <p className="hero__copy">
          Surface the most interesting gaps, review provenance quickly, and
          keep your active leads in one working watchlist.
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
      <DataTable title="Watchlist" rows={watchlist} />
    </>
  );
}
