import { PageHeader } from "@/components/page-header";
import { WatchlistEditor } from "@/components/watchlist-editor";
import { getWatchlist } from "@/lib/api";

export default async function WatchlistPage() {
  const rows = await getWatchlist();

  return (
    <>
      <PageHeader
        eyebrow="Watchlist"
        title="Active leads"
        description="Manual lead queue."
      />
      <WatchlistEditor rows={rows} />
    </>
  );
}
