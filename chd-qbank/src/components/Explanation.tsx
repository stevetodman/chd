import { forwardRef, useState } from "react";
import type { ComponentPropsWithoutRef } from "react";
import { classNames } from "../lib/utils";
import ReactMarkdown from "react-markdown";
import { markdownRemarkPlugins, markdownRehypePlugins } from "../lib/markdown";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";
import { Button } from "./ui/Button";

type Props = {
  brief: string;
  deep?: string | null;
  showHeader?: boolean;
  labelId?: string;
};

type ExplanationProps = Props & ComponentPropsWithoutRef<typeof Card>;

const Explanation = forwardRef<HTMLDivElement, ExplanationProps>(function Explanation(
  { brief, deep, showHeader = true, labelId, className, ...cardProps },
  ref
) {
  const [open, setOpen] = useState(false);
  const toggleLabel = open ? "Hide deep dive" : "Show deep dive";
  const handleToggle = () => setOpen((prev) => !prev);
  const deepSectionId = labelId ? `${labelId}-deep` : undefined;
  return (
    <Card
      ref={ref}
      aria-labelledby={labelId}
      className={classNames(showHeader ? undefined : "border-0 bg-transparent p-0 shadow-none", className)}
      {...cardProps}
    >
      {showHeader ? (
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Explanation</CardTitle>
          {deep ? (
            <Button
              type="button"
              variant="ghost"
              onClick={handleToggle}
              aria-expanded={open}
              aria-controls={deepSectionId}
            >
              {toggleLabel}
            </Button>
          ) : null}
        </CardHeader>
      ) : null}
      <CardContent
        className={classNames("space-y-3 text-sm text-neutral-700", showHeader ? undefined : "p-0")}
      >
        {!showHeader && deep ? (
          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={handleToggle}
              aria-expanded={open}
              aria-controls={deepSectionId}
            >
              {toggleLabel}
            </Button>
          </div>
        ) : null}
        <ReactMarkdown
          remarkPlugins={markdownRemarkPlugins}
          rehypePlugins={markdownRehypePlugins}
          className="prose prose-sm max-w-none"
        >
          {brief}
        </ReactMarkdown>
        {deep && open ? (
          <div id={deepSectionId} className="explanation-deep rounded-md bg-neutral-50 p-3">
            <ReactMarkdown
              remarkPlugins={markdownRemarkPlugins}
              rehypePlugins={markdownRehypePlugins}
              className="prose prose-sm max-w-none"
            >
              {deep}
            </ReactMarkdown>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
});

export default Explanation;
