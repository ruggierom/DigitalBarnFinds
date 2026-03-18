import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { ProvenanceReportView } from "@/components/provenance-report-view";
import { getChassisSeedById, getRunProvenanceReport } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function ResearchRunProvenancePage({
  params
}: {
  params: { id: string };
}) {
  const report = await loadRunProvenanceReport(params.id);
  const seed = report.chassis_seed_id ? await getChassisSeedById(report.chassis_seed_id) : null;

  return (
    <>
      <PageHeader
        eyebrow="Research"
        title="Provenance Report"
        description="Custody signals, outreach queue, and next actions for the completed agent run."
      />
      <ProvenanceReportView report={report} seed={seed} />
    </>
  );
}

async function loadRunProvenanceReport(runId: string) {
  try {
    return await getRunProvenanceReport(runId);
  } catch (caughtError) {
    if (caughtError instanceof Error && caughtError.message.includes("404")) {
      notFound();
    }
    throw caughtError;
  }
}
