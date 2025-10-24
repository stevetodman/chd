import { useId } from "react";
import type { KeyboardEvent } from "react";
import type { ContextPanel } from "../lib/constants";
import CollapsibleSection from "./CollapsibleSection";
import LabPanel from "./LabPanel";
import FormulaPanel from "./FormulaPanel";
import { classNames } from "../lib/utils";

type Props = {
  panels?: ContextPanel[] | null;
  defaultOpen?: boolean;
  idPrefix?: string;
  className?: string;
};

type PanelWithIndex = {
  panel: ContextPanel;
  index: number;
};

const activateToggleButton = (buttonId: string, requireOpen: boolean) => {
  if (typeof document === "undefined") return;
  const element = document.getElementById(buttonId);
  if (!(element instanceof HTMLButtonElement)) return;
  const isExpanded = element.getAttribute("aria-expanded") === "true";
  if (requireOpen && !isExpanded) return;
  element.click();
};

const handleSectionKeyDown = (buttonId: string) => (event: KeyboardEvent<HTMLElement>) => {
  if (event.defaultPrevented || event.target !== event.currentTarget) {
    return;
  }

  if (event.key === "Escape") {
    activateToggleButton(buttonId, true);
    event.preventDefault();
    event.stopPropagation();
    return;
  }

  if (event.key === "Enter" || event.key === " " || event.key === "Spacebar") {
    activateToggleButton(buttonId, false);
    event.preventDefault();
    event.stopPropagation();
  }
};

const getPanelSummary = (panel: ContextPanel): string | undefined => {
  if (panel.kind === "labs") {
    const count = panel.labs?.length ?? 0;
    if (count > 0) {
      return `${count} value${count === 1 ? "" : "s"}`;
    }
    return undefined;
  }

  if (panel.kind === "formula") {
    const count = panel.formulas?.length ?? 0;
    if (count > 0) {
      return `${count} formula${count === 1 ? "" : "s"}`;
    }
    if (panel.body_md) {
      return "Reference notes";
    }
  }

  return undefined;
};

const getPanelTitle = (panel: ContextPanel) => {
  if (panel.title && panel.title.trim().length > 0) {
    return panel.title;
  }
  return panel.kind === "labs" ? "Vitals & Labs" : "Formula Quick Ref";
};

export default function ContextPanelList({
  panels,
  defaultOpen = false,
  idPrefix,
  className
}: Props) {
  const generatedPrefix = useId();
  const resolvedPanels: PanelWithIndex[] = Array.isArray(panels)
    ? panels
        .filter((panel): panel is ContextPanel => panel != null)
        .map((panel, index) => ({ panel, index }))
    : [];

  if (resolvedPanels.length === 0) {
    return null;
  }

  const prefix = idPrefix ?? generatedPrefix;

  return (
    <div className={classNames("space-y-4", className)}>
      {resolvedPanels.map(({ panel, index }) => {
        const baseId = `${prefix}-${panel.id ?? `${panel.kind}-${index}`}`;
        const labelId = `${baseId}-label`;
        const toggleId = `${baseId}-toggle`;
        const title = getPanelTitle(panel);
        const summary = getPanelSummary(panel);
        const onKeyDown = handleSectionKeyDown(toggleId);

        return (
          <section
            key={baseId}
            role="complementary"
            aria-labelledby={labelId}
            tabIndex={0}
            onKeyDown={onKeyDown}
            className="rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          >
            <h2 id={labelId} className="sr-only">
              {title}
            </h2>
            <CollapsibleSection
              id={toggleId}
              title={title}
              summary={summary}
              defaultOpen={defaultOpen}
              toggleButtonProps={{ "data-panel-toggle": true }}
            >
              {panel.kind === "labs" ? (
                <LabPanel labs={panel.labs} showTitle={false} labelId={labelId} />
              ) : (
                <FormulaPanel
                  title={panel.title}
                  formulas={panel.formulas}
                  bodyMd={panel.body_md}
                  showTitle={false}
                  labelId={labelId}
                />
              )}
            </CollapsibleSection>
          </section>
        );
      })}
    </div>
  );
}
