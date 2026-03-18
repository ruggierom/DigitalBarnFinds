"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import type { ChassisSeedRow, VehicleModelRow } from "@/lib/api";

const editableFields = ["last_known_location", "last_known_owner", "status", "dark_pct_est"] as const;
const statusOptions = ["active", "located", "sold", "destroyed"] as const;

type EditableField = (typeof editableFields)[number];

type ChassisSeedEditorProps = {
  vehicleModels: VehicleModelRow[];
  rows: ChassisSeedRow[];
  selectedModelId: string | null;
};

type NewSeedDraft = {
  chassis_number: string;
  last_known_location: string;
  last_known_owner: string;
  dark_pct_est: string;
  status: string;
};

export function ChassisSeedEditor({
  vehicleModels,
  rows: initialRows,
  selectedModelId
}: ChassisSeedEditorProps) {
  const router = useRouter();
  const [isNavigating, startTransition] = useTransition();
  const [rows, setRows] = useState(initialRows);
  const [savedRowsById, setSavedRowsById] = useState(() => indexRows(initialRows));
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingRowIds, setSavingRowIds] = useState<string[]>([]);
  const [isAddingRow, setIsAddingRow] = useState(false);
  const [newSeedDraft, setNewSeedDraft] = useState<NewSeedDraft>({
    chassis_number: "",
    last_known_location: "",
    last_known_owner: "",
    dark_pct_est: "",
    status: "active"
  });
  const [importFile, setImportFile] = useState<File | null>(null);
  const [notesRowId, setNotesRowId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState("");
  const fieldRefs = useRef<Map<string, HTMLInputElement | HTMLSelectElement>>(new Map());

  useEffect(() => {
    setRows(initialRows);
    setSavedRowsById(indexRows(initialRows));
  }, [initialRows]);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "n") {
        event.preventDefault();
        setIsAddingRow(true);
      }
    }

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  const selectedModel = vehicleModels.find((row) => row.id === selectedModelId) ?? null;
  const totalCount = rows.length;
  const darkCount = rows.filter((row) => (row.dark_pct_est ?? -1) >= 50).length;
  const accountedCount = rows.filter((row) => row.car_id !== null).length;
  const unresearchedCount = rows.filter((row) => row.car_id === null).length;

  async function saveSeedUpdate(seedId: string, updates: Record<string, unknown>) {
    setSavingRowIds((currentIds) => Array.from(new Set([...currentIds, seedId])));
    setError(null);

    try {
      const response = await fetch(`/api/admin/chassis-seed/${seedId}`, {
        method: "PUT",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error(await readClientError(response));
      }

      const saved = (await response.json()) as ChassisSeedRow;
      setRows((currentRows) => currentRows.map((row) => (row.id === saved.id ? saved : row)));
      setSavedRowsById((currentRows) => ({
        ...currentRows,
        [saved.id]: saved
      }));
      setMessage(`Saved ${saved.chassis_number}.`);
      return saved;
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Save failed.");
      throw caughtError;
    } finally {
      setSavingRowIds((currentIds) => currentIds.filter((id) => id !== seedId));
    }
  }

  function updateLocalRow(seedId: string, updates: Partial<ChassisSeedRow>) {
    setRows((currentRows) => currentRows.map((row) => (row.id === seedId ? { ...row, ...updates } : row)));
  }

  async function handleFieldBlur(seedId: string, field: EditableField) {
    const row = rows.find((item) => item.id === seedId);
    const saved = savedRowsById[seedId];
    if (!row || !saved) {
      return;
    }

    if (normalizeSeedValue(row[field]) === normalizeSeedValue(saved[field])) {
      return;
    }

    await saveSeedUpdate(seedId, {
      [field]: row[field]
    });
  }

  async function handleFieldEnter(seedId: string, field: EditableField) {
    await handleFieldBlur(seedId, field);
    focusNextField(seedId, field);
  }

  function handleFieldEscape(seedId: string, field: EditableField) {
    const saved = savedRowsById[seedId];
    if (!saved) {
      return;
    }
    updateLocalRow(seedId, {
      [field]: saved[field]
    });
  }

  async function createSeedRow() {
    if (!selectedModelId) {
      setError("Select a vehicle model first.");
      return;
    }

    const normalizedChassis = newSeedDraft.chassis_number.trim();
    if (!normalizedChassis) {
      setError("Chassis number is required.");
      return;
    }

    const exists = rows.some(
      (row) => row.chassis_number.trim().toLowerCase() === normalizedChassis.toLowerCase()
    );
    if (exists) {
      setError("That chassis number already exists in this seed list.");
      return;
    }

    try {
      const response = await fetch("/api/admin/chassis-seed", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          vehicle_model_id: selectedModelId,
          chassis_number: normalizedChassis,
          last_known_location: emptyToNull(newSeedDraft.last_known_location),
          last_known_owner: emptyToNull(newSeedDraft.last_known_owner),
          dark_pct_est: newSeedDraft.dark_pct_est ? Number(newSeedDraft.dark_pct_est) : null,
          status: newSeedDraft.status
        })
      });

      if (!response.ok) {
        throw new Error(await readClientError(response));
      }

      const created = (await response.json()) as ChassisSeedRow;
      const nextRows = [...rows, created].sort((left, right) =>
        left.chassis_number.localeCompare(right.chassis_number)
      );
      setRows(nextRows);
      setSavedRowsById((currentRows) => ({
        ...currentRows,
        [created.id]: created
      }));
      setNewSeedDraft({
        chassis_number: "",
        last_known_location: "",
        last_known_owner: "",
        dark_pct_est: "",
        status: "active"
      });
      setIsAddingRow(false);
      setMessage(`Added chassis ${created.chassis_number}.`);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not add chassis.");
    }
  }

  async function uploadSeedCsv() {
    if (!importFile) {
      setError("Choose a CSV file first.");
      return;
    }

    try {
      const formData = new FormData();
      formData.set("file", importFile, importFile.name);
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
        skipped_duplicates: number;
      };

      setMessage(
        `CSV import processed ${result.requested} rows. Imported ${result.imported}, skipped ${result.skipped_duplicates}.`
      );
      setImportFile(null);
      startTransition(() => {
        router.refresh();
      });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "CSV import failed.");
    }
  }

  async function saveNotes() {
    if (!notesRowId) {
      return;
    }

    try {
      await saveSeedUpdate(notesRowId, {
        notes: emptyToNull(notesDraft)
      });
      setNotesRowId(null);
      setNotesDraft("");
    } catch {
      // saveSeedUpdate already set the error state.
    }
  }

  function handleModelChange(nextModelId: string) {
    const nextSearch = nextModelId ? `?vehicle_model_id=${encodeURIComponent(nextModelId)}` : "";
    startTransition(() => {
      router.push(`/admin/chassis-seed${nextSearch}` as Route);
    });
  }

  function setFieldRef(seedId: string, field: EditableField, node: HTMLInputElement | HTMLSelectElement | null) {
    const key = `${seedId}:${field}`;
    if (node) {
      fieldRefs.current.set(key, node);
      return;
    }
    fieldRefs.current.delete(key);
  }

  function focusNextField(seedId: string, field: EditableField) {
    const index = rows.findIndex((row) => row.id === seedId);
    const nextRow = rows[index + 1];
    if (!nextRow) {
      return;
    }
    fieldRefs.current.get(`${nextRow.id}:${field}`)?.focus();
  }

  return (
    <section className="card seed-shell">
      <div className="seed-toolbar">
        <div className="seed-toolbar__selectors">
          <select
            className="field"
            disabled={vehicleModels.length === 0}
            onChange={(event) => handleModelChange(event.target.value)}
            value={selectedModelId ?? ""}
          >
            {vehicleModels.length === 0 ? <option value="">No models in scope yet</option> : null}
            {vehicleModels.map((row) => (
              <option key={row.id} value={row.id}>
                {[row.make, row.model, row.variant].filter(Boolean).join(" ")}
              </option>
            ))}
          </select>
          <button className="button button--secondary" onClick={() => setIsAddingRow(true)} type="button">
            Add row
          </button>
        </div>
        <div className="seed-toolbar__import">
          <input
            className="field"
            accept=".csv,text/csv"
            onChange={(event) => setImportFile(event.target.files?.[0] ?? null)}
            type="file"
          />
          <button className="button button--secondary" disabled={!importFile} onClick={() => void uploadSeedCsv()} type="button">
            Import CSV
          </button>
        </div>
      </div>

      <div className="seed-stats">
        <div className="stat-chip">
          <span className="stat-chip__label">Model</span>
          <strong>{selectedModel ? [selectedModel.make, selectedModel.model, selectedModel.variant].filter(Boolean).join(" ") : "—"}</strong>
        </div>
        <div className="stat-chip">
          <span className="stat-chip__label">Total chassis</span>
          <strong>{totalCount}</strong>
        </div>
        <div className="stat-chip">
          <span className="stat-chip__label">Dark count</span>
          <strong>{darkCount}</strong>
        </div>
        <div className="stat-chip">
          <span className="stat-chip__label">Accounted</span>
          <strong>{accountedCount}</strong>
        </div>
        <div className="stat-chip">
          <span className="stat-chip__label">Unresearched</span>
          <strong>{unresearchedCount}</strong>
        </div>
      </div>

      {isNavigating ? <p className="status-note">Loading selected model…</p> : null}
      {error ? <p className="status-note status-note--error">{error}</p> : null}
      {message ? <p className="status-note">{message}</p> : null}

      {vehicleModels.length === 0 ? (
        <p className="empty">
          No vehicle models are defined yet. Start in <Link href="/admin/scope">Scope</Link>.
        </p>
      ) : (
        <div className="table-wrap">
          <table className="seed-table">
            <thead>
              <tr>
                <th>Chassis</th>
                <th>Spec</th>
                <th>Delivery</th>
                <th>Destination</th>
                <th>Last seen</th>
                <th>Owner</th>
                <th>Dark %</th>
                <th>Status</th>
                <th>Read only</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isSaving = savingRowIds.includes(row.id);
                return (
                  <tr key={row.id}>
                    <td>
                      <div className="seed-cell__primary">{row.chassis_number}</div>
                      <div className="seed-cell__sub">{row.production_number ?? row.engine_number ?? "No secondary number"}</div>
                    </td>
                    <td>
                      <div className="seed-cell__primary">{[row.color_ext, row.color_int].filter(Boolean).join(" / ") || "—"}</div>
                      <div className="seed-pillrow">
                        {row.us_spec ? <span className="badge">US spec</span> : null}
                        {row.split_sump ? <span className="badge">Split sump</span> : null}
                        {row.ac_factory ? <span className="badge">Factory A/C</span> : null}
                      </div>
                    </td>
                    <td>
                      <div className="seed-cell__primary">{row.delivery_date ?? "—"}</div>
                      <div className="seed-cell__sub">{row.dealer ?? "No dealer"}</div>
                    </td>
                    <td>
                      <div className="seed-cell__primary">{row.destination_country ?? "—"}</div>
                      <div className="seed-cell__sub">{row.destination_region ?? "—"}</div>
                    </td>
                    <td>
                      <input
                        className="field seed-field"
                        onBlur={() => void handleFieldBlur(row.id, "last_known_location")}
                        onChange={(event) => updateLocalRow(row.id, { last_known_location: event.target.value })}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            void handleFieldEnter(row.id, "last_known_location");
                          }
                          if (event.key === "Escape") {
                            handleFieldEscape(row.id, "last_known_location");
                            (event.currentTarget as HTMLInputElement).blur();
                          }
                        }}
                        placeholder="Scottsdale AZ"
                        ref={(node) => setFieldRef(row.id, "last_known_location", node)}
                        type="text"
                        value={row.last_known_location ?? ""}
                      />
                    </td>
                    <td>
                      <input
                        className="field seed-field"
                        onBlur={() => void handleFieldBlur(row.id, "last_known_owner")}
                        onChange={(event) => updateLocalRow(row.id, { last_known_owner: event.target.value })}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            void handleFieldEnter(row.id, "last_known_owner");
                          }
                          if (event.key === "Escape") {
                            handleFieldEscape(row.id, "last_known_owner");
                            (event.currentTarget as HTMLInputElement).blur();
                          }
                        }}
                        placeholder="Owner or custodian"
                        ref={(node) => setFieldRef(row.id, "last_known_owner", node)}
                        type="text"
                        value={row.last_known_owner ?? ""}
                      />
                    </td>
                    <td>
                      <input
                        className="field seed-field seed-field--short"
                        max={100}
                        min={0}
                        onBlur={() => void handleFieldBlur(row.id, "dark_pct_est")}
                        onChange={(event) =>
                          updateLocalRow(row.id, {
                            dark_pct_est: event.target.value === "" ? null : Number(event.target.value)
                          })
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            void handleFieldEnter(row.id, "dark_pct_est");
                          }
                          if (event.key === "Escape") {
                            handleFieldEscape(row.id, "dark_pct_est");
                            (event.currentTarget as HTMLInputElement).blur();
                          }
                        }}
                        ref={(node) => setFieldRef(row.id, "dark_pct_est", node)}
                        type="number"
                        value={row.dark_pct_est ?? ""}
                      />
                    </td>
                    <td>
                      <select
                        className="field seed-field"
                        onBlur={() => void handleFieldBlur(row.id, "status")}
                        onChange={(event) => updateLocalRow(row.id, { status: event.target.value })}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            void handleFieldEnter(row.id, "status");
                          }
                          if (event.key === "Escape") {
                            handleFieldEscape(row.id, "status");
                            (event.currentTarget as HTMLSelectElement).blur();
                          }
                        }}
                        ref={(node) => setFieldRef(row.id, "status", node)}
                        value={row.status}
                      >
                        {statusOptions.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <div className="seed-cell__sub">{row.seed_source ?? "—"}</div>
                      <div className="seed-cell__sub">{row.seed_date ?? "—"}</div>
                      <div className="seed-pillrow">
                        <span className="badge">{row.confidence}</span>
                        {isSaving ? <span className="badge">Saving…</span> : null}
                      </div>
                    </td>
                    <td>
                      <div className="seed-actions">
                        <button
                          className="button button--secondary"
                          onClick={() => {
                            setNotesRowId(row.id);
                            setNotesDraft(row.notes ?? "");
                          }}
                          type="button"
                        >
                          Notes
                        </button>
                        {row.car_id ? (
                          <Link className="button button--secondary" href={`/cars/${row.car_id}/provenance` as Route}>
                            View provenance
                          </Link>
                        ) : (
                          <Link
                            className="button button--secondary"
                            href={`/research?chassis=${encodeURIComponent(row.chassis_number)}` as Route}
                          >
                            Run research
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {isAddingRow ? (
                <tr className="seed-row seed-row--new">
                  <td>
                    <input
                      autoFocus
                      className="field seed-field"
                      onChange={(event) =>
                        setNewSeedDraft((currentDraft) => ({
                          ...currentDraft,
                          chassis_number: event.target.value
                        }))
                      }
                      placeholder="Required"
                      type="text"
                      value={newSeedDraft.chassis_number}
                    />
                  </td>
                  <td>New row</td>
                  <td>—</td>
                  <td>—</td>
                  <td>
                    <input
                      className="field seed-field"
                      onChange={(event) =>
                        setNewSeedDraft((currentDraft) => ({
                          ...currentDraft,
                          last_known_location: event.target.value
                        }))
                      }
                      placeholder="Last known place"
                      type="text"
                      value={newSeedDraft.last_known_location}
                    />
                  </td>
                  <td>
                    <input
                      className="field seed-field"
                      onChange={(event) =>
                        setNewSeedDraft((currentDraft) => ({
                          ...currentDraft,
                          last_known_owner: event.target.value
                        }))
                      }
                      placeholder="Owner"
                      type="text"
                      value={newSeedDraft.last_known_owner}
                    />
                  </td>
                  <td>
                    <input
                      className="field seed-field seed-field--short"
                      max={100}
                      min={0}
                      onChange={(event) =>
                        setNewSeedDraft((currentDraft) => ({
                          ...currentDraft,
                          dark_pct_est: event.target.value
                        }))
                      }
                      placeholder="0-100"
                      type="number"
                      value={newSeedDraft.dark_pct_est}
                    />
                  </td>
                  <td>
                    <select
                      className="field seed-field"
                      onChange={(event) =>
                        setNewSeedDraft((currentDraft) => ({
                          ...currentDraft,
                          status: event.target.value
                        }))
                      }
                      value={newSeedDraft.status}
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>Inline add</td>
                  <td>
                    <div className="seed-actions">
                      <button className="button" onClick={() => void createSeedRow()} type="button">
                        Save
                      </button>
                      <button
                        className="button button--secondary"
                        onClick={() => setIsAddingRow(false)}
                        type="button"
                      >
                        Cancel
                      </button>
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}

      {notesRowId ? (
        <div className="modal-backdrop" role="presentation">
          <div className="modal-card" role="dialog" aria-modal="true" aria-label="Edit notes">
            <h3 className="section-title">Research notes</h3>
            <textarea
              className="field field--expanding"
              onChange={(event) => setNotesDraft(event.target.value)}
              rows={8}
              value={notesDraft}
            />
            <div className="modal-card__actions">
              <button className="button" onClick={() => void saveNotes()} type="button">
                Save notes
              </button>
              <button
                className="button button--secondary"
                onClick={() => {
                  setNotesRowId(null);
                  setNotesDraft("");
                }}
                type="button"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function indexRows(rows: ChassisSeedRow[]) {
  return Object.fromEntries(rows.map((row) => [row.id, row])) as Record<string, ChassisSeedRow>;
}

function emptyToNull(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeSeedValue(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value);
}

async function readClientError(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = (await response.json()) as { error?: string; detail?: string };
    return body.error ?? body.detail ?? `Request failed: ${response.status}`;
  }
  return (await response.text()) || `Request failed: ${response.status}`;
}
