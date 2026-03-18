"use client";

import type { Route } from "next";
import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";

import type { VehicleModelRow } from "@/lib/api";

const tierFilters = ["all", "A", "B", "C", "D"] as const;
const tierCycle: Array<VehicleModelRow["tier"]> = [null, "A", "B", "C", "D"];

type ScopeEditorProps = {
  rows: VehicleModelRow[];
};

type NewModelDraft = {
  make: string;
  model: string;
  variant: string;
  tier: VehicleModelRow["tier"];
};

export function ScopeEditor({ rows }: ScopeEditorProps) {
  const [models, setModels] = useState(() => sortVehicleModels(rows));
  const [tierFilter, setTierFilter] = useState<(typeof tierFilters)[number]>("all");
  const [makeFilter, setMakeFilter] = useState("");
  const [showDirtyOnly, setShowDirtyOnly] = useState(false);
  const [dirtyIds, setDirtyIds] = useState<string[]>([]);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [seedFile, setSeedFile] = useState<File | null>(null);
  const [draft, setDraft] = useState<NewModelDraft>({
    make: "",
    model: "",
    variant: "",
    tier: "A"
  });
  const deferredMakeFilter = useDeferredValue(makeFilter);

  const visibleModels = useMemo(() => {
    const normalizedMakeFilter = deferredMakeFilter.trim().toLowerCase();
    return models.filter((row) => {
      if (tierFilter !== "all" && row.tier !== tierFilter) {
        return false;
      }
      if (showDirtyOnly && !dirtyIds.includes(row.id)) {
        return false;
      }
      if (!normalizedMakeFilter) {
        return true;
      }
      return [row.make, row.model, row.variant ?? ""].some((part) =>
        part.toLowerCase().includes(normalizedMakeFilter)
      );
    });
  }, [deferredMakeFilter, dirtyIds, models, showDirtyOnly, tierFilter]);

  const activeCount = models.filter((row) => row.in_scope).length;

  async function updateVehicleModel(row: VehicleModelRow, successMessage?: string) {
    setIsBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/vehicle-models/${row.id}`, {
        method: "PUT",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify(toVehicleModelPayload(row))
      });

      if (!response.ok) {
        throw new Error(await readClientError(response));
      }

      const saved = (await response.json()) as VehicleModelRow;
      setModels((currentRows) =>
        sortVehicleModels(currentRows.map((item) => (item.id === saved.id ? saved : item)))
      );
      setDirtyIds((currentIds) => Array.from(new Set([...currentIds, saved.id])));
      if (successMessage) {
        setMessage(successMessage);
      }
      return saved;
    } catch (caughtError) {
      const nextError = caughtError instanceof Error ? caughtError.message : "Update failed.";
      setError(nextError);
      throw caughtError;
    } finally {
      setIsBusy(false);
    }
  }

  async function createVehicleModel() {
    if (!draft.make.trim() || !draft.model.trim()) {
      setError("Make and model are required.");
      return;
    }

    setIsBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/vehicle-models", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          make: draft.make.trim(),
          model: draft.model.trim(),
          variant: draft.variant.trim() || null,
          tier: draft.tier,
          in_scope: true
        })
      });

      if (!response.ok) {
        throw new Error(await readClientError(response));
      }

      const created = (await response.json()) as VehicleModelRow;
      setModels((currentRows) => sortVehicleModels([...currentRows, created]));
      setDirtyIds((currentIds) => Array.from(new Set([...currentIds, created.id])));
      setDraft({
        make: "",
        model: "",
        variant: "",
        tier: "A"
      });
      setMessage(`Added ${created.make} ${created.model}.`);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not add model.");
    } finally {
      setIsBusy(false);
    }
  }

  async function uploadSeedFile() {
    if (!seedFile) {
      setError("Choose a CSV file first.");
      return;
    }

    setIsBusy(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.set("file", seedFile, seedFile.name);

      const response = await fetch("/api/admin/chassis-seed/import", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        throw new Error(await readClientError(response));
      }

      const result = (await response.json()) as {
        requested: number;
        imported: number;
        updated_existing: number;
        skipped_duplicates: number;
      };

      setMessage(
        `Seed import processed ${result.requested} rows. Imported ${result.imported}, updated ${result.updated_existing}, skipped ${result.skipped_duplicates}.`
      );
      setSeedFile(null);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Seed import failed.");
    } finally {
      setIsBusy(false);
    }
  }

  async function reorderVehicleModels(sourceId: string, targetId: string) {
    if (sourceId === targetId) {
      return;
    }

    const previousRows = models;
    const sourceIndex = previousRows.findIndex((row) => row.id === sourceId);
    const targetIndex = previousRows.findIndex((row) => row.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) {
      return;
    }

    const reordered = [...previousRows];
    const [movedRow] = reordered.splice(sourceIndex, 1);
    reordered.splice(targetIndex, 0, movedRow);

    const normalized = reordered.map((row, index) => ({
      ...row,
      sort_order: index
    }));
    const changedRows = normalized.filter((row, index) => row.sort_order !== previousRows[index]?.sort_order);

    setModels(normalized);
    setIsBusy(true);
    setError(null);

    try {
      await Promise.all(
        changedRows.map(async (row) => {
          const response = await fetch(`/api/admin/vehicle-models/${row.id}`, {
            method: "PUT",
            headers: {
              "content-type": "application/json"
            },
            body: JSON.stringify(toVehicleModelPayload(row))
          });

          if (!response.ok) {
            throw new Error(await readClientError(response));
          }

          return response.json();
        })
      );

      setDirtyIds((currentIds) => Array.from(new Set([...currentIds, ...changedRows.map((row) => row.id)])));
      setMessage("Scope order updated.");
    } catch (caughtError) {
      setModels(previousRows);
      setError(caughtError instanceof Error ? caughtError.message : "Could not update scope order.");
    } finally {
      setIsBusy(false);
    }
  }

  function handleTierCycle(row: VehicleModelRow) {
    const currentIndex = tierCycle.indexOf(row.tier);
    const nextTier = tierCycle[(currentIndex + 1) % tierCycle.length];
    void updateVehicleModel({ ...row, tier: nextTier }, "Tier updated.");
  }

  function handleScopeToggle(row: VehicleModelRow) {
    void updateVehicleModel({ ...row, in_scope: !row.in_scope }, row.in_scope ? "Removed from scope." : "Restored to scope.");
  }

  function moveRow(rowId: string, direction: -1 | 1) {
    const index = models.findIndex((row) => row.id === rowId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= models.length) {
      return;
    }
    void reorderVehicleModels(rowId, models[nextIndex].id);
  }

  return (
    <section className="card scope-shell">
      <div className="scope-toolbar">
        <div className="scope-toolbar__filters">
          <input
            className="field"
            onChange={(event) => setMakeFilter(event.target.value)}
            placeholder="Filter make or model"
            type="search"
            value={makeFilter}
          />
          <select className="field" onChange={(event) => setTierFilter(event.target.value as (typeof tierFilters)[number])} value={tierFilter}>
            {tierFilters.map((tier) => (
              <option key={tier} value={tier}>
                {tier === "all" ? "All tiers" : `Tier ${tier}`}
              </option>
            ))}
          </select>
          <label className="toggle-chip">
            <input
              checked={showDirtyOnly}
              onChange={(event) => setShowDirtyOnly(event.target.checked)}
              type="checkbox"
            />
            <span>Modified only</span>
          </label>
        </div>
        <div className="scope-toolbar__meta">
          <span className="active-filter">{activeCount} active</span>
          <span className="active-filter">{dirtyIds.length} modified</span>
          {isBusy ? <span className="active-filter">Saving…</span> : null}
        </div>
      </div>

      <div className="scope-import">
        <div className="scope-import__copy">
          <h2 className="section-title">Seed intake</h2>
          <p className="empty">Upload the chassis seed CSV for the currently active scope cohort.</p>
        </div>
        <div className="scope-import__controls">
          <input
            className="field"
            accept=".csv,text/csv"
            onChange={(event) => setSeedFile(event.target.files?.[0] ?? null)}
            type="file"
          />
          <button className="button button--secondary" disabled={isBusy || !seedFile} onClick={() => void uploadSeedFile()} type="button">
            Import Seed CSV
          </button>
        </div>
      </div>

      <div className="scope-create">
        <div className="scope-create__grid">
          <input
            className="field"
            onChange={(event) => setDraft((currentDraft) => ({ ...currentDraft, make: event.target.value }))}
            placeholder="Make"
            type="text"
            value={draft.make}
          />
          <input
            className="field"
            onChange={(event) => setDraft((currentDraft) => ({ ...currentDraft, model: event.target.value }))}
            placeholder="Model"
            type="text"
            value={draft.model}
          />
          <input
            className="field"
            onChange={(event) => setDraft((currentDraft) => ({ ...currentDraft, variant: event.target.value }))}
            placeholder="Variant"
            type="text"
            value={draft.variant}
          />
          <select
            className="field"
            onChange={(event) =>
              setDraft((currentDraft) => ({
                ...currentDraft,
                tier: event.target.value ? (event.target.value as VehicleModelRow["tier"]) : null
              }))
            }
            value={draft.tier ?? ""}
          >
            <option value="">No tier</option>
            <option value="A">Tier A</option>
            <option value="B">Tier B</option>
            <option value="C">Tier C</option>
            <option value="D">Tier D</option>
          </select>
        </div>
        <button className="button" disabled={isBusy} onClick={() => void createVehicleModel()} type="button">
          Add Model
        </button>
      </div>

      {error ? <p className="status-note status-note--error">{error}</p> : null}
      {message ? <p className="status-note">{message}</p> : null}

      {visibleModels.length === 0 ? (
        <p className="empty">No scope models match the current filter.</p>
      ) : (
        <div className="scope-list">
          {visibleModels.map((row) => (
            <article
              className={`scope-row${row.in_scope ? "" : " scope-row--muted"}`}
              draggable
              key={row.id}
              onDragOver={(event) => event.preventDefault()}
              onDragStart={() => setDraggedId(row.id)}
              onDrop={() => {
                if (draggedId) {
                  void reorderVehicleModels(draggedId, row.id);
                }
                setDraggedId(null);
              }}
            >
              <div className="scope-row__drag">::</div>
              <div className="scope-row__body">
                <div className="scope-row__titleline">
                  <strong>{row.make}</strong>
                  <span>{row.model}</span>
                  {row.variant ? <span className="scope-row__variant">{row.variant}</span> : null}
                </div>
                <div className="scope-row__meta">
                  <span className={`badge ${row.in_scope ? "badge--hot" : ""}`}>{row.in_scope ? "In scope" : "Archived"}</span>
                  <span className="badge">Tier {row.tier ?? "—"}</span>
                  {row.darkness_pct !== null ? <span className="badge">{row.darkness_pct}% dark</span> : null}
                  {row.est_value_high !== null ? (
                    <span className="badge">
                      Up to {formatUsd(row.est_value_high)}
                    </span>
                  ) : null}
                  <Link className="source-link" href={`/admin/chassis-seed?vehicle_model_id=${row.id}` as Route}>
                    <span className="source-link__name">Open seed list</span>
                    <span className="source-link__meta">Manage chassis rows for this model</span>
                  </Link>
                </div>
              </div>
              <div className="scope-row__actions">
                <button className="button button--secondary" onClick={() => handleTierCycle(row)} type="button">
                  Cycle Tier
                </button>
                <button className="button button--secondary" onClick={() => handleScopeToggle(row)} type="button">
                  {row.in_scope ? "Remove" : "Restore"}
                </button>
                <button className="button button--secondary" onClick={() => moveRow(row.id, -1)} type="button">
                  Up
                </button>
                <button className="button button--secondary" onClick={() => moveRow(row.id, 1)} type="button">
                  Down
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function sortVehicleModels(rows: VehicleModelRow[]) {
  return [...rows].sort((left, right) => {
    const leftOrder = left.sort_order ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = right.sort_order ?? Number.MAX_SAFE_INTEGER;
    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }
    return `${left.make} ${left.model} ${left.variant ?? ""}`.localeCompare(
      `${right.make} ${right.model} ${right.variant ?? ""}`
    );
  });
}

function toVehicleModelPayload(row: VehicleModelRow) {
  return {
    make: row.make,
    model: row.model,
    variant: row.variant,
    sort_order: row.sort_order,
    tier: row.tier,
    units_built: row.units_built,
    est_value_low: row.est_value_low,
    est_value_high: row.est_value_high,
    us_delivery: row.us_delivery,
    darkness_pct: row.darkness_pct,
    seed_source: row.seed_source,
    in_scope: row.in_scope,
    designated_by: row.designated_by,
    notes: row.notes
  };
}

async function readClientError(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = (await response.json()) as { error?: string; detail?: string };
    return body.error ?? body.detail ?? `Request failed: ${response.status}`;
  }
  return (await response.text()) || `Request failed: ${response.status}`;
}

function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}
