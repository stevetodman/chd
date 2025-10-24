import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { Button } from "../../components/ui/Button";
import ContextPanelList from "../../components/ContextPanelList";
import type { ContextPanel } from "../../lib/constants";

type EditableContextPanelType = "labs" | "formula";

interface EditableLabValue {
  id: string;
  label: string;
  value: string;
  unit: string;
}

interface EditableFormulaReference {
  id: string;
  name: string;
  expression: string;
}

type EditableContextPanel =
  | {
      id: string;
      type: "labs";
      title: string;
      labs: EditableLabValue[];
    }
  | {
      id: string;
      type: "formula";
      title: string;
      formulas: EditableFormulaReference[];
      body_md: string;
    };

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

const createId = () => {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && typeof cryptoApi.randomUUID === "function") {
    return cryptoApi.randomUUID();
  }
  return Math.random().toString(36).slice(2, 10);
};

const createEmptyLabValue = (): EditableLabValue => ({
  id: createId(),
  label: "",
  value: "",
  unit: ""
});

const createEmptyFormulaReference = (): EditableFormulaReference => ({
  id: createId(),
  name: "",
  expression: ""
});

const toEditableContextPanels = (panels: unknown): EditableContextPanel[] => {
  if (!Array.isArray(panels)) {
    return [];
  }

  return panels
    .map((panel) => {
      if (!panel || typeof panel !== "object") {
        return null;
      }

      const baseId = typeof (panel as { id?: unknown }).id === "string" ? (panel as { id: string }).id : createId();
      const title = typeof (panel as { title?: unknown }).title === "string" ? ((panel as { title: string }).title ?? "") : "";

      if ((panel as { kind?: unknown }).kind === "labs") {
        const labsSource = Array.isArray((panel as { labs?: unknown }).labs)
          ? ((panel as { labs: unknown[] }).labs ?? [])
          : [];
        const labs = labsSource.map((lab) => ({
          id: createId(),
          label: typeof (lab as { label?: unknown }).label === "string" ? ((lab as { label: string }).label ?? "") : "",
          value: typeof (lab as { value?: unknown }).value === "string" ? ((lab as { value: string }).value ?? "") : "",
          unit: typeof (lab as { unit?: unknown }).unit === "string" ? ((lab as { unit: string }).unit ?? "") : ""
        }));
        return {
          id: baseId,
          type: "labs" as const,
          title,
          labs
        } satisfies EditableContextPanel;
      }

      if ((panel as { kind?: unknown }).kind === "formula") {
        const formulasSource = Array.isArray((panel as { formulas?: unknown }).formulas)
          ? ((panel as { formulas: unknown[] }).formulas ?? [])
          : [];
        const formulas = formulasSource.map((formula) => ({
          id: createId(),
          name:
            typeof (formula as { name?: unknown }).name === "string"
              ? ((formula as { name: string }).name ?? "")
              : "",
          expression:
            typeof (formula as { expression?: unknown }).expression === "string"
              ? ((formula as { expression: string }).expression ?? "")
              : ""
        }));
        const bodyMd =
          typeof (panel as { body_md?: unknown }).body_md === "string"
            ? ((panel as { body_md: string }).body_md ?? "")
            : "";
        return {
          id: baseId,
          type: "formula" as const,
          title,
          formulas,
          body_md: bodyMd
        } satisfies EditableContextPanel;
      }

      return null;
    })
    .filter((panel): panel is EditableContextPanel => panel !== null);
};

const toContextPanelPayload = (panels: EditableContextPanel[]): ContextPanel[] =>
  panels
    .map((panel) => {
      const trimmedTitle = panel.title.trim();

      if (panel.type === "labs") {
        const labs = panel.labs
          .map((lab) => ({
            label: lab.label.trim(),
            value: lab.value.trim(),
            unit: lab.unit.trim() || null
          }))
          .filter((lab) => lab.label.length > 0 && lab.value.length > 0);

        if (labs.length === 0) {
          return null;
        }

        return {
          id: panel.id,
          kind: "labs" as const,
          title: trimmedTitle.length > 0 ? trimmedTitle : null,
          labs
        } satisfies ContextPanel;
      }

      const bodyMd = panel.body_md.trim();
      const formulas = panel.formulas
        .map((formula) => ({
          name: formula.name.trim(),
          expression: formula.expression.trim()
        }))
        .filter((formula) => formula.name.length > 0 && formula.expression.length > 0);

      if (formulas.length === 0 && bodyMd.length === 0) {
        return null;
      }

      return {
        id: panel.id,
        kind: "formula" as const,
        title: trimmedTitle.length > 0 ? trimmedTitle : null,
        formulas: formulas.length > 0 ? formulas : null,
        body_md: bodyMd.length > 0 ? bodyMd : null
      } satisfies ContextPanel;
    })
    .filter((panel): panel is ContextPanel => panel !== null);

