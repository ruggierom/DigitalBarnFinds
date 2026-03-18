import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authDisabled, authOptions } from "@/lib/auth";

const apiBaseUrl = process.env.API_BASE_URL;
const adminToken = process.env.API_ADMIN_TOKEN;

export async function requireAuthenticatedRoute() {
  if (authDisabled) {
    return null;
  }

  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}

export async function backendFetch(path: string, init: RequestInit = {}) {
  if (!apiBaseUrl) {
    throw new Error("API_BASE_URL is not configured.");
  }

  const headers = new Headers(init.headers);
  if (adminToken) {
    headers.set("x-admin-token", adminToken);
  }

  return fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers,
    cache: "no-store"
  });
}

export async function readBackendError(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = (await response.json()) as { detail?: string; error?: string };
    return body.detail ?? body.error ?? `API request failed: ${response.status}`;
  }

  const text = await response.text();
  return text || `API request failed: ${response.status}`;
}
