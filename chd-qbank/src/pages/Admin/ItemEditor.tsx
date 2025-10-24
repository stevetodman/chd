import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { Button } from "../../components/ui/Button";
import type {
  ContextFormulaPanel,
  ContextLabsPanel,
  ContextPanel,
  FormulaReference,
  LabValue,
  MediaBundle
} from "../../lib/constants";

interface EditableChoice {
  id: string;
  label: string;
  text_md: string;
  is_correct: boolean;
}

type EditableMediaBundle = (MediaBundle & { id: string | null });
type EditableLabsPanel = ContextLabsPanel;
type EditableFormulaPanel = ContextFormulaPanel;

interface EditableItem {
  id: string;
  stem_md: string;
  lead_in: string | null;
  explanation_brief_md: string;
  explanation_deep_md: string | null;
  status: string;
  version: number;
  choices: EditableChoice[];
  context_panels: ContextPanel[];
  media_bundle: EditableMediaBundle | null;
}

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

function createDefaultLabsPanel(): EditableLabsPanel {
  return {
    id: createId(),
    kind: "labs",
    title: "Vitals & Labs",
    labs: [
      {
        label: "",
        value: "",
        unit: ""
      }
    ]
  };
}

function createDefaultFormulaPanel(): EditableFormulaPanel {
  return {
    id: createId(),
    kind: "formula",
    title: "Formula",
    formulas: [
      {
        name: "",
        expression: ""
      }
    ],
    body_md: ""
  };
}

function sanitizeLabValues(labs: LabValue[] = []): LabValue[] {
  return labs
    .map((lab) => ({
      label: lab.label.trim(),
      value: lab.value.trim(),
      unit: lab.unit?.trim() ? lab.unit.trim() : null
    }))
    .filter((lab) => lab.label && lab.value);
}

function sanitizeFormulas(formulas: FormulaReference[] = []): FormulaReference[] {
  return formulas
    .map((formula) => ({
      name: formula.name.trim(),
      expression: formula.expression.trim()
    }))
    .filter((formula) => formula.name && formula.expression);
}

function sanitizeContextPanels(panels: ContextPanel[]): ContextPanel[] {
  return panels
    .map((panel) => {
      if (panel.kind === "labs") {
        const labs = sanitizeLabValues(panel.labs);
        if (labs.length === 0) return null;
        return {
          id: panel.id,
          kind: "labs" as const,
          title: panel.title?.trim() ? panel.title.trim() : null,
          labs
        } satisfies ContextLabsPanel;
      }
      if (panel.kind === "formula") {
        const formulas = sanitizeFormulas(panel.formulas ?? []);
        const body_md = panel.body_md?.trim() ? panel.body_md.trim() : null;
        if (formulas.length === 0 && !body_md) return null;
        return {
          id: panel.id,
          kind: "formula" as const,
          title: panel.title?.trim() ? panel.title.trim() : null,
          formulas: formulas.length > 0 ? formulas : null,
          body_md
        } satisfies ContextFormulaPanel;
      }
      return null;
    })
    .filter((panel): panel is ContextPanel => panel !== null);
}

function sanitizeMediaBundle(bundle: EditableMediaBundle | null): MediaBundle | null {
  if (!bundle) return null;
  const cleaned: MediaBundle = {
    murmur_url: bundle.murmur_url?.trim() ? bundle.murmur_url.trim() : null,
    cxr_url: bundle.cxr_url?.trim() ? bundle.cxr_url.trim() : null,
    ekg_url: bundle.ekg_url?.trim() ? bundle.ekg_url.trim() : null,
    diagram_url: bundle.diagram_url?.trim() ? bundle.diagram_url.trim() : null,
    alt_text: bundle.alt_text?.trim() ? bundle.alt_text.trim() : null
  };
  const hasContent = Object.values(cleaned).some((value) => Boolean(value));
  return hasContent ? cleaned : null;
}

function normalizeEditableMediaBundle(bundle: EditableMediaBundle | null): EditableMediaBundle {
  return {
    id: bundle?.id ?? null,
    murmur_url: bundle?.murmur_url ?? "",
    cxr_url: bundle?.cxr_url ?? "",
    ekg_url: bundle?.ekg_url ?? "",
    diagram_url: bundle?.diagram_url ?? "",
    alt_text: bundle?.alt_text ?? ""
  };
}

function toEditableMediaBundle(bundle: MediaBundle | null, id: string | null): EditableMediaBundle | null {
  if (!bundle) return null;
  return {
    id: id ?? null,
    murmur_url: bundle.murmur_url ?? "",
    cxr_url: bundle.cxr_url ?? "",
    ekg_url: bundle.ekg_url ?? "",
    diagram_url: bundle.diagram_url ?? "",
    alt_text: bundle.alt_text ?? ""
  };
}

