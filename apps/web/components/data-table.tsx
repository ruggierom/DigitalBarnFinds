type DataTableProps = {
  title: string;
  rows: Array<Record<string, unknown>>;
};

export function DataTable({ title, rows }: DataTableProps) {
  const columns = rows[0] ? Object.keys(rows[0]) : [];

  return (
    <section className="card">
      <h2 className="section-title">{title}</h2>
      {rows.length === 0 ? (
        <p className="empty">No records yet.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column}>{column.replaceAll("_", " ")}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {columns.map((column) => (
                    <td key={column}>{formatCell(row[column])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function formatCell(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