const validateContextPanels = (panels: EditableContextPanel[]) => {
  const errors: Record<string, string[]> = {};

  panels.forEach((panel) => {
    const messages: string[] = [];

    if (panel.type === "labs") {
      if (panel.labs.length === 0) {
        messages.push("Add at least one lab value.");
      }

      panel.labs.forEach((lab, index) => {
        const label = lab.label.trim();
        const value = lab.value.trim();

        if (label.length === 0 && value.length === 0) {
          messages.push(`Lab ${index + 1} is empty.`);
          return;
        }

        if (label.length === 0) {
          messages.push(`Lab ${index + 1} is missing a label.`);
        }
        if (value.length === 0) {
          messages.push(`Lab ${index + 1} is missing a value.`);
        }
      });
    } else {
      const body = panel.body_md.trim();
      const completedFormulas = panel.formulas.filter((formula) => {
        const name = formula.name.trim();
        const expression = formula.expression.trim();
        return name.length > 0 || expression.length > 0;
      });

      if (completedFormulas.length === 0 && body.length === 0) {
        messages.push("Add at least one formula or reference note.");
      }

      panel.formulas.forEach((formula, index) => {
        const name = formula.name.trim();
        const expression = formula.expression.trim();

        if (name.length === 0 && expression.length === 0) {
          messages.push(`Formula ${index + 1} is empty.`);
          return;
        }

        if (name.length === 0) {
          messages.push(`Formula ${index + 1} is missing a name.`);
        }
        if (expression.length === 0) {
          messages.push(`Formula ${index + 1} is missing an expression.`);
        }
      });
    }

    if (messages.length > 0) {
      errors[panel.id] = messages;
    }
  });

  return errors;
};

