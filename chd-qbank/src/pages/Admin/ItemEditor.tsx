import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { Button } from "../../components/ui/Button";
import ContextPanel from "../../components/ContextPanel";
import LabPanel from "../../components/LabPanel";
import FormulaPanel from "../../components/FormulaPanel";
import type { ContextPanel as PersistedContextPanel } from "../../lib/constants";

interface EditableChoice {
  id: string;
  label: string;
  text_md: string;
  is_correct: boolean;
}

type PanelKind = "context" | "labs" | "formula";

type PanelSequenceEntry = {
  editorKey: string;
  kind: PanelKind;
};

type EditableLabValue = {
  label: string;
  value: string;
  unit: string;
};

type EditableFormulaReference = {
  name: string;
  expression: string;
};

type EditableContextPanel = {
  editorKey: string;
  id: string;
  title: string;
  body_md: string;
};

type EditableLabPanel = {
  editorKey: string;
  id: string;
  title: string;
  labs: EditableLabValue[];
};

type EditableFormulaPanel = {
  editorKey: string;
  id: string;
  title: string;
  formulas: EditableFormulaReference[];
  body_md: string;
};

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
  lab_panels: EditableLabPanel[];
  formula_panels: EditableFormulaPanel[];
  panel_sequence: PanelSequenceEntry[];
}

const generatePanelKey = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `panel-${Math.random().toString(36).slice(2, 10)}`;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const toStringOrEmpty = (value: unknown): string => {
  return typeof value === "string" ? value : "";
};

type ParsedPanels = {
  contextPanels: EditableContextPanel[];
  labPanels: EditableLabPanel[];
  formulaPanels: EditableFormulaPanel[];
  sequence: PanelSequenceEntry[];
};

const parsePanels = (raw: unknown): ParsedPanels => {
  const contextPanels: EditableContextPanel[] = [];
  const labPanels: EditableLabPanel[] = [];
  const formulaPanels: EditableFormulaPanel[] = [];
  const sequence: PanelSequenceEntry[] = [];

  if (!Array.isArray(raw)) {
    return { contextPanels, labPanels, formulaPanels, sequence };
  }

  raw.forEach((panel) => {
    if (!isRecord(panel)) return;

    const rawId = toStringOrEmpty(panel.id);
    const editorKey = rawId.trim() ? rawId : generatePanelKey();
    const title = toStringOrEmpty(panel.title);
    const kind = toStringOrEmpty(panel.kind) as PanelKind;

    if (kind === "labs") {
      const labs = Array.isArray(panel.labs)
        ? panel.labs
            .map((lab) => {
              if (!isRecord(lab)) return null;
              return {
                label: toStringOrEmpty(lab.label),
                value: toStringOrEmpty(lab.value),
                unit: toStringOrEmpty(lab.unit)
              };
            })
            .filter((lab): lab is EditableLabValue => !!lab)
        : [];
      labPanels.push({ editorKey, id: rawId, title, labs });
      sequence.push({ kind: "labs", editorKey });
      return;
    }

    if (kind === "formula") {
      const formulas = Array.isArray(panel.formulas)
        ? panel.formulas
            .map((formula) => {
              if (!isRecord(formula)) return null;
              return {
                name: toStringOrEmpty(formula.name),
                expression: toStringOrEmpty(formula.expression)
              };
            })
            .filter((formula): formula is EditableFormulaReference => !!formula)
        : [];
      const body = toStringOrEmpty(panel.body_md);
      formulaPanels.push({ editorKey, id: rawId, title, formulas, body_md: body });
      sequence.push({ kind: "formula", editorKey });
      return;
    }

    const body = toStringOrEmpty(panel.body_md);
    contextPanels.push({ editorKey, id: rawId, title, body_md: body });
    sequence.push({ kind: "context", editorKey });
  });

  return { contextPanels, labPanels, formulaPanels, sequence };
};

const getContextPanelErrors = (panels: EditableContextPanel[]): string[] => {
  const errors: string[] = [];
  panels.forEach((panel, index) => {
    const label = panel.title || panel.id || `Context panel #${index + 1}`;
    if (!panel.id.trim()) {
      errors.push(`${label} is missing an id.`);
    }
    if (!panel.body_md.trim()) {
      errors.push(`${label} must include body content.`);
    }
  });
  return errors;
};

