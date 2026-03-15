type HeaderRow = {
  name: string;
  value: string;
};

type RequestDiagnosticsPanelProps = {
  diagnostics: {
    path: string;
    user_agent: string;
    request: {
      method: string;
      url: string;
      headers: HeaderRow[];
      follow_redirects: boolean;
      timeout_seconds: number;
    };
    response: {
      attempted: boolean;
      status_code: number | null;
      final_url: string | null;
      headers: HeaderRow[];
      elapsed_ms: number | null;
      content_type: string | null;
      body_preview: string | null;
      error: string | null;
    };
  };
  currentPath: string;
  currentUserAgentOverride: string;
};

export function RequestDiagnosticsPanel({
  diagnostics,
  currentPath,
  currentUserAgentOverride
}: RequestDiagnosticsPanelProps) {
  return (
    <section className="card diagnostics-card">
      <div className="diagnostics-card__header">
        <div>
          <h2 className="section-title">Request Diagnostics</h2>
          <p className="empty">
            Inspect the exact Barchetta GET request the backend will send. This tool is intentionally limited to
            previewing and testing legitimate request settings rather than arbitrary header spoofing.
          </p>
        </div>
      </div>

      <form action="/settings" className="diagnostics-form" method="get">
        <input className="field diagnostics-form__path" defaultValue={currentPath} name="diag_path" type="text" />
        <input
          className="field diagnostics-form__ua"
          defaultValue={currentUserAgentOverride}
          name="diag_user_agent"
          placeholder="Optional truthful User-Agent override for this one test"
          type="text"
        />
        <button className="button" name="diag_run" type="submit" value="1">
          Run test request
        </button>
      </form>

      <div className="diagnostics-grid">
        <article className="diagnostics-panel">
          <h3 className="diagnostics-panel__title">Outgoing Request</h3>
          <div className="diagnostics-meta">
            <span>
              {diagnostics.request.method} {diagnostics.request.url}
            </span>
            <span>Follow redirects: {diagnostics.request.follow_redirects ? "yes" : "no"}</span>
            <span>Timeout: {diagnostics.request.timeout_seconds}s</span>
          </div>
          <div className="diagnostics-subtitle">Effective User-Agent</div>
          <pre className="diagnostics-code">{diagnostics.user_agent}</pre>
          <div className="diagnostics-subtitle">Headers</div>
          <table className="diagnostics-table">
            <thead>
              <tr>
                <th>Header</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              {diagnostics.request.headers.map((header) => (
                <tr key={header.name}>
                  <td>{header.name}</td>
                  <td className="diagnostics-table__value">{header.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>

        <article className="diagnostics-panel">
          <h3 className="diagnostics-panel__title">Response Preview</h3>
          {diagnostics.response.attempted ? (
            <>
              <div className="diagnostics-meta">
                <span>Status: {diagnostics.response.status_code ?? "error"}</span>
                <span>Elapsed: {diagnostics.response.elapsed_ms ?? "n/a"} ms</span>
                <span>Type: {diagnostics.response.content_type ?? "unknown"}</span>
              </div>
              {diagnostics.response.final_url ? (
                <>
                  <div className="diagnostics-subtitle">Final URL</div>
                  <pre className="diagnostics-code">{diagnostics.response.final_url}</pre>
                </>
              ) : null}
              {diagnostics.response.error ? (
                <div className="fetch-result fetch-result__error-block">{diagnostics.response.error}</div>
              ) : null}
              <div className="diagnostics-subtitle">Response Headers</div>
              <table className="diagnostics-table">
                <thead>
                  <tr>
                    <th>Header</th>
                    <th>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {diagnostics.response.headers.map((header) => (
                    <tr key={header.name}>
                      <td>{header.name}</td>
                      <td className="diagnostics-table__value">{header.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="diagnostics-subtitle">Body Preview</div>
              <pre className="diagnostics-code diagnostics-code--body">
                {diagnostics.response.body_preview ?? "No preview available."}
              </pre>
            </>
          ) : (
            <div className="fetch-result">
              <strong>No live request has been run yet.</strong>
              <div className="empty">Use the form above to test a specific Barchetta path once and inspect the response.</div>
            </div>
          )}
        </article>
      </div>
    </section>
  );
}
