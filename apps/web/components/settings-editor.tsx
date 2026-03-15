import { updateSettingAction } from "@/app/actions";

type SettingRow = {
  key: string;
  value: Record<string, unknown>;
  description: string | null;
  updated_at: string;
};

type SettingsEditorProps = {
  rows: SettingRow[];
};

export function SettingsEditor({ rows }: SettingsEditorProps) {
  return (
    <section className="grid">
      {rows.map((row) => (
        <article className="card" key={row.key}>
          <h2 className="section-title">{row.key}</h2>
          <p className="empty">{row.description ?? "No description provided."}</p>
          <form action={updateSettingAction}>
            <input name="key" type="hidden" value={row.key} />
            <div className="form-row">
              <textarea
                className="field"
                defaultValue={JSON.stringify(row.value, null, 2)}
                name="value"
                rows={10}
              />
              <button className="button" type="submit">
                Save setting
              </button>
            </div>
          </form>
        </article>
      ))}
    </section>
  );
}

