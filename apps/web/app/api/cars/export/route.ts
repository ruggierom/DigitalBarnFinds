import { NextRequest, NextResponse } from "next/server";

const apiBaseUrl = process.env.API_BASE_URL;
const adminToken = process.env.API_ADMIN_TOKEN;

export async function GET(request: NextRequest) {
  if (!apiBaseUrl) {
    return NextResponse.json({ error: "API_BASE_URL is not configured." }, { status: 500 });
  }

  const upstreamUrl = new URL(`${apiBaseUrl}/cars/export`);
  request.nextUrl.searchParams.forEach((value, key) => {
    if (key !== "view") {
      upstreamUrl.searchParams.set(key, value);
    }
  });

  const response = await fetch(upstreamUrl, {
    headers: adminToken ? { "x-admin-token": adminToken } : {},
    cache: "no-store"
  });

  if (!response.ok) {
    return NextResponse.json({ error: `Export failed: ${response.status}` }, { status: response.status });
  }

  const headers = new Headers();
  const contentType = response.headers.get("content-type");
  const disposition = response.headers.get("content-disposition");
  if (contentType) {
    headers.set("content-type", contentType);
  }
  if (disposition) {
    headers.set("content-disposition", disposition);
  }

  return new NextResponse(response.body, {
    status: 200,
    headers
  });
}
