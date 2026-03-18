import { PageHeader } from "@/components/page-header";
import { ResearchRunner } from "@/components/research-runner";
import { getChassisSeed } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function ResearchPage({
  searchParams
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const seeds = await getChassisSeed({ status: "active" });
  const initialChassis = firstParam(searchParams?.chassis) ?? "";

  return (
    <>
      <PageHeader
        eyebrow="Research"
        title="Agent Run"
        description="Launch a chassis investigation and monitor the three-phase run until the provenance report is ready."
      />
      <ResearchRunner initialChassis={initialChassis} knownSeeds={seeds} />
    </>
  );
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
