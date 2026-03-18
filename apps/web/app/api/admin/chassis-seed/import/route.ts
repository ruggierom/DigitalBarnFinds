import { NextRequest, NextResponse } from "next/server";

import { backendFetch, readBackendError, requireAuthenticatedRoute } from "@/lib/internal-api";

export async function POST(request: NextRequest) {
  const authResponse = await requireAuthenticatedRoute();
  if (authResponse) {
    return authResponse;
  }

  const incomingFormData = await request.formData();
  const file = incomingFormData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose a CSV file to import." }, { status: 400 });
  }

  const outboundFormData = new FormData();
  outboundFormData.set("file", file, file.name);

  const response = await backendFetch("/admin/chassis-seed/import", {
    method: "POST",
    body: outboundFormData
  });

  if (!response.ok) {
    return NextResponse.json({ error: await readBackendError(response) }, { status: response.status });
  }

  return NextResponse.json(await response.json());
}
