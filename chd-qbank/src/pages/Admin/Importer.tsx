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

type Step = "upload" | "preview" | "import";

interface RowValidation {
  index: number;
  slug?: string | null;
  issues: string[];
}

const REQUIRED_COLUMNS: Array<keyof CsvRow> = [
  "slug",
  "stem_md",
  "lead_in",
  "choiceA",
  "choiceB",
  "choiceC",
  "choiceD",
  "choiceE",
  "correct_label",
  "explanation_brief_md",
  "topic",
  "status",
  "difficulty",
  "bloom"
];

const PREVIEW_COLUMNS: Array<{ key: keyof CsvRow; label: string; required?: boolean }> = [
  { key: "slug", label: "Slug", required: true },
  { key: "stem_md", label: "Stem (Markdown)", required: true },
  { key: "lead_in", label: "Lead in", required: true },
  { key: "choiceA", label: "Choice A", required: true },
  { key: "choiceB", label: "Choice B", required: true },
  { key: "choiceC", label: "Choice C", required: true },
  { key: "choiceD", label: "Choice D", required: true },
  { key: "choiceE", label: "Choice E", required: true },
  { key: "correct_label", label: "Correct", required: true },
  { key: "explanation_brief_md", label: "Brief explanation", required: true },
  { key: "topic", label: "Topic", required: true },
  { key: "status", label: "Status", required: true },
  { key: "difficulty", label: "Difficulty", required: true },
  { key: "bloom", label: "Bloom", required: true }
];

const VALID_CORRECT_LABELS = new Set(["A", "B", "C", "D", "E"]);
const SAMPLE_TEMPLATE_URL = "/import_template.csv";

