import { PageHeader } from "@/components/page-header";
import { ChassisSeedEditor } from "@/components/chassis-seed-editor";
import { getChassisSeed, getVehicleModels } from "@/lib/api";

export const dynamic = "force-dynamic";
const UNASSIGNED_FILTER_VALUE = "__unassigned__";

export default async function ChassisSeedPage({
  searchParams
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const vehicleModels = await getVehicleModels({ in_scope: true });
  const requestedModelId = firstParam(searchParams?.vehicle_model_id);
  const unassignedRows = await getChassisSeed({ unassigned_only: true });
  const selectedModelId =
    requestedModelId ?? vehicleModels[0]?.id ?? (unassignedRows.length > 0 ? UNASSIGNED_FILTER_VALUE : null);
  const rows =
    selectedModelId === UNASSIGNED_FILTER_VALUE
      ? unassignedRows
      : selectedModelId
        ? await getChassisSeed({ vehicle_model_id: selectedModelId })
        : [];

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Chassis Seed"
        description="Browse, import, and update the seeded chassis list model by model."
      />
      <ChassisSeedEditor
        rows={rows}
        selectedModelId={selectedModelId}
        unassignedCount={unassignedRows.length}
        vehicleModels={vehicleModels}
      />
    </>
  );
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
