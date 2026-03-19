import { DashboardMetrics } from "@/components/dashboard-metrics";
import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { getDashboardSnapshot, getWatchlist } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [snapshot, watchlist] = await Promise.all([
    getDashboardSnapshot(),
    getWatchlist()
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Dashboard"
        title="Research dashboard"
        description="Coverage, watchlist movement, and dark-car counts."
      />
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
