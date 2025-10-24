import * as Dialog from "@radix-ui/react-dialog";
import type { ReactNode } from "react";
import { Button } from "../../components/ui/Button";
import type { PracticeFilters } from "../../hooks/usePracticeSession";
import type { PracticeFilterOptions } from "../../hooks/usePracticeSession";
import type { MessageDescriptor, MessageValues } from "../../i18n";
import { PracticeFilterFields } from "./PracticeFilterFields";

interface PracticeFiltersSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: PracticeFilters;
  onFiltersChange: (filters: PracticeFilters) => void;
  filterOptions: PracticeFilterOptions;
  filterOptionsLoading: boolean;
  filterOptionsError: string | null;
  formatMessage: (descriptor: MessageDescriptor, values?: MessageValues) => string;
  onApply: () => void;
  onReset: () => void;
  filterChanged: boolean;
  trigger: ReactNode;
}

export function PracticeFiltersSheet({
  open,
  onOpenChange,
  filters,
  onFiltersChange,
  filterOptions,
  filterOptionsLoading,
  filterOptionsError,
  formatMessage,
  onApply,
  onReset,
  filterChanged,
  trigger
}: PracticeFiltersSheetProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content className="dialog-content fixed inset-0 z-50 flex flex-col bg-surface-base focus:outline-none">
          <div className="flex items-center justify-between border-b border-surface-muted px-4 py-4">
            <Dialog.Title className="text-base font-semibold text-surface-inverted">
              {formatMessage({ id: "practice.filters.title", defaultMessage: "Practice filters" })}
            </Dialog.Title>
            <Dialog.Close asChild>
              <Button type="button" variant="ghost" className="text-brand-600 hover:text-brand-500">
                {formatMessage({ id: "practice.filters.done", defaultMessage: "Done" })}
              </Button>
            </Dialog.Close>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4 text-base text-neutral-700">
            <div className="space-y-6">
              <PracticeFilterFields
                value={filters}
                onChange={onFiltersChange}
                filterOptions={filterOptions}
                filterOptionsLoading={filterOptionsLoading}
                formatMessage={formatMessage}
                errorMessage={filterOptionsError}
                idPrefix="mobile"
              />
            </div>
          </div>
          <div className="space-y-3 border-t border-surface-muted px-4 py-4">
            <Button
              type="button"
              className="w-full"
              onClick={onApply}
              disabled={!filterChanged}
            >
              {formatMessage({ id: "practice.filters.apply", defaultMessage: "Apply filters" })}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={onReset}
            >
              {formatMessage({ id: "practice.filters.reset", defaultMessage: "Reset to defaults" })}
            </Button>
            {filterOptionsLoading ? (
              <span className="block text-center text-xs text-neutral-500">
                {formatMessage({ id: "practice.filters.loading", defaultMessage: "Loading filter options…" })}
              </span>
            ) : null}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
