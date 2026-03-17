import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { getSources } from "@/lib/api";

export default async function SourcesPage() {
  const rows = await getSources();

  return (
    <>
      <PageHeader
        eyebrow="Sources"
        title="Source coverage"
        description="Health and output by source."
      />
      <DataTable title="Sources" rows={rows} />
    </>
  );
}