export default function Importer() {
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [serverErrors, setServerErrors] = useState<{ slug: string | null; error: string }[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState<string | null>(null);
  const [missingColumns, setMissingColumns] = useState<string[]>([]);
  const [rowValidations, setRowValidations] = useState<RowValidation[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);

  const reset = () => {
    setRows([]);
    setMessage(null);
    setServerErrors([]);
    setPublishing(false);
    setStep("upload");
    setFileName(null);
    setMissingColumns([]);
    setRowValidations([]);
    setParseError(null);
  };

  // Parse the uploaded CSV into normalized row objects using Papa.
  const handleFile = (file: File) => {
    setParseError(null);
    setMessage(null);
    setServerErrors([]);
    setPublishing(false);
    setStep("upload");
    setFileName(file.name);

    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const parsedRows = result.data;
        setRows(parsedRows);

        const fields = (result.meta.fields ?? [])
          .map((field) => field?.trim?.() ?? "")
          .filter((field): field is string => field.length > 0);

        const missing = REQUIRED_COLUMNS.filter((column) => !fields.includes(column));
        setMissingColumns(missing);

        const validations = validateRows(parsedRows);
        setRowValidations(validations);

        setStep("preview");
      },
      error: (error) => {
        setParseError(error.message);
      }
    });
  };

  const publish = async () => {
    if (rows.length === 0 || missingColumns.length > 0 || rowValidations.length > 0) return;

    setMessage(null);
    setServerErrors([]);
    setPublishing(true);

    // Translate CSV columns into the payload expected by the Supabase RPC function.
    const payload = rows.map((row) => {
      const slug = row.slug?.trim();
      const correctLabel = row.correct_label?.trim();

      return {
        slug,
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
        correct_label: correctLabel ? correctLabel.toUpperCase() : null
      };
    });

    const { data, error } = await supabase.rpc("import_question_rows", { rows: payload });

    setStep("import");

    if (error) {
      // Surface RPC failures at the top-level to the administrator.
      setMessage("Import failed");
      setServerErrors([{ slug: null, error: error.message }]);
    } else if (data) {
      setMessage(`Processed ${data.processed} rows`);
      if (Array.isArray(data.errors)) {
        // Display per-row validation errors from the RPC response.
        setServerErrors(data.errors as { slug: string | null; error: string }[]);
      }
    }

    setPublishing(false);
  };

  const importDisabled =
    publishing || rows.length === 0 || missingColumns.length > 0 || rowValidations.length > 0;

  const steps: Array<{ id: Step; title: string }> = [
    { id: "upload", title: "Upload" },
    { id: "preview", title: "Preview & validate" },
    { id: "import", title: "Import" }
  ];

  const currentStepIndex = steps.findIndex((item) => item.id === step);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">CSV Importer</h1>
        <p className="text-sm text-neutral-600">
          Upload a CSV file, review the parsed rows, and then import them into Supabase.
        </p>
      </div>

      <ol className="flex flex-wrap gap-3 text-sm font-medium">
        {steps.map((item, index) => {
          const isActive = index === currentStepIndex;
          const isComplete = index < currentStepIndex;
          return (
            <li
              key={item.id}
              className={`flex items-center gap-2 rounded-full border px-3 py-1 ${
                isActive
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : isComplete
                  ? "border-success-500 bg-success-50 text-success-700"
                  : "border-neutral-200 bg-white text-neutral-600"
              }`}
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full border">
                {index + 1}
              </span>
              {item.title}
            </li>
          );
        })}
      </ol>

      <section className="rounded-lg border border-neutral-200 bg-white p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Upload CSV</h2>
            <p className="text-sm text-neutral-600">
              Use the template to ensure column names match exactly. Required columns are highlighted
              below.
            </p>
          </div>
          <a
            href={SAMPLE_TEMPLATE_URL}
            className="text-sm font-medium text-brand-700 underline-offset-2 hover:underline"
          >
            Download sample template
          </a>
        </div>

        <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-center">
          <label className="flex flex-col text-sm font-medium text-neutral-700">
            Choose CSV file
            <input
              className="mt-1 w-full rounded border border-neutral-200 px-3 py-2 text-sm shadow-sm"
              type="file"
              accept=".csv"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleFile(file);
                } else {
                  reset();
                }
              }}
            />
          </label>
          {fileName ? (
            <p className="text-sm text-neutral-600">Selected file: {fileName}</p>
          ) : null}
        </div>

        <div className="mt-6">
          <h3 className="text-sm font-semibold text-neutral-700">Required columns</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {REQUIRED_COLUMNS.map((column) => (
              <span
                key={column}
                className={`rounded-full border px-3 py-1 text-xs font-medium ${
                  missingColumns.includes(column)
                    ? "border-danger-300 bg-danger-50 text-danger-700"
                    : "border-success-300 bg-success-50 text-success-700"
                }`}
              >
                {column}
              </span>
            ))}
          </div>
          {missingColumns.length > 0 ? (
            <p className="mt-3 text-sm text-danger-700">
              Missing columns detected: {missingColumns.join(", ")}. Update your CSV header to
              continue.
            </p>
          ) : null}
        </div>

        {parseError ? (
          <p className="mt-4 text-sm text-danger-700">Failed to parse file: {parseError}</p>
        ) : null}
      </section>

      {step !== "upload" ? (
        <section className="space-y-4 rounded-lg border border-neutral-200 bg-white p-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Preview &amp; validate</h2>
              <p className="text-sm text-neutral-600">
                {rows.length === 0
                  ? "No rows found. Upload a CSV to continue."
                  : `Previewing ${rows.length} ${rows.length === 1 ? "row" : "rows"}.`}
              </p>
            </div>
            <Button type="button" variant="secondary" onClick={reset}>
              Start over
            </Button>
          </div>

          {rows.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-200 text-left text-sm">
                <thead className="bg-neutral-50">
                  <tr>
                    {PREVIEW_COLUMNS.map((column) => (
                      <th
                        key={column.key}
                        scope="col"
                        className={`px-3 py-2 font-semibold uppercase tracking-wide text-xs ${
                          column.required ? "bg-warning-50 text-warning-900" : "text-neutral-600"
                        }`}
                      >
                        {column.label}
                        {column.required ? <span className="ml-1 text-danger-500">*</span> : null}
                      </th>
                    ))}
                    <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-600">
                      Row issues
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {rows.map((row, index) => {
                    const validation = rowValidations.find((item) => item.index === index);
                    return (
                      <tr key={`row-${index}`} className={validation ? "bg-danger-50" : "bg-white"}>
                        {PREVIEW_COLUMNS.map((column) => (
                          <td key={column.key} className="px-3 py-2 align-top">
                            <span className="whitespace-pre-wrap text-sm text-neutral-800">
                              {row[column.key] ?? ""}
                            </span>
                          </td>
                        ))}
                        <td
                          className={`px-3 py-2 text-sm ${
                            validation ? "text-danger-700" : "text-neutral-400"
                          }`}
                        >
                          {validation ? validation.issues.join("; ") : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}

          {rowValidations.length > 0 ? (
            <div className="rounded border border-danger-200 bg-danger-50 p-3 text-sm text-danger-700">
              <p className="font-semibold">Fix these rows before importing</p>
              <ul className="mt-2 space-y-1">
                {rowValidations.map((item) => (
                  <li key={`validation-${item.index}`}>
                    Row {item.index + 2}
                    {item.slug ? ` (${item.slug.trim()})` : ""}: {item.issues.join(", ")}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <Button type="button" onClick={publish} disabled={importDisabled}>
              {publishing ? "Importing…" : "Import rows"}
            </Button>
            {importDisabled ? (
              <p className="text-sm text-neutral-600">
                Resolve highlighted issues to enable importing.
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      {step === "import" ? (
        <section className="space-y-3 rounded-lg border border-neutral-200 bg-white p-6">
          <h2 className="text-lg font-semibold">Import results</h2>
          {message ? <p className="text-sm text-neutral-700">{message}</p> : null}
          {serverErrors.length > 0 ? (
            <div className="rounded border border-danger-200 bg-danger-50 p-3 text-sm text-danger-700">
              <p className="font-semibold">Import errors</p>
              <ul className="mt-2 space-y-1">
                {serverErrors.map((err, idx) => (
                  <li key={`${err.slug ?? "batch"}-${idx}`}>
                    {err.slug ? <span className="font-medium">{err.slug}: </span> : null}
                    {err.error}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function validateRows(rows: CsvRow[]): RowValidation[] {
  return rows.reduce<RowValidation[]>((acc, row, index) => {
    const issues: string[] = [];

    REQUIRED_COLUMNS.forEach((column) => {
      const value = row[column];
      if (typeof value === "string") {
        if (value.trim().length === 0) {
          issues.push(`${column} is required`);
        }
      } else if (value === undefined || value === null) {
        issues.push(`${column} is required`);
      }
    });

    if (row.correct_label) {
      const normalized = row.correct_label.trim().toUpperCase();
      if (!VALID_CORRECT_LABELS.has(normalized)) {
        issues.push("correct_label must be one of A, B, C, D, or E");
      }
    }

    if (issues.length > 0) {
      acc.push({
        index,
        slug: row.slug,
        issues
      });
    }

    return acc;
  }, []);
}
