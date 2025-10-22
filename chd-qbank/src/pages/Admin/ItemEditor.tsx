import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
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
        "id, stem_md, lead_in, explanation_brief_md, explanation_deep_md, status, version, choices(id, label, text_md, is_correct)"
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
          )
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
