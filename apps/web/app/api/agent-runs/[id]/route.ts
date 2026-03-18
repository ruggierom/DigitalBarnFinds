import { NextRequest, NextResponse } from "next/server";

import { backendFetch, readBackendError, requireAuthenticatedRoute } from "@/lib/internal-api";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResponse = await requireAuthenticatedRoute();
  if (authResponse) {
    return authResponse;
  }

  const response = await backendFetch(`/admin/agent-runs/${params.id}`);
  if (!response.ok) {
    return NextResponse.json({ error: await readBackendError(response) }, { status: response.status });
  }

  return NextResponse.json(await response.json());
}
