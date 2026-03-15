import { WatchlistEditor } from "@/components/watchlist-editor";
import { getWatchlist } from "@/lib/api";

export default async function WatchlistPage() {
  const rows = await getWatchlist();

  return (
    <>
      <section className="hero">
        <div className="hero__eyebrow">Editable shortlist</div>
        <h1 className="hero__title">Track the leads worth human follow-up.</h1>
        <p className="hero__copy">
          Watchlist state is persisted separately from scoring so you can promote,
          drop, or annotate cars without losing the underlying darkness history.
        </p>
      </section>
      <WatchlistEditor rows={rows} />
    </>
  );
}