const getLabPanelErrors = (panels: EditableLabPanel[]): string[] => {
  const errors: string[] = [];
  panels.forEach((panel, index) => {
    const label = panel.title || panel.id || `Lab panel #${index + 1}`;
    if (!panel.id.trim()) {
      errors.push(`${label} is missing an id.`);
    }
    if (panel.labs.length === 0) {
      errors.push(`${label} must include at least one lab value.`);
    }
    panel.labs.forEach((lab, labIndex) => {
      if (!lab.label.trim() || !lab.value.trim()) {
        errors.push(`${label} lab row ${labIndex + 1} requires both label and value.`);
      }
    });
  });
  return errors;
};

const getFormulaPanelErrors = (panels: EditableFormulaPanel[]): string[] => {
  const errors: string[] = [];
  panels.forEach((panel, index) => {
    const label = panel.title || panel.id || `Formula panel #${index + 1}`;
    if (!panel.id.trim()) {
      errors.push(`${label} is missing an id.`);
    }
    const hasValidFormula = panel.formulas.some(
      (formula) => formula.name.trim() && formula.expression.trim()
    );
    const hasBody = panel.body_md.trim().length > 0;
    if (!hasValidFormula && !hasBody) {
      errors.push(`${label} must include at least one formula or supporting notes.`);
    }
    panel.formulas.forEach((formula, formulaIndex) => {
      if (!formula.name.trim() || !formula.expression.trim()) {
        errors.push(`${label} formula ${formulaIndex + 1} requires both a name and expression.`);
      }
    });
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

      const { contextPanels, labPanels, formulaPanels, sequence } = parsePanels(
        (data.context_panels as PersistedContextPanel[] | null) ?? []
      );

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
        context_panels: contextPanels,
        lab_panels: labPanels,
        formula_panels: formulaPanels,
        panel_sequence: sequence
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

  const save = async () => {
    if (!item) return;
    const correctChoices = item.choices.filter((choice) => choice.is_correct);
    if (correctChoices.length !== 1) {
      setMessage("Please mark exactly one choice as correct before saving.");
      return;
    }

    const contextErrors = getContextPanelErrors(item.context_panels);
    const labErrors = getLabPanelErrors(item.lab_panels);
    const formulaErrors = getFormulaPanelErrors(item.formula_panels);
    if (contextErrors.length || labErrors.length || formulaErrors.length) {
      setMessage("Please resolve the validation errors in the panel sections before saving.");
      return;
    }

    const contextMap = new Map(item.context_panels.map((panel) => [panel.editorKey, panel]));
    const labMap = new Map(item.lab_panels.map((panel) => [panel.editorKey, panel]));
    const formulaMap = new Map(item.formula_panels.map((panel) => [panel.editorKey, panel]));

    const combinedPanels: PersistedContextPanel[] = item.panel_sequence
      .map((entry) => {
        if (entry.kind === "context") {
          const panel = contextMap.get(entry.editorKey);
          if (!panel) return null;
          const trimmedId = panel.id.trim();
          const trimmedTitle = panel.title.trim();
          return {
            id: trimmedId,
            kind: "context",
            title: trimmedTitle ? trimmedTitle : null,
            body_md: panel.body_md.trim()
          } as PersistedContextPanel;
        }
        if (entry.kind === "labs") {
          const panel = labMap.get(entry.editorKey);
          if (!panel) return null;
          const trimmedId = panel.id.trim();
          const trimmedTitle = panel.title.trim();
          return {
            id: trimmedId,
            kind: "labs",
            title: trimmedTitle ? trimmedTitle : null,
            labs: panel.labs.map((lab) => ({
              label: lab.label.trim(),
              value: lab.value.trim(),
              unit: lab.unit.trim() ? lab.unit.trim() : null
            }))
          } as PersistedContextPanel;
        }
        if (entry.kind === "formula") {
          const panel = formulaMap.get(entry.editorKey);
          if (!panel) return null;
          const trimmedId = panel.id.trim();
          const trimmedTitle = panel.title.trim();
          const trimmedBody = panel.body_md.trim();
          const formulas = panel.formulas
            .filter((formula) => formula.name.trim() && formula.expression.trim())
            .map((formula) => ({
              name: formula.name.trim(),
              expression: formula.expression.trim()
            }));
          return {
            id: trimmedId,
            kind: "formula",
            title: trimmedTitle ? trimmedTitle : null,
            formulas: formulas.length > 0 ? formulas : null,
            body_md: trimmedBody || null
          } as PersistedContextPanel;
        }
        return null;
      })
      .filter((panel): panel is PersistedContextPanel => panel !== null);

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
        context_panels: combinedPanels
      })
      .eq("id", item.id);
    setSaving(false);
    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Saved!");
      const parsed = parsePanels(combinedPanels);
      setItem((prev) =>
        prev
          ? {
              ...prev,
              version: prev.version + 1,
              context_panels: parsed.contextPanels,
              lab_panels: parsed.labPanels,
              formula_panels: parsed.formulaPanels,
              panel_sequence: parsed.sequence
            }
          : prev
      );
    }
  };

  const updateContextPanel = (
    editorKey: string,
    updates: Partial<Omit<EditableContextPanel, "editorKey">>
  ) => {
    setItem((prev) =>
      prev
        ? {
            ...prev,
            context_panels: prev.context_panels.map((panel) =>
              panel.editorKey === editorKey ? { ...panel, ...updates } : panel
            )
          }
        : prev
    );
  };

  const addContextPanel = () => {
    const key = generatePanelKey();
    setItem((prev) =>
      prev
        ? {
            ...prev,
            context_panels: [
              ...prev.context_panels,
              { editorKey: key, id: key, title: "", body_md: "" }
            ],
            panel_sequence: [...prev.panel_sequence, { kind: "context", editorKey: key }]
          }
        : prev
    );
  };

  const removeContextPanel = (editorKey: string) => {
    setItem((prev) =>
      prev
        ? {
            ...prev,
            context_panels: prev.context_panels.filter((panel) => panel.editorKey !== editorKey),
            panel_sequence: prev.panel_sequence.filter((entry) => entry.editorKey !== editorKey)
          }
        : prev
    );
  };

  const updateLabPanel = (
    editorKey: string,
    updater: (panel: EditableLabPanel) => EditableLabPanel
  ) => {
    setItem((prev) =>
      prev
        ? {
            ...prev,
            lab_panels: prev.lab_panels.map((panel) =>
              panel.editorKey === editorKey ? updater(panel) : panel
            )
          }
        : prev
    );
  };

  const addLabPanel = () => {
    const key = generatePanelKey();
    setItem((prev) =>
      prev
        ? {
            ...prev,
            lab_panels: [
              ...prev.lab_panels,
              { editorKey: key, id: key, title: "", labs: [{ label: "", value: "", unit: "" }] }
            ],
            panel_sequence: [...prev.panel_sequence, { kind: "labs", editorKey: key }]
          }
        : prev
    );
  };

  const removeLabPanel = (editorKey: string) => {
    setItem((prev) =>
      prev
        ? {
            ...prev,
            lab_panels: prev.lab_panels.filter((panel) => panel.editorKey !== editorKey),
            panel_sequence: prev.panel_sequence.filter((entry) => entry.editorKey !== editorKey)
          }
        : prev
    );
  };

  const updateLabValue = (
    editorKey: string,
    labIndex: number,
    updates: Partial<EditableLabValue>
  ) => {
    updateLabPanel(editorKey, (panel) => ({
      ...panel,
      labs: panel.labs.map((lab, index) => (index === labIndex ? { ...lab, ...updates } : lab))
    }));
  };

  const addLabValue = (editorKey: string) => {
    updateLabPanel(editorKey, (panel) => ({
      ...panel,
      labs: [...panel.labs, { label: "", value: "", unit: "" }]
    }));
  };

  const removeLabValue = (editorKey: string, labIndex: number) => {
    updateLabPanel(editorKey, (panel) => ({
      ...panel,
      labs: panel.labs.filter((_, index) => index !== labIndex)
    }));
  };

  const updateFormulaPanel = (
    editorKey: string,
    updater: (panel: EditableFormulaPanel) => EditableFormulaPanel
  ) => {
    setItem((prev) =>
      prev
        ? {
            ...prev,
            formula_panels: prev.formula_panels.map((panel) =>
              panel.editorKey === editorKey ? updater(panel) : panel
            )
          }
        : prev
    );
  };

  const addFormulaPanel = () => {
    const key = generatePanelKey();
    setItem((prev) =>
      prev
        ? {
            ...prev,
            formula_panels: [
              ...prev.formula_panels,
              { editorKey: key, id: key, title: "", formulas: [{ name: "", expression: "" }], body_md: "" }
            ],
            panel_sequence: [...prev.panel_sequence, { kind: "formula", editorKey: key }]
          }
        : prev
    );
  };

  const removeFormulaPanel = (editorKey: string) => {
    setItem((prev) =>
      prev
        ? {
            ...prev,
            formula_panels: prev.formula_panels.filter((panel) => panel.editorKey !== editorKey),
            panel_sequence: prev.panel_sequence.filter((entry) => entry.editorKey !== editorKey)
          }
        : prev
    );
  };

  const updateFormula = (
    editorKey: string,
    formulaIndex: number,
    updates: Partial<EditableFormulaReference>
  ) => {
    updateFormulaPanel(editorKey, (panel) => ({
      ...panel,
      formulas: panel.formulas.map((formula, index) =>
        index === formulaIndex ? { ...formula, ...updates } : formula
      )
    }));
  };

  const addFormula = (editorKey: string) => {
    updateFormulaPanel(editorKey, (panel) => ({
      ...panel,
      formulas: [...panel.formulas, { name: "", expression: "" }]
    }));
  };

  const removeFormula = (editorKey: string, formulaIndex: number) => {
    updateFormulaPanel(editorKey, (panel) => ({
      ...panel,
      formulas: panel.formulas.filter((_, index) => index !== formulaIndex)
    }));
  };

  const contextPanelErrors = useMemo(
    () => (item ? getContextPanelErrors(item.context_panels) : []),
    [item]
  );
  const labPanelErrors = useMemo(
    () => (item ? getLabPanelErrors(item.lab_panels) : []),
    [item]
  );
  const formulaPanelErrors = useMemo(
    () => (item ? getFormulaPanelErrors(item.formula_panels) : []),
    [item]
  );
  const previewPanels = useMemo(() => {
    if (!item) return [] as JSX.Element[];
    const contextMap = new Map(item.context_panels.map((panel) => [panel.editorKey, panel]));
    const labMap = new Map(item.lab_panels.map((panel) => [panel.editorKey, panel]));
    const formulaMap = new Map(item.formula_panels.map((panel) => [panel.editorKey, panel]));
    return item.panel_sequence
      .map((entry) => {
        if (entry.kind === "context") {
          const panel = contextMap.get(entry.editorKey);
          if (!panel) return null;
          return (
            <ContextPanel
              key={entry.editorKey}
              title={panel.title.trim() ? panel.title : undefined}
              bodyMd={panel.body_md}
              asSection={false}
            />
          );
        }
        if (entry.kind === "labs") {
          const panel = labMap.get(entry.editorKey);
          if (!panel) return null;
          const labs = panel.labs
            .filter((lab) => lab.label.trim() || lab.value.trim())
            .map((lab) => ({
              label: lab.label,
              value: lab.value,
              unit: lab.unit.trim() ? lab.unit : undefined
            }));
          if (labs.length === 0) return null;
          return (
            <LabPanel
              key={entry.editorKey}
              title={panel.title.trim() ? panel.title : undefined}
              labs={labs}
              asSection={false}
            />
          );
        }
        if (entry.kind === "formula") {
          const panel = formulaMap.get(entry.editorKey);
          if (!panel) return null;
          const formulas = panel.formulas
            .filter((formula) => formula.name.trim() || formula.expression.trim())
            .map((formula) => ({ name: formula.name, expression: formula.expression }));
          if (formulas.length === 0 && !panel.body_md.trim()) {
            return null;
          }
          return (
            <FormulaPanel
              key={entry.editorKey}
              title={panel.title.trim() ? panel.title : undefined}
              formulas={formulas}
              bodyMd={panel.body_md}
              asSection={false}
            />
          );
        }
        return null;
      })
      .filter((panel): panel is JSX.Element => panel !== null);
  }, [item]);

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
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Context panels</h2>
          <Button type="button" variant="secondary" onClick={addContextPanel}>
            Add context panel
          </Button>
        </div>
        <p className="text-xs text-neutral-500">
          Provide supporting markdown content for the right-rail context section.
        </p>
        {contextPanelErrors.length ? (
          <ul className="list-disc space-y-1 pl-5 text-xs text-rose-600">
            {contextPanelErrors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        ) : null}
        <div className="space-y-4">
          {item.context_panels.length > 0 ? (
            item.context_panels.map((panel, index) => (
              <div
                key={panel.editorKey}
                className="space-y-3 rounded-md border border-neutral-200 bg-white p-3 shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">Context panel {index + 1}</span>
                  <button
                    type="button"
                    className="text-xs font-medium text-rose-600 hover:underline"
                    onClick={() => removeContextPanel(panel.editorKey)}
                  >
                    Remove
                  </button>
                </div>
                <label className="block text-xs font-medium text-neutral-700">
                  Panel ID
                  <input
                    type="text"
                    className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
                    value={panel.id}
                    onChange={(e) => updateContextPanel(panel.editorKey, { id: e.target.value })}
                  />
                </label>
                <label className="block text-xs font-medium text-neutral-700">
                  Title (optional)
                  <input
                    type="text"
                    className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
                    value={panel.title}
                    onChange={(e) => updateContextPanel(panel.editorKey, { title: e.target.value })}
                  />
                </label>
                <label className="block text-xs font-medium text-neutral-700">
                  Body (Markdown)
                  <textarea
                    className="mt-1 h-24 w-full rounded-md border border-neutral-300 px-3 py-2 font-mono"
                    value={panel.body_md}
                    onChange={(e) => updateContextPanel(panel.editorKey, { body_md: e.target.value })}
                  />
                </label>
              </div>
            ))
          ) : (
            <p className="text-xs text-neutral-500">No context panels configured.</p>
          )}
        </div>
      </section>
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Lab panels</h2>
          <Button type="button" variant="secondary" onClick={addLabPanel}>
            Add lab panel
          </Button>
        </div>
        <p className="text-xs text-neutral-500">
          Configure vitals and lab values displayed alongside the question.
        </p>
        {labPanelErrors.length ? (
          <ul className="list-disc space-y-1 pl-5 text-xs text-rose-600">
            {labPanelErrors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        ) : null}
        <div className="space-y-4">
          {item.lab_panels.length > 0 ? (
            item.lab_panels.map((panel, index) => (
              <div
                key={panel.editorKey}
                className="space-y-3 rounded-md border border-neutral-200 bg-white p-3 shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">Lab panel {index + 1}</span>
                  <button
                    type="button"
                    className="text-xs font-medium text-rose-600 hover:underline"
                    onClick={() => removeLabPanel(panel.editorKey)}
                  >
                    Remove
                  </button>
                </div>
                <label className="block text-xs font-medium text-neutral-700">
                  Panel ID
                  <input
                    type="text"
                    className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
                    value={panel.id}
                    onChange={(e) =>
                      updateLabPanel(panel.editorKey, (current) => ({
                        ...current,
                        id: e.target.value
                      }))
                    }
                  />
                </label>
                <label className="block text-xs font-medium text-neutral-700">
                  Title (optional)
                  <input
                    type="text"
                    className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
                    value={panel.title}
                    onChange={(e) =>
                      updateLabPanel(panel.editorKey, (current) => ({
                        ...current,
                        title: e.target.value
                      }))
                    }
                  />
                </label>
                <div className="space-y-3">
                  {panel.labs.map((lab, labIndex) => (
                    <div
                      key={`${panel.editorKey}-lab-${labIndex}`}
                      className="space-y-2 rounded-md border border-neutral-100 bg-neutral-50 p-3"
                    >
                      <div className="grid gap-2 sm:grid-cols-3">
                        <label className="block text-xs font-medium text-neutral-700">
                          Label
                          <input
                            type="text"
                            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
                            value={lab.label}
                            onChange={(e) =>
                              updateLabValue(panel.editorKey, labIndex, { label: e.target.value })
                            }
                          />
                        </label>
                        <label className="block text-xs font-medium text-neutral-700">
                          Value
                          <input
                            type="text"
                            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
                            value={lab.value}
                            onChange={(e) =>
                              updateLabValue(panel.editorKey, labIndex, { value: e.target.value })
                            }
                          />
                        </label>
                        <label className="block text-xs font-medium text-neutral-700">
                          Unit (optional)
                          <input
                            type="text"
                            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
                            value={lab.unit}
                            onChange={(e) =>
                              updateLabValue(panel.editorKey, labIndex, { unit: e.target.value })
                            }
                          />
                        </label>
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          className="text-xs font-medium text-rose-600 hover:underline"
                          onClick={() => removeLabValue(panel.editorKey, labIndex)}
                        >
                          Remove value
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end">
                  <Button type="button" variant="ghost" onClick={() => addLabValue(panel.editorKey)}>
                    Add lab value
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-neutral-500">No lab panels configured.</p>
          )}
        </div>
      </section>
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Formula panels</h2>
          <Button type="button" variant="secondary" onClick={addFormulaPanel}>
            Add formula panel
          </Button>
        </div>
        <p className="text-xs text-neutral-500">
          Surface quick-reference formulas or notes for the learner.
        </p>
        {formulaPanelErrors.length ? (
          <ul className="list-disc space-y-1 pl-5 text-xs text-rose-600">
            {formulaPanelErrors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        ) : null}
        <div className="space-y-4">
          {item.formula_panels.length > 0 ? (
            item.formula_panels.map((panel, index) => (
              <div
                key={panel.editorKey}
                className="space-y-3 rounded-md border border-neutral-200 bg-white p-3 shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">Formula panel {index + 1}</span>
                  <button
                    type="button"
                    className="text-xs font-medium text-rose-600 hover:underline"
                    onClick={() => removeFormulaPanel(panel.editorKey)}
                  >
                    Remove
                  </button>
                </div>
                <label className="block text-xs font-medium text-neutral-700">
                  Panel ID
                  <input
                    type="text"
                    className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
                    value={panel.id}
                    onChange={(e) =>
                      updateFormulaPanel(panel.editorKey, (current) => ({
                        ...current,
                        id: e.target.value
                      }))
                    }
                  />
                </label>
                <label className="block text-xs font-medium text-neutral-700">
                  Title (optional)
                  <input
                    type="text"
                    className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
                    value={panel.title}
                    onChange={(e) =>
                      updateFormulaPanel(panel.editorKey, (current) => ({
                        ...current,
                        title: e.target.value
                      }))
                    }
                  />
                </label>
                <div className="space-y-3">
                  {panel.formulas.map((formula, formulaIndex) => (
                    <div
                      key={`${panel.editorKey}-formula-${formulaIndex}`}
                      className="space-y-2 rounded-md border border-neutral-100 bg-neutral-50 p-3"
                    >
                      <div className="grid gap-2 sm:grid-cols-2">
                        <label className="block text-xs font-medium text-neutral-700">
                          Name
                          <input
                            type="text"
                            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
                            value={formula.name}
                            onChange={(e) =>
                              updateFormula(panel.editorKey, formulaIndex, { name: e.target.value })
                            }
                          />
                        </label>
                        <label className="block text-xs font-medium text-neutral-700">
                          Expression
                          <input
                            type="text"
                            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
                            value={formula.expression}
                            onChange={(e) =>
                              updateFormula(panel.editorKey, formulaIndex, { expression: e.target.value })
                            }
                          />
                        </label>
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          className="text-xs font-medium text-rose-600 hover:underline"
                          onClick={() => removeFormula(panel.editorKey, formulaIndex)}
                        >
                          Remove formula
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end">
                  <Button type="button" variant="ghost" onClick={() => addFormula(panel.editorKey)}>
                    Add formula
                  </Button>
                </div>
                <label className="block text-xs font-medium text-neutral-700">
                  Notes (optional Markdown)
                  <textarea
                    className="mt-1 h-24 w-full rounded-md border border-neutral-300 px-3 py-2 font-mono"
                    value={panel.body_md}
                    onChange={(e) =>
                      updateFormulaPanel(panel.editorKey, (current) => ({
                        ...current,
                        body_md: e.target.value
                      }))
                    }
                  />
                </label>
              </div>
            ))
          ) : (
            <p className="text-xs text-neutral-500">No formula panels configured.</p>
          )}
        </div>
      </section>
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Panel preview</h2>
        <p className="text-xs text-neutral-500">Preview updates live as you edit.</p>
        <div className="space-y-4">
          {previewPanels.length > 0 ? (
            previewPanels
          ) : (
            <p className="text-xs text-neutral-500">No panels configured yet.</p>
          )}
        </div>
      </section>
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
