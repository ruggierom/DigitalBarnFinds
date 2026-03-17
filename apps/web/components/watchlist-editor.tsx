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
  agent_instructions: string | null;
  notes: string | null;
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
                <th>Vehicle ID</th>
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
                      <div className="form-row form-row--stacked">
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
                        <textarea
                          className="field field--expanding"
                          defaultValue={row.interest_reason ?? ""}
                          name="interest_reason"
                          placeholder="Why this car matters"
                          rows={2}
                        />
                        <textarea
                          className="field field--expanding"
                          defaultValue={row.agent_instructions ?? ""}
                          name="agent_instructions"
                          placeholder="Agent instructions: what should the agent go try to figure out?"
                          rows={3}
                        />
                        <textarea
                          className="field field--expanding"
                          defaultValue={row.notes ?? ""}
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
