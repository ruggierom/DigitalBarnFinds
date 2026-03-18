import { NextRequest, NextResponse } from "next/server";

import { backendFetch, readBackendError, requireAuthenticatedRoute } from "@/lib/internal-api";

export async function POST(request: NextRequest) {
  const authResponse = await requireAuthenticatedRoute();
  if (authResponse) {
    return authResponse;
  }

  const payload = await request.json();
  const response = await backendFetch("/admin/jobs/research", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    return NextResponse.json({ error: await readBackendError(response) }, { status: response.status });
  }

  return NextResponse.json(await response.json());
}
