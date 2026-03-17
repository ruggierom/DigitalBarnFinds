type ApiRequestInit = RequestInit & {
  auth?: boolean;
};

export type CarSearchParams = {
  q?: string;
  query?: string;
  candidates_only?: boolean;
  make?: string;
  model?: string;
  drive_side?: string;
  original_color?: string;
  source?: string;
  serial_number?: string;
  build_date?: string;
  year_from?: number;
  year_to?: number;
  last_seen_before?: number;
  score_min?: number;
  score_max?: number;
  dark_now?: boolean;
  has_images?: boolean;
  sort?: "relevance" | "darkness_score_desc" | "last_known_year_asc" | "recently_imported_desc";
  page?: number;
  page_size?: number;
};

export function toSearchParams(params: CarSearchParams = {}) {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }
    search.set(key, String(value));
  });

  return search;
}

export type CarRow = {
  id: string;
  serial_number: string;
  make: string;
  model: string;
  variant: string | null;
  year_built: number | null;
  build_date: string | null;
  build_date_precision: string | null;
  build_date_label: string | null;
  body_style: string | null;
  drive_side: string | null;
  original_color: string | null;
  notes: string | null;
  source_count: number;
  darkness_score: number | null;
  last_known_year: number | null;
  gap_years: number | null;
  years_since_last_seen: number | null;
  is_currently_dark: boolean;
  qualifies_primary: boolean;
  qualifies_secondary: boolean;
  watchlist_status: string | null;
  sources: Array<{
    source_name: string;
    source_url: string;
    source_serial_number: string;
    scraped_at: string;
  }>;
  media: Array<{
    media_type: string;
    url: string;
    caption: string | null;
  }>;
  timeline: Array<{
    kind: string;
    event_date: string | null;
    event_date_label: string;
    event_date_precision: string;
    event_year: number | null;
    title: string;
    subtitle: string | null;
    detail: string | null;
    source_reference: string | null;
  }>;
};

const apiBaseUrl = process.env.API_BASE_URL;
const adminToken = process.env.API_ADMIN_TOKEN;

async function request<T>(path: string, init: ApiRequestInit = {}): Promise<T> {
  if (!apiBaseUrl) {
    throw new Error("API_BASE_URL is not configured.");
  }

  const headers = new Headers(init.headers);

  if (init.auth !== false && adminToken) {
    headers.set("x-admin-token", adminToken);
  }

  headers.set("content-type", "application/json");

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers,
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function getDashboardSnapshot() {
  return request<{
    candidate_count: number;
    watchlist_count: number;
    source_count: number;
    dark_now_count: number;
  }>("/dashboard");
}

export async function getCars(params: CarSearchParams = {}) {
  const search = toSearchParams(params);
  const suffix = search.size > 0 ? `?${search.toString()}` : "";
  const rows = await request<Array<CarRow>>(`/cars${suffix}`);
  return rows.map(normalizeCarRow);
}

export async function getWatchlist() {
  return request<
    Array<{
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
    }>
  >("/watchlist");
}

export async function getSources() {
  return request<Array<Record<string, unknown>>>("/sources");
}

export async function getSettings() {
  return request<
    Array<{
      key: string;
      value: Record<string, unknown>;
      description: string | null;
      updated_at: string;
    }>
  >("/settings");
}

export async function getBarchettaRequestDiagnostics(params?: {
  path?: string;
  userAgentOverride?: string;
  run?: boolean;
}) {
  const search = new URLSearchParams();

  if (params?.path) {
    search.set("path", params.path);
  }
  if (params?.userAgentOverride) {
    search.set("user_agent_override", params.userAgentOverride);
  }
  if (params?.run) {
    search.set("run", "true");
  }

  const suffix = search.size > 0 ? `?${search.toString()}` : "";

  return request<{
    path: string;
    user_agent: string;
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
  }>(`/admin/barchetta/request-diagnostics${suffix}`);
}

export async function runRequestLab(payload: {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
}) {
  return request<{
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
  }>("/admin/request-lab", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

function normalizeCarRow(row: CarRow): CarRow {
  return {
    ...row,
    media: row.media.map((item) => ({
      ...item,
      url: normalizeManagedMediaUrl(item.url)
    }))
  };
}

function normalizeManagedMediaUrl(url: string): string {
  if (!apiBaseUrl) {
    return url;
  }

  if (url.startsWith("file://")) {
    const path = url.slice("file://".length);
    return `${apiBaseUrl}/media/local?path=${encodeURIComponent(path)}`;
  }

  if (url.startsWith("dbfblob://")) {
    const key = url.slice("dbfblob://".length);
    return `${apiBaseUrl}/media/blob?key=${encodeURIComponent(key)}`;
  }

  return url;
}
