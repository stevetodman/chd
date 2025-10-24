import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import FormulaPanel from "../../components/FormulaPanel";
import LabPanel from "../../components/LabPanel";
import type {
  ContextFormulaPanel,
  ContextLabsPanel,
  ContextPanel,
  FormulaReference,
  LabValue
} from "../../lib/constants";
import { supabase } from "../../lib/supabaseClient";
import { Button } from "../../components/ui/Button";

interface EditableChoice {
  id: string;
  label: string;
  text_md: string;
  is_correct: boolean;
}

interface EditableItem {
  id: string;
  stem_md: string;
  lead_in: string | null;
  explanation_brief_md: string;
  explanation_deep_md: string | null;
  status: string;
  version: number;
  choices: EditableChoice[];
  context_panels: EditableContextPanel[];
}

type EditableContextLabsPanel = ContextLabsPanel & { labs: LabValue[] };
type EditableContextFormulaPanel = ContextFormulaPanel & {
  formulas: FormulaReference[];
  body_md?: string | null;
};
type EditableContextPanel = EditableContextLabsPanel | EditableContextFormulaPanel;

const createPanelId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `panel-${Math.random().toString(36).slice(2, 10)}`;
};

const normalizeContextPanel = (panel: unknown): EditableContextPanel | null => {
  if (!panel || typeof panel !== "object") return null;
  const record = panel as Record<string, unknown>;
  const rawKind = record.kind;
  let kind: "labs" | "formula" | null = null;
  if (rawKind === "labs" || rawKind === "formula") {
    kind = rawKind;
  } else if (Array.isArray(record.labs)) {
    kind = "labs";
  } else if (Array.isArray(record.formulas) || typeof record.body_md === "string") {
    kind = "formula";
  }
  if (!kind) return null;

  const idValue = record.id;
  const id = typeof idValue === "string" && idValue.trim().length > 0 ? idValue : createPanelId();
  const title = typeof record.title === "string" ? record.title : null;

  if (kind === "labs") {
    const labs = Array.isArray(record.labs)
      ? record.labs.map((lab) => {
          if (!lab || typeof lab !== "object") {
            return { label: "", value: "", unit: null };
          }
          const labRecord = lab as Record<string, unknown>;
          return {
            label: typeof labRecord.label === "string" ? labRecord.label : "",
            value: typeof labRecord.value === "string" ? labRecord.value : "",
            unit:
              typeof labRecord.unit === "string"
                ? labRecord.unit
                : labRecord.unit === null
                  ? null
                  : null
          };
        })
      : [];
    return {
      id,
      kind: "labs",
      title,
      labs
    } satisfies EditableContextLabsPanel;
  }

  const formulas = Array.isArray(record.formulas)
    ? record.formulas.map((formula) => {
        if (!formula || typeof formula !== "object") {
          return { name: "", expression: "" };
        }
        const formulaRecord = formula as Record<string, unknown>;
        return {
          name: typeof formulaRecord.name === "string" ? formulaRecord.name : "",
          expression:
            typeof formulaRecord.expression === "string" ? formulaRecord.expression : ""
        };
      })
    : [];
  const body_md =
    typeof record.body_md === "string"
      ? record.body_md
      : record.body_md === null
        ? null
        : null;

  return {
    id,
    kind: "formula",
    title,
    formulas,
    body_md
  } satisfies EditableContextFormulaPanel;
};

const normalizeContextPanels = (panels: unknown): EditableContextPanel[] => {
  if (!Array.isArray(panels)) return [];
  return panels
    .map((panel) => normalizeContextPanel(panel))
    .filter((panel): panel is EditableContextPanel => panel !== null);
};

const sanitizeContextPanels = (panels: EditableContextPanel[]): ContextPanel[] =>
  panels.map((panel) => {
    if (panel.kind === "labs") {
      return {
        id: panel.id,
        kind: "labs" as const,
        title: panel.title && panel.title.trim().length > 0 ? panel.title.trim() : null,
        labs: panel.labs.map((lab) => ({
          label: lab.label.trim(),
          value: lab.value.trim(),
          unit: lab.unit && lab.unit.trim().length > 0 ? lab.unit.trim() : null
        }))
      } satisfies ContextLabsPanel;
    }
    return {
      id: panel.id,
      kind: "formula" as const,
      title: panel.title && panel.title.trim().length > 0 ? panel.title.trim() : null,
      formulas: panel.formulas.map((formula) => ({
        name: formula.name.trim(),
        expression: formula.expression.trim()
      })),
      body_md:
        panel.body_md && panel.body_md.trim().length > 0 ? panel.body_md.trim() : null
    } satisfies ContextFormulaPanel;
  });

