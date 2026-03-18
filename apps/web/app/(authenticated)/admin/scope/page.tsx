import { PageHeader } from "@/components/page-header";
import { ScopeEditor } from "@/components/scope-editor";
import { getVehicleModels } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function ScopePage() {
  const rows = await getVehicleModels();
  const activeCount = rows.filter((row) => row.in_scope).length;

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Vehicle Scope"
        description="Curate the model mandate before you seed or research chassis."
        meta={<div className="car-search__meta">{activeCount} active models</div>}
      />
      <ScopeEditor rows={rows} />
    </>
  );
}
