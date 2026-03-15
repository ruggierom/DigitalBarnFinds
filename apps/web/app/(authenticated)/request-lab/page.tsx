import { RequestLabPanel } from "@/components/request-lab-panel";
import { runRequestLab } from "@/lib/api";

function getValue(value: string | string[] | undefined, fallback = "") {
  return Array.isArray(value) ? value[0] ?? fallback : value ?? fallback;
}

export default async function RequestLabPage({
  searchParams
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const rawRequest = getValue(searchParams?.raw_request, "");
  let parseError: string | undefined;
  const parsedRawRequest = rawRequest
    ? (() => {
        try {
          return parseRawHttpRequest(rawRequest);
        } catch (cause) {
          parseError = cause instanceof Error ? cause.message : "Could not parse raw HTTP request.";
          return null;
        }
      })()
    : null;

  const initialUrl = parsedRawRequest?.url ?? getValue(searchParams?.url, "http://localhost:8000/debug/echo");
  const initialMethod = (parsedRawRequest?.method ?? getValue(searchParams?.method, "GET")).toUpperCase();
  const initialHeaders = parsedRawRequest?.headersJson ?? getValue(
    searchParams?.headers,
    '{\n  "x-test-header": "digital-barn-finds",\n  "accept": "application/json"\n}'
  );
  const initialBody = parsedRawRequest?.body ?? getValue(searchParams?.body, "");
  const shouldRun = getValue(searchParams?.run) === "1";

  let result:
    | {
        request: {
          method: string;
          url: string;
          headers: Array<{ name: string; value: string }>;
          follow_redirects: boolean;
          timeout_seconds: number;
        };
        response: {
          attempted: boolean;
          status_code: number | null;
          final_url: string | null;
          headers: Array<{ name: string; value: string }>;
          elapsed_ms: number | null;
          content_type: string | null;
          body_preview: string | null;
          error: string | null;
        };
      }
    | undefined;
  let error: string | undefined;

  if (shouldRun) {
    try {
      const parsedHeaders = JSON.parse(initialHeaders) as Record<string, string>;
      result = await runRequestLab({
        url: initialUrl,
        method: initialMethod,
        headers: parsedHeaders,
        body: initialBody || undefined
      });
    } catch (cause) {
      error = cause instanceof Error ? cause.message : "Request lab failed.";
    }
  }

  error = parseError ?? error;

  return (
    <RequestLabPanel
      error={error}
      initialBody={initialBody}
      initialHeaders={initialHeaders}
      initialMethod={initialMethod}
      initialRawRequest={rawRequest}
      initialUrl={initialUrl}
      result={result}
    />
  );
}

function parseRawHttpRequest(raw: string): {
  url: string;
  method: string;
  headersJson: string;
  body: string;
} {
  const normalized = raw.replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    throw new Error("Raw HTTP capture is empty.");
  }

  const [head, ...bodyParts] = normalized.split("\n\n");
  const lines = head.split("\n").map((line) => line.trimEnd());
  const requestLine = lines.shift();
  if (!requestLine) {
    throw new Error("Missing request line.");
  }

  const requestMatch = requestLine.match(/^([A-Z]+)\s+(\S+)\s+HTTP\/\d(?:\.\d)?$/i);
  if (!requestMatch) {
    throw new Error("Request line must look like 'GET /path HTTP/1.1'.");
  }

  const [, method, rawPath] = requestMatch;
  const headers: Record<string, string> = {};
  for (const line of lines) {
    if (!line.trim()) {
      continue;
    }
    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) {
      throw new Error(`Header line is invalid: ${line}`);
    }
    const name = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    if (name) {
      headers[name] = value;
    }
  }

  const host = headers.Host ?? headers.host;
  const url = buildUrlFromRawPath(rawPath, host);
  return {
    url,
    method: method.toUpperCase(),
    headersJson: JSON.stringify(headers, null, 2),
    body: bodyParts.join("\n\n"),
  };
}

function buildUrlFromRawPath(rawPath: string, host: string | undefined): string {
  if (/^https?:\/\//i.test(rawPath)) {
    return rawPath;
  }
  if (!host) {
    throw new Error("Relative request paths require a Host header.");
  }
  return `http://${host}${rawPath}`;
}
