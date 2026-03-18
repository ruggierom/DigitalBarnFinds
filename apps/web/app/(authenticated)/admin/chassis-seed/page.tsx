import { PageHeader } from "@/components/page-header";
import { ChassisSeedEditor } from "@/components/chassis-seed-editor";
import { getChassisSeed, getVehicleModels } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function ChassisSeedPage({
  searchParams
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const vehicleModels = await getVehicleModels({ in_scope: true });
  const selectedModelId = firstParam(searchParams?.vehicle_model_id) ?? vehicleModels[0]?.id ?? null;
  const rows = selectedModelId ? await getChassisSeed({ vehicle_model_id: selectedModelId }) : [];

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Chassis Seed"
        description="Browse, import, and update the seeded chassis list model by model."
      />
      <ChassisSeedEditor rows={rows} selectedModelId={selectedModelId} vehicleModels={vehicleModels} />
    </>
  );
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
