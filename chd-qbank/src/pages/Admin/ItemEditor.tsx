import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { Button } from "../../components/ui/Button";

interface EditableItem {
  id: string;
  stem_md: string;
  lead_in: string | null;
  explanation_brief_md: string;
  explanation_deep_md: string | null;
  status: string;
  version: number;
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
      .select("id, stem_md, lead_in, explanation_brief_md, explanation_deep_md, status, version")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => setItem((data as EditableItem) ?? null));
  }, [id]);

  const save = async () => {
    if (!item) return;
    setSaving(true);
    setMessage(null);
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
