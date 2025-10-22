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
  const [errors, setErrors] = useState<{ slug: string | null; error: string }[]>([]);
  const [publishing, setPublishing] = useState(false);

  // Parse the uploaded CSV into normalized row objects using Papa.
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
    setErrors([]);
    setPublishing(true);

    // Translate CSV columns into the payload expected by the Supabase RPC function.
    const payload = rows.map((row) => ({
      slug: row.slug?.trim(),
      stem_md: row.stem_md,
      lead_in: row.lead_in,
      explanation_brief_md: row.explanation_brief_md,
      explanation_deep_md: row.explanation_deep_md,
      topic: row.topic,
      subtopic: row.subtopic,
      lesion: row.lesion,
      difficulty: row.difficulty,
      bloom: row.bloom,
      lecture_link: row.lecture_link,
      status: row.status,
      media_murmur: row.media_murmur,
      media_cxr: row.media_cxr,
      media_ekg: row.media_ekg,
      media_diagram: row.media_diagram,
      alt_text: row.alt_text,
      choiceA: row.choiceA,
      choiceB: row.choiceB,
      choiceC: row.choiceC,
      choiceD: row.choiceD,
      choiceE: row.choiceE,
      correct_label: row.correct_label?.toUpperCase()
    }));

    const { data, error } = await supabase.rpc("import_question_rows", { rows: payload });

    if (error) {
      // Surface RPC failures at the top-level to the administrator.
      setMessage("Import failed");
      setErrors([{ slug: null, error: error.message }]);
    } else if (data) {
      setMessage(`Processed ${data.processed} rows`);
      if (Array.isArray(data.errors)) {
        // Display per-row validation errors from the RPC response.
        setErrors(data.errors as { slug: string | null; error: string }[]);
      }
    }

    setPublishing(false);
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
          <Button type="button" onClick={publish} disabled={publishing}>
            Publish to Supabase
          </Button>
        </div>
      ) : null}
      {message ? <p className="text-sm text-neutral-600">{message}</p> : null}
      {errors.length > 0 ? (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <p className="font-semibold">Import errors</p>
          <ul className="mt-2 space-y-1">
            {errors.map((err, idx) => (
              <li key={`${err.slug ?? "batch"}-${idx}`}>
                {err.slug ? <span className="font-medium">{err.slug}: </span> : null}
                {err.error}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
