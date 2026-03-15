import { upsertWatchlistAction } from "@/app/actions";

type WatchlistRow = {
  car_id: string;
  serial_number: string;
  make: string;
  model: string;
  priority: number;
  status: string;
  score: number | null;
  interest_reason: string | null;
  updated_at: string;
};

const statusOptions = ["candidate", "researching", "contacted", "acquired", "dropped"];

type WatchlistEditorProps = {
  rows: WatchlistRow[];
};

export function WatchlistEditor({ rows }: WatchlistEditorProps) {
  return (
    <section className="card">
      <h2 className="section-title">Watchlist</h2>
      {rows.length === 0 ? (
        <p className="empty">No watchlist entries yet. Add them from the cars view.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Serial</th>
                <th>Car</th>
                <th>Score</th>
                <th>Update</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.car_id}>
                  <td>{row.serial_number}</td>
                  <td>{`${row.make} ${row.model}`}</td>
                  <td>{row.score ?? "—"}</td>
                  <td>
                    <form action={upsertWatchlistAction}>
                      <input name="car_id" type="hidden" value={row.car_id} />
                      <div className="form-row">
                        <select className="field" defaultValue={String(row.priority)} name="priority">
                          <option value="1">1</option>
                          <option value="2">2</option>
                          <option value="3">3</option>
                          <option value="4">4</option>
                          <option value="5">5</option>
                        </select>
                        <select className="field" defaultValue={row.status} name="status">
                          {statusOptions.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                        <input
                          className="field"
                          defaultValue={row.interest_reason ?? ""}
                          name="interest_reason"
                          type="text"
                        />
                        <textarea
                          className="field"
                          name="notes"
                          placeholder="Research notes"
                          rows={3}
                        />
                        <button className="button" type="submit">
                          Update
                        </button>
                      </div>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

