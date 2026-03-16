type HeaderRow = {
  name: string;
  value: string;
};

type RequestLabPanelProps = {
  initialRawRequest: string;
  initialUrl: string;
  initialMethod: string;
  initialHeaders: string;
  initialBody: string;
  result?: {
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
  error?: string;
};

export function RequestLabPanel({
  initialRawRequest,
  initialUrl,
  initialMethod,
  initialHeaders,
  initialBody,
  result,
  error
}: RequestLabPanelProps) {
  return (
    <>
      <section className="hero">
        <div className="hero__eyebrow">Internal request lab</div>
        <h1 className="section-title">Inspect every request detail safely.</h1>
        <p className="hero__copy">
          This lab is restricted to localhost and env-allowlisted internal hosts. Use it to tweak headers, method,
          and body, then inspect the exact request your backend sent and the raw response that came back.
        </p>
      </section>

      <section className="card diagnostics-card">
        <form action="/request-lab" className="request-lab-form" method="get">
          <label className="request-lab-form__block">
            <span className="diagnostics-subtitle">Raw HTTP capture</span>
            <textarea
              className="field request-lab-form__textarea"
              defaultValue={initialRawRequest}
              name="raw_request"
              rows={10}
            />
          </label>
          <div className="request-lab-form__top">
            <input className="field" defaultValue={initialUrl} name="url" type="text" />
            <select className="field" defaultValue={initialMethod} name="method">
              {["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"].map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
            <button className="button" name="run" type="submit" value="1">
              Send request
            </button>
          </div>
          <div className="request-lab-form__grid">
            <label className="request-lab-form__block">
              <span className="diagnostics-subtitle">Headers JSON</span>
              <textarea
                className="field request-lab-form__textarea"
                defaultValue={initialHeaders}
                name="headers"
                rows={10}
              />
            </label>
            <label className="request-lab-form__block">
              <span className="diagnostics-subtitle">Body</span>
              <textarea
                className="field request-lab-form__textarea"
                defaultValue={initialBody}
                name="body"
                rows={10}
              />
            </label>
          </div>
        </form>

        {error ? <div className="fetch-result fetch-result__error-block">{error}</div> : null}

        {result ? (
          <div className="diagnostics-grid">
            <article className="diagnostics-panel">
              <h2 className="diagnostics-panel__title">Request Sent</h2>
              <div className="diagnostics-meta">
                <span>
                  {result.request.method} {result.request.url}
                </span>
                <span>Follow redirects: {result.request.follow_redirects ? "yes" : "no"}</span>
                <span>Timeout: {result.request.timeout_seconds}s</span>
              </div>
              <div className="diagnostics-subtitle">Headers</div>
              <table className="diagnostics-table">
                <thead>
                  <tr>
                    <th>Header</th>
                    <th>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {result.request.headers.map((header) => (
                    <tr key={header.name}>
                      <td>{header.name}</td>
                      <td className="diagnostics-table__value">{header.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>

            <article className="diagnostics-panel">
              <h2 className="diagnostics-panel__title">Response Received</h2>
              <div className="diagnostics-meta">
                <span>Status: {result.response.status_code ?? "error"}</span>
                <span>Elapsed: {result.response.elapsed_ms ?? "n/a"} ms</span>
                <span>Type: {result.response.content_type ?? "unknown"}</span>
              </div>
              {result.response.final_url ? (
                <>
                  <div className="diagnostics-subtitle">Final URL</div>
                  <pre className="diagnostics-code">{result.response.final_url}</pre>
                </>
              ) : null}
              {result.response.error ? (
                <div className="fetch-result fetch-result__error-block">{result.response.error}</div>
              ) : null}
              <div className="diagnostics-subtitle">Headers</div>
              <table className="diagnostics-table">
                <thead>
                  <tr>
                    <th>Header</th>
                    <th>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {result.response.headers.map((header) => (
                    <tr key={header.name}>
                      <td>{header.name}</td>
                      <td className="diagnostics-table__value">{header.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="diagnostics-subtitle">Body Preview</div>
              <pre className="diagnostics-code diagnostics-code--body">
                {result.response.body_preview ?? "No preview available."}
              </pre>
            </article>
          </div>
        ) : null}
      </section>
    </>
  );
}
