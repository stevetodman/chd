import { useState } from "react";
import Papa from "papaparse";
import { Button } from "../../components/ui/Button";
import { supabase } from "../../lib/supabaseClient";

interface CsvRow {
  slug: string;
  stem_md: string;
  lead_in: string;
  choiceA: string;
  choiceB: string;
  choiceC: string;
  choiceD: string;
  choiceE: string;
  correct_label: string;
  explanation_brief_md: string;
  explanation_deep_md: string;
  topic: string;
  subtopic: string;
  lesion: string;
  difficulty: string;
  bloom: string;
  lecture_link: string;
  media_murmur?: string;
  media_cxr?: string;
  media_ekg?: string;
  media_diagram?: string;
  alt_text?: string;
  status: string;
}

export default function Importer() {
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const handleFile = (file: File) => {
    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        setRows(result.data);
      }
    });
  };

  const publish = async () => {
    setMessage(null);
    for (const row of rows) {
      // Supabase integration: upsert questions + media bundles per CSV row.
      const { data: media } = await supabase
        .from("media_bundles")
        .insert({
          murmur_url: row.media_murmur,
          cxr_url: row.media_cxr,
          ekg_url: row.media_ekg,
          diagram_url: row.media_diagram,
          alt_text: row.alt_text
        })
        .select()
        .single();

      const { data: question } = await supabase
        .from("questions")
        .insert({
          slug: row.slug,
          stem_md: row.stem_md,
          lead_in: row.lead_in,
          explanation_brief_md: row.explanation_brief_md,
          explanation_deep_md: row.explanation_deep_md,
          topic: row.topic,
          subtopic: row.subtopic,
          lesion: row.lesion,
          status: row.status,
          media_bundle_id: media?.id
        })
        .select()
        .single();

      const labels = ["A", "B", "C", "D", "E"] as const;
      const choiceTexts = [row.choiceA, row.choiceB, row.choiceC, row.choiceD, row.choiceE];
      for (let i = 0; i < labels.length; i++) {
        await supabase.from("choices").insert({
          question_id: question?.id,
          label: labels[i],
          text_md: choiceTexts[i],
          is_correct: labels[i] === row.correct_label
        });
      }
    }
    setMessage(`Imported ${rows.length} items`);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">CSV Importer</h1>
      <input
        type="file"
        accept=".csv"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      {rows.length > 0 ? (
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <p className="text-sm text-neutral-600">Previewing {rows.length} rows.</p>
          <Button type="button" onClick={publish}>
            Publish to Supabase
          </Button>
        </div>
      ) : null}
      {message ? <p className="text-sm text-neutral-600">{message}</p> : null}
    </div>
  );
}