export default function ItemEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState<EditableItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadItem = useCallback(async () => {
    if (!id) {
      setLoadError("Missing item identifier.");
      setLoading(false);
      setItem(null);
      return;
    }

    setLoading(true);
    setLoadError(null);

    try {
      const { data, error } = await supabase
        .from("questions")
        .select(
          "id, stem_md, lead_in, explanation_brief_md, explanation_deep_md, status, version, context_panels, lab_panels, formula_panels, choices(id, label, text_md, is_correct)"
        )
        .eq("id", id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error("Item not found.");
      }

      const contextPanels = normalizeContextPanels(data.context_panels ?? []);
      const legacyPanels = [
        ...normalizeContextPanels(
          Array.isArray((data as Record<string, unknown>).lab_panels)
            ? ((data as Record<string, unknown>).lab_panels as unknown[]).map((panel) => ({
                ...(panel as Record<string, unknown>),
                kind: "labs" as const
              }))
            : []
        ),
        ...normalizeContextPanels(
          Array.isArray((data as Record<string, unknown>).formula_panels)
            ? ((data as Record<string, unknown>).formula_panels as unknown[]).map((panel) => ({
                ...(panel as Record<string, unknown>),
                kind: "formula" as const
              }))
            : []
        )
      ];
      const combinedPanels =
        contextPanels.length > 0
          ? [
              ...contextPanels,
              ...legacyPanels.filter(
                (panel) => !contextPanels.some((existing) => existing.id === panel.id)
              )
            ]
          : legacyPanels;

      const editable = {
        id: data.id as string,
        stem_md: data.stem_md as string,
        lead_in: (data.lead_in as string | null) ?? null,
        explanation_brief_md: data.explanation_brief_md as string,
        explanation_deep_md: (data.explanation_deep_md as string | null) ?? null,
        status: data.status as string,
        version: data.version as number,
        choices: ((data.choices ?? []) as EditableChoice[]).sort((a, b) =>
          a.label.localeCompare(b.label)
        ),
        context_panels: combinedPanels
      } satisfies EditableItem;

      setItem(editable);
    } catch (err) {
      setItem(null);
      setLoadError(err instanceof Error ? err.message : "Failed to load item.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadItem();
  }, [loadItem]);

  const updatePanels = (updater: (panels: EditableContextPanel[]) => EditableContextPanel[]) => {
    setItem((prev) =>
      prev
        ? {
            ...prev,
            context_panels: updater(prev.context_panels)
          }
        : prev
    );
  };

  const addPanel = (kind: "labs" | "formula") => {
    updatePanels((panels) => [
      ...panels,
      kind === "labs"
        ? { id: createPanelId(), kind: "labs", title: null, labs: [] }
        : { id: createPanelId(), kind: "formula", title: null, formulas: [], body_md: "" }
    ]);
  };

  const movePanel = (from: number, to: number) => {
    updatePanels((panels) => {
      if (from === to || from < 0 || to < 0 || from >= panels.length || to >= panels.length) {
        return panels;
      }
      const next = [...panels];
      const [panel] = next.splice(from, 1);
      next.splice(to, 0, panel);
      return next;
    });
  };

  const removePanel = (index: number) => {
    updatePanels((panels) => panels.filter((_, i) => i !== index));
  };

  const updatePanelTitle = (index: number, title: string) => {
    updatePanels((panels) =>
      panels.map((panel, i) => (i === index ? { ...panel, title } : panel))
    );
  };

  const updatePanelBody = (index: number, body: string) => {
    updatePanels((panels) =>
      panels.map((panel, i) =>
        i === index && panel.kind === "formula" ? { ...panel, body_md: body } : panel
      )
    );
  };

  const addLab = (panelIndex: number) => {
    updatePanels((panels) =>
      panels.map((panel, index) =>
        index === panelIndex && panel.kind === "labs"
          ? { ...panel, labs: [...panel.labs, { label: "", value: "", unit: "" }] }
          : panel
      )
    );
  };

  const updateLab = (
    panelIndex: number,
    labIndex: number,
    field: "label" | "value" | "unit",
    value: string
  ) => {
    updatePanels((panels) =>
      panels.map((panel, index) => {
        if (index !== panelIndex || panel.kind !== "labs") return panel;
        const labs = panel.labs.map((lab, idx) =>
          idx === labIndex
            ? {
                ...lab,
                [field]: value
              }
            : lab
        );
        return { ...panel, labs };
      })
    );
  };

  const removeLab = (panelIndex: number, labIndex: number) => {
    updatePanels((panels) =>
      panels.map((panel, index) =>
        index === panelIndex && panel.kind === "labs"
          ? { ...panel, labs: panel.labs.filter((_, idx) => idx !== labIndex) }
          : panel
      )
    );
  };

  const addFormula = (panelIndex: number) => {
    updatePanels((panels) =>
      panels.map((panel, index) =>
        index === panelIndex && panel.kind === "formula"
          ? { ...panel, formulas: [...panel.formulas, { name: "", expression: "" }] }
          : panel
      )
    );
  };

  const updateFormula = (
    panelIndex: number,
    formulaIndex: number,
    field: "name" | "expression",
    value: string
  ) => {
    updatePanels((panels) =>
      panels.map((panel, index) => {
        if (index !== panelIndex || panel.kind !== "formula") return panel;
        const formulas = panel.formulas.map((formula, idx) =>
          idx === formulaIndex
            ? {
                ...formula,
                [field]: value
              }
            : formula
        );
        return { ...panel, formulas };
      })
    );
  };

  const removeFormula = (panelIndex: number, formulaIndex: number) => {
    updatePanels((panels) =>
      panels.map((panel, index) =>
        index === panelIndex && panel.kind === "formula"
          ? { ...panel, formulas: panel.formulas.filter((_, idx) => idx !== formulaIndex) }
          : panel
      )
    );
  };

  const save = async () => {
    if (!item) return;
    const correctChoices = item.choices.filter((choice) => choice.is_correct);
    if (correctChoices.length !== 1) {
      setMessage("Please mark exactly one choice as correct before saving.");
      return;
    }

    const sanitizedContextPanels = sanitizeContextPanels(item.context_panels);
    const contextPanelsPayload =
      sanitizedContextPanels.length > 0 ? sanitizedContextPanels : null;
    const labPanelsPayload = sanitizedContextPanels
      .filter((panel): panel is ContextLabsPanel => panel.kind === "labs")
      .map(({ kind: _kind, ...panel }) => panel);
    const formulaPanelsPayload = sanitizedContextPanels
      .filter((panel): panel is ContextFormulaPanel => panel.kind === "formula")
      .map(({ kind: _kind, ...panel }) => panel);

    setSaving(true);
    setMessage(null);
    const { error: choiceError } = await supabase
      .from("choices")
      .upsert(
        item.choices.map((choice) => ({
          id: choice.id,
          question_id: item.id,
          label: choice.label,
          text_md: choice.text_md,
          is_correct: choice.is_correct
        })),
        { onConflict: "id" }
      );
    if (choiceError) {
      setSaving(false);
      setMessage(choiceError.message);
      return;
    }

    // Supabase integration: update question and increment version.
    const { error } = await supabase
      .from("questions")
      .update({
        stem_md: item.stem_md,
        lead_in: item.lead_in,
        explanation_brief_md: item.explanation_brief_md,
        explanation_deep_md: item.explanation_deep_md,
        status: item.status,
        version: item.version + 1,
        context_panels: contextPanelsPayload,
        lab_panels: labPanelsPayload.length > 0 ? labPanelsPayload : null,
        formula_panels: formulaPanelsPayload.length > 0 ? formulaPanelsPayload : null
      })
      .eq("id", item.id);
    setSaving(false);
    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Saved!");
      setItem((prev) =>
        prev
          ? {
              ...prev,
              version: prev.version + 1,
              context_panels: normalizeContextPanels(contextPanelsPayload ?? [])
            }
          : prev
      );
    }
  };

  if (loading) return <div>Loading item…</div>;

  if (loadError)
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-600">Failed to load item: {loadError}</p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => void loadItem()}>
            Retry
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate("/admin/items")}
          >
            Back to list
          </Button>
        </div>
      </div>
    );

  if (!item) return null;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Edit Item</h1>
      <label className="block text-sm font-medium">
        Lead-in
        <input
          type="text"
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
          value={item.lead_in ?? ""}
          onChange={(e) => setItem({ ...item, lead_in: e.target.value })}
        />
      </label>
      <label className="block text-sm font-medium">
        Stem (Markdown)
        <textarea
          className="mt-1 h-40 w-full rounded-md border border-neutral-300 px-3 py-2 font-mono"
          value={item.stem_md}
          onChange={(e) => setItem({ ...item, stem_md: e.target.value })}
        />
      </label>
      <label className="block text-sm font-medium">
        Brief explanation
        <textarea
          className="mt-1 h-32 w-full rounded-md border border-neutral-300 px-3 py-2"
          value={item.explanation_brief_md}
          onChange={(e) => setItem({ ...item, explanation_brief_md: e.target.value })}
        />
      </label>
      <label className="block text-sm font-medium">
        Deep explanation
        <textarea
          className="mt-1 h-32 w-full rounded-md border border-neutral-300 px-3 py-2"
          value={item.explanation_deep_md ?? ""}
          onChange={(e) => setItem({ ...item, explanation_deep_md: e.target.value })}
        />
      </label>
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">Choices</legend>
        <div className="space-y-4">
          {item.choices.map((choice) => (
            <div key={choice.id} className="rounded-md border border-neutral-200 bg-white p-3 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium">Choice {choice.label}</span>
                <label className="flex items-center gap-2 text-sm font-medium text-neutral-700">
                  <input
                    type="radio"
                    name="correct-choice"
                    checked={choice.is_correct}
                    onChange={() =>
                      setItem((prev) =>
                        prev
                          ? {
                              ...prev,
                              choices: prev.choices.map((c) => ({
                                ...c,
                                is_correct: c.id === choice.id
                              }))
                            }
                          : prev
                      )
                    }
                  />
                  Correct answer
                </label>
              </div>
              <textarea
                className="mt-3 w-full rounded-md border border-neutral-300 px-3 py-2"
                value={choice.text_md}
                onChange={(e) =>
                  setItem((prev) =>
                    prev
                      ? {
                          ...prev,
                          choices: prev.choices.map((c) =>
                            c.id === choice.id ? { ...c, text_md: e.target.value } : c
                          )
                        }
                      : prev
                  )
                }
              />
            </div>
          ))}
        </div>
      </fieldset>
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold">Context panels</legend>
        <p className="text-sm text-neutral-600">
          Manage the right-rail content learners see while answering this item.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => addPanel("labs")}>
            Add labs panel
          </Button>
          <Button type="button" variant="secondary" onClick={() => addPanel("formula")}>
            Add formula panel
          </Button>
        </div>
        {item.context_panels.length === 0 ? (
          <p className="text-sm text-neutral-500">No context panels yet.</p>
        ) : (
          <div className="space-y-4">
            {item.context_panels.map((panel, index) => {
              const previewHasContent =
                panel.kind === "labs"
                  ? panel.labs.some((lab) => lab.label || lab.value || lab.unit)
                  : panel.formulas.some((formula) => formula.name || formula.expression) ||
                    !!(panel.body_md && panel.body_md.trim().length > 0);
              return (
                <div
                  key={panel.id}
                  className="space-y-4 rounded-md border border-neutral-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold">
                      Panel {index + 1} · {panel.kind === "labs" ? "Labs" : "Formula"}
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        className="px-2 py-1 text-xs"
                        onClick={() => movePanel(index, index - 1)}
                        disabled={index === 0}
                      >
                        Move up
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="px-2 py-1 text-xs"
                        onClick={() => movePanel(index, index + 1)}
                        disabled={index === item.context_panels.length - 1}
                      >
                        Move down
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="px-2 py-1 text-xs text-red-600 hover:text-red-700"
                        onClick={() => removePanel(index)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                  <label className="block text-sm font-medium text-neutral-700">
                    Title
                    <input
                      type="text"
                      className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
                      value={panel.title ?? ""}
                      placeholder={panel.kind === "labs" ? "Vitals & Labs" : "Formula Quick Ref"}
                      onChange={(e) => updatePanelTitle(index, e.target.value)}
                    />
                  </label>
                  {panel.kind === "labs" ? (
                    <div className="space-y-3">
                      {panel.labs.length === 0 ? (
                        <p className="text-sm text-neutral-500">
                          Add lab values to display in this panel.
                        </p>
                      ) : (
                        panel.labs.map((lab, labIndex) => (
                          <div
                            key={`${panel.id}-lab-${labIndex}`}
                            className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,120px)_auto]"
                          >
                            <label className="block text-xs font-semibold text-neutral-600">
                              Label
                              <input
                                type="text"
                                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
                                value={lab.label}
                                onChange={(e) => updateLab(index, labIndex, "label", e.target.value)}
                              />
                            </label>
                            <label className="block text-xs font-semibold text-neutral-600">
                              Value
                              <input
                                type="text"
                                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
                                value={lab.value}
                                onChange={(e) => updateLab(index, labIndex, "value", e.target.value)}
                              />
                            </label>
                            <label className="block text-xs font-semibold text-neutral-600">
                              Unit
                              <input
                                type="text"
                                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
                                value={lab.unit ?? ""}
                                onChange={(e) => updateLab(index, labIndex, "unit", e.target.value)}
                              />
                            </label>
                            <Button
                              type="button"
                              variant="ghost"
                              className="self-end px-2 py-1 text-xs text-red-600 hover:text-red-700"
                              onClick={() => removeLab(index, labIndex)}
                            >
                              Remove
                            </Button>
                          </div>
                        ))
                      )}
                      <Button
                        type="button"
                        variant="secondary"
                        className="px-3 py-2 text-sm"
                        onClick={() => addLab(index)}
                      >
                        Add lab value
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {panel.formulas.length === 0 ? (
                        <p className="text-sm text-neutral-500">
                          Add formulas to give learners quick references.
                        </p>
                      ) : (
                        panel.formulas.map((formula, formulaIndex) => (
                          <div
                            key={`${panel.id}-formula-${formulaIndex}`}
                            className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
                          >
                            <label className="block text-xs font-semibold text-neutral-600">
                              Name
                              <input
                                type="text"
                                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
                                value={formula.name}
                                onChange={(e) => updateFormula(index, formulaIndex, "name", e.target.value)}
                              />
                            </label>
                            <label className="block text-xs font-semibold text-neutral-600">
                              Expression
                              <input
                                type="text"
                                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
                                value={formula.expression}
                                onChange={(e) =>
                                  updateFormula(index, formulaIndex, "expression", e.target.value)
                                }
                              />
                            </label>
                            <Button
                              type="button"
                              variant="ghost"
                              className="self-end px-2 py-1 text-xs text-red-600 hover:text-red-700"
                              onClick={() => removeFormula(index, formulaIndex)}
                            >
                              Remove
                            </Button>
                          </div>
                        ))
                      )}
                      <Button
                        type="button"
                        variant="secondary"
                        className="px-3 py-2 text-sm"
                        onClick={() => addFormula(index)}
                      >
                        Add formula
                      </Button>
                      <label className="block text-sm font-medium text-neutral-700">
                        Notes (Markdown)
                        <textarea
                          className="mt-1 h-32 w-full rounded-md border border-neutral-300 px-3 py-2"
                          value={panel.body_md ?? ""}
                          onChange={(e) => updatePanelBody(index, e.target.value)}
                        />
                      </label>
                    </div>
                  )}
                  <div className="rounded-md border border-dashed border-neutral-300 bg-neutral-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                      Preview
                    </p>
                    <div className="mt-3">
                      {previewHasContent ? (
                        panel.kind === "labs" ? (
                          <LabPanel labs={panel.labs} title={panel.title ?? undefined} />
                        ) : (
                          <FormulaPanel
                            title={panel.title ?? undefined}
                            formulas={panel.formulas}
                            bodyMd={panel.body_md ?? null}
                          />
                        )
                      ) : (
                        <p className="text-sm text-neutral-500">
                          Add content to see a live preview.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </fieldset>
      <label className="block text-sm font-medium">
        Status
        <select
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
          value={item.status}
          onChange={(e) => setItem({ ...item, status: e.target.value })}
        >
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
      </label>
      <Button type="button" onClick={save} disabled={saving}>
        {saving ? "Saving…" : "Save"}
      </Button>
      {message ? <p className="text-sm text-neutral-600">{message}</p> : null}
    </div>
  );
}