function isLabsPanel(panel: ContextPanel): panel is EditableLabsPanel {
  return panel.kind === "labs";
}

function isFormulaPanel(panel: ContextPanel): panel is EditableFormulaPanel {
  return panel.kind === "formula";
}

export default function ItemEditor() {
  const { id } = useParams();
  const [item, setItem] = useState<EditableItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    // Supabase integration: load full item for editing (admin-only).
    supabase
      .from("questions")
      .select(
        "id, stem_md, lead_in, explanation_brief_md, explanation_deep_md, status, version, context_panels, media_bundle:media_bundles(id, murmur_url, cxr_url, ekg_url, diagram_url, alt_text), choices(id, label, text_md, is_correct)"
      )
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) {
          setItem(null);
          return;
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
          context_panels: Array.isArray(data.context_panels)
            ? (data.context_panels as ContextPanel[]).map((panel) => ({
                ...panel,
                id: panel?.id ?? createId()
              }))
            : [],
          media_bundle: data.media_bundle
            ? {
                id: (data.media_bundle as MediaBundle).id ?? null,
                murmur_url: data.media_bundle.murmur_url ?? "",
                cxr_url: data.media_bundle.cxr_url ?? "",
                ekg_url: data.media_bundle.ekg_url ?? "",
                diagram_url: data.media_bundle.diagram_url ?? "",
                alt_text: data.media_bundle.alt_text ?? ""
              }
            : null
        } satisfies EditableItem;

        setItem(editable);
      });
  }, [id]);

  const save = async () => {
    if (!item) return;
    const correctChoices = item.choices.filter((choice) => choice.is_correct);
    if (correctChoices.length !== 1) {
      setMessage("Please mark exactly one choice as correct before saving.");
      return;
    }

    setSaving(true);
    setMessage(null);

    const panels = sanitizeContextPanels(item.context_panels ?? []);
    const mediaBundle = sanitizeMediaBundle(item.media_bundle);

    let mediaBundleId: string | null = item.media_bundle?.id ?? null;
    if (mediaBundle) {
      if (mediaBundleId) {
        const { error: mediaError } = await supabase
          .from("media_bundles")
          .update(mediaBundle)
          .eq("id", mediaBundleId);
        if (mediaError) {
          setSaving(false);
          setMessage(mediaError.message);
          return;
        }
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from("media_bundles")
          .insert(mediaBundle)
          .select("id")
          .maybeSingle();
        if (insertError) {
          setSaving(false);
          setMessage(insertError.message);
          return;
        }
        mediaBundleId = inserted?.id ?? null;
      }
    } else if (mediaBundleId) {
      const { error: deleteError } = await supabase.from("media_bundles").delete().eq("id", mediaBundleId);
      if (deleteError) {
        setSaving(false);
        setMessage(deleteError.message);
        return;
      }
      mediaBundleId = null;
    }

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
        context_panels: panels.length > 0 ? panels : null,
        media_bundle_id: mediaBundleId
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
              context_panels: panels,
              media_bundle: toEditableMediaBundle(mediaBundle, mediaBundleId)
            }
          : prev
      );
    }
  };

  if (!item) return <div>Loading item…</div>;

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
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Context panels</h2>
        <p className="text-sm text-neutral-600">
          Add optional lab or formula references that appear alongside the learner view.
        </p>
        <div className="space-y-4">
          {item.context_panels.map((panel, panelIndex) => (
            <div key={panel.id} className="rounded-md border border-neutral-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-sm font-semibold">
                  {panel.kind === "labs" ? "Labs panel" : "Formula panel"}
                </h3>
                <Button
                  type="button"
                  variant="ghost"
                  className="text-xs text-rose-600 hover:text-rose-700"
                  onClick={() =>
                    setItem((prev) =>
                      prev
                        ? {
                            ...prev,
                            context_panels: prev.context_panels.filter((_, idx) => idx !== panelIndex)
                          }
                        : prev
                    )
                  }
                >
                  Remove panel
                </Button>
              </div>
              <label className="mt-3 block text-sm font-medium">
                Title
                <input
                  type="text"
                  className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
                  value={panel.title ?? ""}
                  onChange={(e) =>
                    setItem((prev) =>
                      prev
                        ? {
                            ...prev,
                            context_panels: prev.context_panels.map((existing, idx) =>
                              idx === panelIndex ? { ...existing, title: e.target.value } : existing
                            )
                          }
                        : prev
                    )
                  }
                />
              </label>
              {isLabsPanel(panel) ? (
                <div className="mt-4 space-y-3">
                  <p className="text-xs text-neutral-500">Enter the lab values in the order they should appear.</p>
                  {panel.labs.map((lab, labIndex) => (
                    <div key={`${panel.id}-lab-${labIndex}`} className="rounded border border-neutral-200 p-3">
                      <div className="grid gap-3 md:grid-cols-3">
                        <label className="block text-xs font-medium">
                          Label
                          <input
                            type="text"
                            className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1"
                            value={lab.label}
                            onChange={(e) =>
                              setItem((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      context_panels: prev.context_panels.map((existing, idx) => {
                                        if (idx !== panelIndex || !isLabsPanel(existing)) return existing;
                                        return {
                                          ...existing,
                                          labs: existing.labs.map((existingLab, lIdx) =>
                                            lIdx === labIndex ? { ...existingLab, label: e.target.value } : existingLab
                                          )
                                        };
                                      })
                                    }
                                  : prev
                              )
                            }
                          />
                        </label>
                        <label className="block text-xs font-medium">
                          Value
                          <input
                            type="text"
                            className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1"
                            value={lab.value}
                            onChange={(e) =>
                              setItem((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      context_panels: prev.context_panels.map((existing, idx) => {
                                        if (idx !== panelIndex || !isLabsPanel(existing)) return existing;
                                        return {
                                          ...existing,
                                          labs: existing.labs.map((existingLab, lIdx) =>
                                            lIdx === labIndex ? { ...existingLab, value: e.target.value } : existingLab
                                          )
                                        };
                                      })
                                    }
                                  : prev
                              )
                            }
                          />
                        </label>
                        <label className="block text-xs font-medium">
                          Unit
                          <input
                            type="text"
                            className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1"
                            value={lab.unit ?? ""}
                            onChange={(e) =>
                              setItem((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      context_panels: prev.context_panels.map((existing, idx) => {
                                        if (idx !== panelIndex || !isLabsPanel(existing)) return existing;
                                        return {
                                          ...existing,
                                          labs: existing.labs.map((existingLab, lIdx) =>
                                            lIdx === labIndex ? { ...existingLab, unit: e.target.value } : existingLab
                                          )
                                        };
                                      })
                                    }
                                  : prev
                              )
                            }
                          />
                        </label>
                      </div>
                      <div className="mt-2 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          className="text-xs text-rose-600 hover:text-rose-700"
                          onClick={() =>
                            setItem((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    context_panels: prev.context_panels.map((existing, idx) => {
                                      if (idx !== panelIndex || !isLabsPanel(existing)) return existing;
                                      return {
                                        ...existing,
                                        labs: existing.labs.filter((_, lIdx) => lIdx !== labIndex)
                                      };
                                    })
                                  }
                                : prev
                            )
                          }
                        >
                          Remove value
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() =>
                      setItem((prev) =>
                        prev
                          ? {
                              ...prev,
                              context_panels: prev.context_panels.map((existing, idx) => {
                                if (idx !== panelIndex || !isLabsPanel(existing)) return existing;
                                return {
                                  ...existing,
                                  labs: [
                                    ...existing.labs,
                                    {
                                      label: "",
                                      value: "",
                                      unit: ""
                                    }
                                  ]
                                };
                              })
                            }
                          : prev
                      )
                    }
                  >
                    Add lab value
                  </Button>
                </div>
              ) : null}
              {isFormulaPanel(panel) ? (
                <div className="mt-4 space-y-3">
                  <p className="text-xs text-neutral-500">
                    Provide reference formulas or supporting markdown details.
                  </p>
                  {(panel.formulas ?? []).map((formula, formulaIndex) => (
                    <div key={`${panel.id}-formula-${formulaIndex}`} className="rounded border border-neutral-200 p-3">
                      <div className="grid gap-3 md:grid-cols-2">
                        <label className="block text-xs font-medium">
                          Name
                          <input
                            type="text"
                            className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1"
                            value={formula.name}
                            onChange={(e) =>
                              setItem((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      context_panels: prev.context_panels.map((existing, idx) => {
                                        if (idx !== panelIndex || !isFormulaPanel(existing) || !existing.formulas) {
                                          return existing;
                                        }
                                        return {
                                          ...existing,
                                          formulas: existing.formulas.map((existingFormula, fIdx) =>
                                            fIdx === formulaIndex
                                              ? { ...existingFormula, name: e.target.value }
                                              : existingFormula
                                          )
                                        };
                                      })
                                    }
                                  : prev
                              )
                            }
                          />
                        </label>
                        <label className="block text-xs font-medium">
                          Expression
                          <input
                            type="text"
                            className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1"
                            value={formula.expression}
                            onChange={(e) =>
                              setItem((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      context_panels: prev.context_panels.map((existing, idx) => {
                                        if (idx !== panelIndex || !isFormulaPanel(existing) || !existing.formulas) {
                                          return existing;
                                        }
                                        return {
                                          ...existing,
                                          formulas: existing.formulas.map((existingFormula, fIdx) =>
                                            fIdx === formulaIndex
                                              ? { ...existingFormula, expression: e.target.value }
                                              : existingFormula
                                          )
                                        };
                                      })
                                    }
                                  : prev
                              )
                            }
                          />
                        </label>
                      </div>
                      <div className="mt-2 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          className="text-xs text-rose-600 hover:text-rose-700"
                          onClick={() =>
                            setItem((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    context_panels: prev.context_panels.map((existing, idx) => {
                                      if (idx !== panelIndex || !isFormulaPanel(existing) || !existing.formulas) {
                                        return existing;
                                      }
                                      return {
                                        ...existing,
                                        formulas: existing.formulas.filter((_, fIdx) => fIdx !== formulaIndex)
                                      };
                                    })
                                  }
                                : prev
                            )
                          }
                        >
                          Remove formula
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() =>
                      setItem((prev) =>
                        prev
                          ? {
                              ...prev,
                              context_panels: prev.context_panels.map((existing, idx) => {
                                if (idx !== panelIndex || !isFormulaPanel(existing)) return existing;
                                const existingFormulas = existing.formulas ?? [];
                                return {
                                  ...existing,
                                  formulas: [
                                    ...existingFormulas,
                                    {
                                      name: "",
                                      expression: ""
                                    }
                                  ]
                                };
                              })
                            }
                          : prev
                      )
                    }
                  >
                    Add formula reference
                  </Button>
                  <label className="block text-xs font-medium">
                    Additional details (Markdown supported)
                    <textarea
                      className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
                      rows={4}
                      value={panel.body_md ?? ""}
                      onChange={(e) =>
                        setItem((prev) =>
                          prev
                            ? {
                                ...prev,
                                context_panels: prev.context_panels.map((existing, idx) =>
                                  idx === panelIndex && isFormulaPanel(existing)
                                    ? { ...existing, body_md: e.target.value }
                                    : existing
                                )
                              }
                            : prev
                        )
                      }
                    />
                  </label>
                </div>
              ) : null}
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              setItem((prev) =>
                prev
                  ? {
                      ...prev,
                      context_panels: [...prev.context_panels, createDefaultLabsPanel()]
                    }
                  : prev
              )
            }
          >
            Add labs panel
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              setItem((prev) =>
                prev
                  ? {
                      ...prev,
                      context_panels: [...prev.context_panels, createDefaultFormulaPanel()]
                    }
                  : prev
              )
            }
          >
            Add formula panel
          </Button>
        </div>
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Media bundle</h2>
        <p className="text-sm text-neutral-600">
          Link to supporting media assets. Leave fields blank to remove the bundle.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block text-sm font-medium">
            Murmur URL
            <input
              type="url"
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
              value={item.media_bundle?.murmur_url ?? ""}
              onChange={(e) =>
                setItem((prev) =>
                  prev
                    ? { ...prev, media_bundle: { ...normalizeEditableMediaBundle(prev.media_bundle), murmur_url: e.target.value } }
                    : prev
                )
              }
            />
          </label>
          <label className="block text-sm font-medium">
            Chest X-ray URL
            <input
              type="url"
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
              value={item.media_bundle?.cxr_url ?? ""}
              onChange={(e) =>
                setItem((prev) =>
                  prev
                    ? { ...prev, media_bundle: { ...normalizeEditableMediaBundle(prev.media_bundle), cxr_url: e.target.value } }
                    : prev
                )
              }
            />
          </label>
          <label className="block text-sm font-medium">
            EKG URL
            <input
              type="url"
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
              value={item.media_bundle?.ekg_url ?? ""}
              onChange={(e) =>
                setItem((prev) =>
                  prev
                    ? { ...prev, media_bundle: { ...normalizeEditableMediaBundle(prev.media_bundle), ekg_url: e.target.value } }
                    : prev
                )
              }
            />
          </label>
          <label className="block text-sm font-medium">
            Diagram URL
            <input
              type="url"
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
              value={item.media_bundle?.diagram_url ?? ""}
              onChange={(e) =>
                setItem((prev) =>
                  prev
                    ? { ...prev, media_bundle: { ...normalizeEditableMediaBundle(prev.media_bundle), diagram_url: e.target.value } }
                    : prev
                )
              }
            />
          </label>
        </div>
        <label className="block text-sm font-medium">
          Alt text / description
          <textarea
            className="mt-1 h-24 w-full rounded-md border border-neutral-300 px-3 py-2"
            value={item.media_bundle?.alt_text ?? ""}
            onChange={(e) =>
              setItem((prev) =>
                prev
                  ? { ...prev, media_bundle: { ...normalizeEditableMediaBundle(prev.media_bundle), alt_text: e.target.value } }
                  : prev
              )
            }
          />
        </label>
      </section>
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
