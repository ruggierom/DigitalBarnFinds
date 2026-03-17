import { FetchMorePanel } from "@/components/fetch-more-panel";
import { ImportUrlPanel } from "@/components/import-url-panel";
import { PageHeader } from "@/components/page-header";
import { RequestDiagnosticsPanel } from "@/components/request-diagnostics-panel";
import { SettingsEditor } from "@/components/settings-editor";
import { getBarchettaRequestDiagnostics, getSettings } from "@/lib/api";

function isFeatureEnabled(value: Record<string, unknown> | undefined) {
  const enabled = value?.enabled;
  return enabled === true || enabled === "true" || enabled === 1;
}

export default async function SettingsPage({
  searchParams
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const queryValue = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
  const rows = await getSettings();
  const diagnosticsPath = queryValue(searchParams?.diag_path) ?? "/english/all.ferraris/summary/";
  const diagnosticsUserAgent = queryValue(searchParams?.diag_user_agent) ?? "";
  const diagnosticsRun = queryValue(searchParams?.diag_run) === "1";
  const showFetchMorePanel = isFeatureEnabled(rows.find((row) => row.key === "fetch_more_ui")?.value);
  const diagnostics = await getBarchettaRequestDiagnostics({
    path: diagnosticsPath,
    userAgentOverride: diagnosticsUserAgent || undefined,
    run: diagnosticsRun
  });
  const fetchResult = searchParams?.fetch_requested
    ? {
        requested: Number(searchParams.fetch_requested),
        discovered: Number(searchParams.fetch_discovered ?? 0),
        imported: Number(searchParams.fetch_imported ?? 0),
        skipped: Number(searchParams.fetch_skipped ?? 0),
        mode: String(searchParams.fetch_mode ?? "unknown"),
        source: String(searchParams.fetch_source ?? "source"),
        errors: searchParams.fetch_errors ? String(searchParams.fetch_errors) : undefined
      }
    : undefined;
  const importResult = searchParams?.import_car_id
    ? {
        sourceUrl: String(searchParams.import_url ?? ""),
        scraperKey: String(searchParams.import_scraper_key ?? ""),
        sourceName: String(searchParams.import_source_name ?? ""),
        carId: String(searchParams.import_car_id ?? ""),
        serialNumber: String(searchParams.import_serial_number ?? ""),
        make: String(searchParams.import_make ?? ""),
        model: String(searchParams.import_model ?? ""),
        sourceCount: Number(searchParams.import_source_count ?? 0),
        mediaCount: Number(searchParams.import_media_count ?? 0),
        alreadyKnownUrl: String(searchParams.import_already_known_url ?? "0") === "1"
      }
    : undefined;
  const importUrl = queryValue(searchParams?.import_url) ?? "";
  const importError = queryValue(searchParams?.import_error) ?? undefined;

  return (
    <>
      <PageHeader
        eyebrow="Settings"
        title="Scoring and admin tools"
        description="Thresholds, imports, and diagnostics."
      />
      {showFetchMorePanel ? <FetchMorePanel result={fetchResult} /> : null}
      <ImportUrlPanel defaultUrl={importUrl} error={importError} result={importResult} />
      <RequestDiagnosticsPanel
        currentPath={diagnosticsPath}
        currentUserAgentOverride={diagnosticsUserAgent}
        diagnostics={diagnostics}
      />
      <SettingsEditor rows={rows} />
    </>
  );
}
