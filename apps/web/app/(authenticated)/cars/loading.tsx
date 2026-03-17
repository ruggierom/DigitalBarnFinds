export default function CarsLoading() {
  return (
    <div className="page-loading">
      <span aria-hidden="true" className="page-loading__spinner" />
      <span>Loading cars…</span>
    </div>
  );
}
