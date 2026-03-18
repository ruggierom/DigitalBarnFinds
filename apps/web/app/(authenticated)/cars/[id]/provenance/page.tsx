import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { ProvenanceReportView } from "@/components/provenance-report-view";
import { getChassisSeedById, getProvenanceReport } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function ProvenancePage({
  params
}: {
  params: { id: string };
}) {
  const report = await loadProvenanceReport(params.id);
  const seed = report.chassis_seed_id ? await getChassisSeedById(report.chassis_seed_id) : null;

  return (
    <>
      <PageHeader
        eyebrow="Research"
        title="Provenance Report"
        description="Custody signals, outreach queue, and next actions for the current chassis."
      />
      <ProvenanceReportView report={report} seed={seed} />
    </>
  );
}

async function loadProvenanceReport(carId: string) {
  try {
    return await getProvenanceReport(carId);
  } catch (caughtError) {
    if (caughtError instanceof Error && caughtError.message.includes("404")) {
      notFound();
    }
    throw caughtError;
  }
}