export default function ItemEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState<EditableItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [contextPanelErrors, setContextPanelErrors] = useState<Record<string, string[]>>({});

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
          "id, stem_md, lead_in, explanation_brief_md, explanation_deep_md, status, version, context_panels, choices(id, label, text_md, is_correct)"
        )
        .eq("id", id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error("Item not found.");
      }

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
        context_panels: toEditableContextPanels(data.context_panels ?? [])
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

  useEffect(() => {
    if (!item) {
      setContextPanelErrors({});
      return;
    }

    setContextPanelErrors(validateContextPanels(item.context_panels));
  }, [item]);

  const setPanels = (
    updater: (panels: EditableContextPanel[]) => EditableContextPanel[]
  ) => {
    setItem((prev) =>
      prev
        ? {
            ...prev,
            context_panels: updater(prev.context_panels)
          }
        : prev
    );
  };

  const addContextPanel = (type: EditableContextPanelType = "labs") => {
    const newPanel: EditableContextPanel =
      type === "labs"
        ? { id: createId(), type: "labs", title: "", labs: [createEmptyLabValue()] }
        : {
            id: createId(),
            type: "formula",
            title: "",
            formulas: [createEmptyFormulaReference()],
            body_md: ""
          };
    setPanels((panels) => [...panels, newPanel]);
  };

  const removeContextPanel = (panelId: string) => {
    setPanels((panels) => panels.filter((panel) => panel.id !== panelId));
  };

  const handlePanelTitleChange = (panelId: string, value: string) => {
    setPanels((panels) =>
      panels.map((panel) => (panel.id === panelId ? { ...panel, title: value } : panel))
    );
  };

  const handlePanelTypeChange = (panelId: string, type: EditableContextPanelType) => {
    setPanels((panels) =>
      panels.map((panel) => {
        if (panel.id !== panelId || panel.type === type) {
          return panel;
        }

        if (type === "labs") {
          const labs = panel.type === "labs" ? panel.labs : [createEmptyLabValue()];
          return {
            id: panel.id,
            type: "labs" as const,
            title: panel.title,
            labs
          } satisfies EditableContextPanel;
        }

        const formulas =
          panel.type === "formula"
            ? panel.formulas
            : [createEmptyFormulaReference()];

        return {
          id: panel.id,
          type: "formula" as const,
          title: panel.title,
          formulas,
          body_md: panel.type === "formula" ? panel.body_md : ""
        } satisfies EditableContextPanel;
      })
    );
  };

  const addLabValue = (panelId: string) => {
    setPanels((panels) =>
      panels.map((panel) =>
        panel.id === panelId && panel.type === "labs"
          ? { ...panel, labs: [...panel.labs, createEmptyLabValue()] }
          : panel
      )
    );
  };

  const updateLabValue = (
    panelId: string,
    labId: string,
    field: Exclude<keyof EditableLabValue, "id">,
    value: string
  ) => {
    setPanels((panels) =>
      panels.map((panel) => {
        if (panel.id !== panelId || panel.type !== "labs") {
          return panel;
        }

        return {
          ...panel,
          labs: panel.labs.map((lab) =>
            lab.id === labId ? { ...lab, [field]: value } : lab
          )
        };
      })
    );
  };

  const removeLabValue = (panelId: string, labId: string) => {
    setPanels((panels) =>
      panels.map((panel) =>
        panel.id === panelId && panel.type === "labs"
          ? { ...panel, labs: panel.labs.filter((lab) => lab.id !== labId) }
          : panel
      )
    );
  };

  const addFormula = (panelId: string) => {
    setPanels((panels) =>
      panels.map((panel) =>
        panel.id === panelId && panel.type === "formula"
          ? { ...panel, formulas: [...panel.formulas, createEmptyFormulaReference()] }
          : panel
      )
    );
  };

  const updateFormula = (
    panelId: string,
    formulaId: string,
    field: Exclude<keyof EditableFormulaReference, "id">,
    value: string
  ) => {
    setPanels((panels) =>
      panels.map((panel) => {
        if (panel.id !== panelId || panel.type !== "formula") {
          return panel;
        }

        return {
          ...panel,
          formulas: panel.formulas.map((formula) =>
            formula.id === formulaId ? { ...formula, [field]: value } : formula
          )
        };
      })
    );
  };

  const removeFormula = (panelId: string, formulaId: string) => {
    setPanels((panels) =>
      panels.map((panel) =>
        panel.id === panelId && panel.type === "formula"
          ? { ...panel, formulas: panel.formulas.filter((formula) => formula.id !== formulaId) }
          : panel
      )
    );
  };

  const updateFormulaBody = (panelId: string, value: string) => {
    setPanels((panels) =>
      panels.map((panel) =>
        panel.id === panelId && panel.type === "formula"
          ? { ...panel, body_md: value }
          : panel
      )
    );
  };

  const previewPanels = useMemo(
    () => (item ? toContextPanelPayload(item.context_panels) : []),
    [item]
  );

  const save = async () => {
    if (!item) return;
    const correctChoices = item.choices.filter((choice) => choice.is_correct);
    if (correctChoices.length !== 1) {
      setMessage("Please mark exactly one choice as correct before saving.");
      return;
    }

    const panelValidation = validateContextPanels(item.context_panels);
    setContextPanelErrors(panelValidation);
    if (Object.keys(panelValidation).length > 0) {
      setMessage("Please fix the context panel errors before saving.");
      return;
    }

    const contextPanelPayload = toContextPanelPayload(item.context_panels);

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
        context_panels: contextPanelPayload.length > 0 ? contextPanelPayload : null,
        status: item.status,
        version: item.version + 1
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
              version: prev.version + 1
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
          Provide supporting information that appears alongside the question stem.
        </p>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,1fr)]">
          <div className="space-y-4">
            {item.context_panels.length === 0 ? (
              <p className="text-sm text-neutral-500">No context panels added yet.</p>
            ) : (
              item.context_panels.map((panel, index) => {
                const panelErrors = contextPanelErrors[panel.id] ?? [];
                return (
                  <div
                    key={panel.id}
                    className="space-y-4 rounded-md border border-neutral-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-semibold">Panel {index + 1}</span>
                      <button
                        type="button"
                        className="text-sm font-semibold text-red-600 hover:underline"
                        onClick={() => removeContextPanel(panel.id)}
                      >
                        Remove panel
                      </button>
                    </div>
                    <label className="block text-sm font-medium text-neutral-700">
                      Panel title
                      <input
                        type="text"
                        className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
                        value={panel.title}
                        onChange={(e) => handlePanelTitleChange(panel.id, e.target.value)}
                        placeholder="Optional heading shown to learners"
                      />
                    </label>
                    <label className="block text-sm font-medium text-neutral-700">
                      Panel type
                      <select
                        className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
                        value={panel.type}
                        onChange={(e) =>
                          handlePanelTypeChange(panel.id, e.target.value as EditableContextPanelType)
                        }
                      >
                        <option value="labs">Vitals &amp; labs</option>
                        <option value="formula">Formula reference</option>
                      </select>
                    </label>
                    {panel.type === "labs" ? (
                      <div className="space-y-3">
                        {panel.labs.map((lab, labIndex) => (
                          <div key={lab.id} className="rounded-md border border-neutral-100 p-3">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold uppercase text-neutral-500">
                                Lab value {labIndex + 1}
                              </span>
                              <button
                                type="button"
                                className="text-xs font-semibold text-red-600 hover:underline"
                                onClick={() => removeLabValue(panel.id, lab.id)}
                              >
                                Remove
                              </button>
                            </div>
                            <div className="mt-3 grid gap-3 sm:grid-cols-3">
                              <label className="block text-xs font-semibold text-neutral-600">
                                Label
                                <input
                                  type="text"
                                  className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                                  value={lab.label}
                                  onChange={(e) =>
                                    updateLabValue(panel.id, lab.id, "label", e.target.value)
                                  }
                                />
                              </label>
                              <label className="block text-xs font-semibold text-neutral-600">
                                Value
                                <input
                                  type="text"
                                  className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                                  value={lab.value}
                                  onChange={(e) =>
                                    updateLabValue(panel.id, lab.id, "value", e.target.value)
                                  }
                                />
                              </label>
                              <label className="block text-xs font-semibold text-neutral-600">
                                Unit
                                <input
                                  type="text"
                                  className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                                  value={lab.unit}
                                  onChange={(e) =>
                                    updateLabValue(panel.id, lab.id, "unit", e.target.value)
                                  }
                                  placeholder="Optional"
                                />
                              </label>
                            </div>
                          </div>
                        ))}
                        <button
                          type="button"
                          className="text-sm font-semibold text-brand-600 hover:underline"
                          onClick={() => addLabValue(panel.id)}
                        >
                          Add lab value
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {panel.formulas.map((formula, formulaIndex) => (
                          <div key={formula.id} className="rounded-md border border-neutral-100 p-3">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold uppercase text-neutral-500">
                                Formula {formulaIndex + 1}
                              </span>
                              <button
                                type="button"
                                className="text-xs font-semibold text-red-600 hover:underline"
                                onClick={() => removeFormula(panel.id, formula.id)}
                              >
                                Remove
                              </button>
                            </div>
                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                              <label className="block text-xs font-semibold text-neutral-600">
                                Name
                                <input
                                  type="text"
                                  className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                                  value={formula.name}
                                  onChange={(e) =>
                                    updateFormula(panel.id, formula.id, "name", e.target.value)
                                  }
                                />
                              </label>
                              <label className="block text-xs font-semibold text-neutral-600">
                                Expression
                                <input
                                  type="text"
                                  className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                                  value={formula.expression}
                                  onChange={(e) =>
                                    updateFormula(panel.id, formula.id, "expression", e.target.value)
                                  }
                                />
                              </label>
                            </div>
                          </div>
                        ))}
                        <button
                          type="button"
                          className="text-sm font-semibold text-brand-600 hover:underline"
                          onClick={() => addFormula(panel.id)}
                        >
                          Add formula
                        </button>
                        <label className="block text-sm font-medium text-neutral-700">
                          Reference notes (Markdown supported)
                          <textarea
                            className="mt-1 h-24 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                            value={panel.body_md}
                            onChange={(e) => updateFormulaBody(panel.id, e.target.value)}
                            placeholder="Optional narrative or usage guidance"
                          />
                        </label>
                      </div>
                    )}
                    {panelErrors.length > 0 ? (
                      <ul className="space-y-1 text-sm text-red-600">
                        {panelErrors.map((error, errorIndex) => (
                          <li key={`${panel.id}-error-${errorIndex}`}>{error}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                );
              })
            )}
            <Button type="button" variant="secondary" onClick={() => addContextPanel()}>
              Add context panel
            </Button>
          </div>
          <div className="space-y-3">
            <h2 className="text-sm font-semibold">Preview</h2>
            <div className="rounded-md border border-neutral-200 bg-white p-4 shadow-sm">
              {previewPanels.length > 0 ? (
                <ContextPanelList
                  panels={previewPanels}
                  defaultOpen
                  idPrefix={`preview-${item.id}`}
                />
              ) : (
                <p className="text-sm text-neutral-500">Add a panel to see a live preview.</p>
              )}
            </div>
          </div>
        </div>
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
