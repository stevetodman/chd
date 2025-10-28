import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useId, useState, type FormEvent } from "react";
import { classNames } from "../lib/utils";
import { Button } from "./ui/Button";
import { FormField } from "./ui/FormField";

type Props = {
  onSubmit: (description: string) => Promise<void> | void;
  triggerClassName?: string;
};

const DEFAULT_ERROR_MESSAGE = "We couldn't send your report. Please try again.";

export default function ReportQuestionIssueDialog({ onSubmit, triggerClassName }: Props) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const descriptionId = useId();
  const errorId = useId();

  useEffect(() => {
    if (!open) {
      setDescription("");
      setError(null);
      setSubmitted(false);
      setSubmitting(false);
    }
  }, [open]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = description.trim();
    if (!trimmed) {
      setError("Tell us what needs attention before sending the report.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await onSubmit(trimmed);
      setDescription("");
      setSubmitted(true);
    } catch (submissionError) {
      const message =
        submissionError instanceof Error && submissionError.message
          ? submissionError.message
          : DEFAULT_ERROR_MESSAGE;
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button type="button" variant="ghost" className={classNames("w-full sm:w-auto", triggerClassName)}>
          Report issue
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content className="dialog-content fixed inset-0 z-50 flex items-center justify-center p-4 focus:outline-none">
          <div className="w-full max-w-lg rounded-2xl border border-surface-muted bg-surface-base p-6 shadow-xl focus:outline-none">
            <Dialog.Title className="text-lg font-semibold text-neutral-900">Report a problem</Dialog.Title>
            <Dialog.Description className="mt-2 text-sm text-neutral-600">
              Tell us what seems off and our team will take a look. Your note goes straight to the question editors.
            </Dialog.Description>
            {submitted ? (
              <div className="mt-6 space-y-6 text-sm text-neutral-700">
                <p role="status" aria-live="polite">
                  Thanks for letting us know. We&rsquo;ll review this question and follow up if we need more details.
                </p>
                <div className="flex justify-end">
                  <Dialog.Close asChild>
                    <Button type="button">Close</Button>
                  </Dialog.Close>
                </div>
              </div>
            ) : (
              <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                <FormField label="What needs attention?" htmlFor={descriptionId}>
                  <textarea
                    id={descriptionId}
                    name="description"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    className="min-h-[120px] w-full rounded-lg border border-surface-muted bg-surface-base px-3 py-2 text-sm text-neutral-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                    placeholder="Let us know if something is unclear, incorrect, or missing."
                    required
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? errorId : undefined}
                    maxLength={1000}
                  />
                </FormField>
                {error ? (
                  <p className="text-sm text-red-600" id={errorId} role="alert">
                    {error}
                  </p>
                ) : null}
                <div className="flex justify-end gap-3">
                  <Dialog.Close asChild>
                    <Button type="button" variant="secondary">
                      Cancel
                    </Button>
                  </Dialog.Close>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Sending…" : "Send report"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
