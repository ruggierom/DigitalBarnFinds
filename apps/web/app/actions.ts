"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const apiBaseUrl = process.env.API_BASE_URL;
const adminToken = process.env.API_ADMIN_TOKEN;

async function apiFetch(path: string, init: RequestInit) {
  if (!apiBaseUrl || !adminToken) {
    throw new Error("API configuration is missing.");
  }

  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json");
  headers.set("x-admin-token", adminToken);

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers,
    cache: "no-store"
  });

  const contentType = response.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json") ? await response.json() : null;

  if (!response.ok) {
    const detail =
      typeof body?.detail === "string"
        ? body.detail
        : Array.isArray(body?.errors)
          ? body.errors.join("; ")
          : null;
    throw new Error(detail ? `API request failed: ${detail}` : `API request failed: ${response.status}`);
  }

  if (contentType.includes("application/json")) {
    return body;
  }
}

export async function upsertWatchlistAction(formData: FormData) {
  const carId = String(formData.get("car_id") ?? "");
  const priority = Number(formData.get("priority") ?? 3);
  const status = String(formData.get("status") ?? "candidate");
  const interestReason = String(formData.get("interest_reason") ?? "");
  const agentInstructions = String(formData.get("agent_instructions") ?? "");
  const notes = String(formData.get("notes") ?? "");

  await apiFetch(`/watchlist/${carId}`, {
    method: "PUT",
    body: JSON.stringify({
      priority,
      status,
      interest_reason: interestReason || null,
      agent_instructions: agentInstructions || null,
      notes: notes || null
    })
  });

  revalidatePath("/dashboard");
  revalidatePath("/cars");
  revalidatePath("/watchlist");
}

export async function updateSettingAction(formData: FormData) {
  const key = String(formData.get("key") ?? "");
  const rawValue = String(formData.get("value") ?? "{}");

  await apiFetch(`/settings/${key}`, {
    method: "PUT",
    body: JSON.stringify({
      value: JSON.parse(rawValue)
    })
  });

  revalidatePath("/settings");
  revalidatePath("/dashboard");
}

export async function fetchMoreCarsAction(formData: FormData) {
  const limit = 5;

  const result = (await apiFetch(`/admin/jobs/fetch?limit=${encodeURIComponent(String(limit))}`, {
    method: "POST"
  })) as {
    requested: number;
    discovered: number;
    imported: number;
    skipped_existing: number;
    source_name: string;
    mode_used: string;
    errors: string[];
  };

  revalidatePath("/cars");
  revalidatePath("/dashboard");
  revalidatePath("/sources");
  revalidatePath("/settings");

  const params = new URLSearchParams({
    fetch_requested: String(result.requested),
    fetch_discovered: String(result.discovered),
    fetch_imported: String(result.imported),
    fetch_skipped: String(result.skipped_existing),
    fetch_mode: result.mode_used,
    fetch_source: result.source_name
  });

  if (result.errors.length > 0) {
    params.set("fetch_errors", result.errors.join(" | "));
  }

  redirect(`/settings?${params.toString()}`);
}

export async function importCarByUrlAction(formData: FormData) {
  const url = String(formData.get("url") ?? "").trim();

  if (!url) {
    redirect("/settings?import_error=URL%20is%20required.");
  }

  try {
    const result = (await apiFetch("/admin/jobs/import-url", {
      method: "POST",
      body: JSON.stringify({ url })
    })) as {
      scraper_key: string;
      source_name: string;
      source_url: string;
      car_id: string;
      serial_number: string;
      make: string;
      model: string;
      source_count: number;
      media_count: number;
      already_known_url: boolean;
    };

    revalidatePath("/cars");
    revalidatePath("/dashboard");
    revalidatePath("/sources");
    revalidatePath("/settings");

    const params = new URLSearchParams({
      import_url: result.source_url,
      import_scraper_key: result.scraper_key,
      import_source_name: result.source_name,
      import_car_id: result.car_id,
      import_serial_number: result.serial_number,
      import_make: result.make,
      import_model: result.model,
      import_source_count: String(result.source_count),
      import_media_count: String(result.media_count),
      import_already_known_url: result.already_known_url ? "1" : "0"
    });

    redirect(`/settings?${params.toString()}`);
  } catch (error) {
    const message = error instanceof Error ? error.message.replace(/^API request failed:\s*/, "") : "Import failed.";
    const params = new URLSearchParams({
      import_url: url,
      import_error: message
    });
    redirect(`/settings?${params.toString()}`);
  }
}
