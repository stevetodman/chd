import { useId } from "react";
import ReactMarkdown from "react-markdown";
import type { FormulaReference } from "../lib/constants";
import { classNames } from "../lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";
import { markdownRemarkPlugins, markdownRehypePlugins } from "../lib/markdown";

type Props = {
  title?: string | null;
  formulas?: FormulaReference[] | null;
  bodyMd?: string | null;
  labelId?: string;
  showTitle?: boolean;
  asSection?: boolean;
};

const hasContent = (items?: FormulaReference[] | null, bodyMd?: string | null) => {
  const hasItems = Array.isArray(items) && items.length > 0;
  const hasBody = typeof bodyMd === "string" && bodyMd.trim().length > 0;
  return hasItems || hasBody;
};

export default function FormulaPanel({
  title = "Formula Quick Ref",
  formulas,
  bodyMd,
  labelId,
  showTitle = true,
  asSection = true
}: Props) {
  const headingId = useId();
  const trimmedBody = typeof bodyMd === "string" ? bodyMd.trim() : "";

  if (!hasContent(formulas, bodyMd)) {
    return null;
  }

  const content = (
    <Card className={showTitle ? undefined : "border-0 bg-transparent shadow-none"}>
      {showTitle && title ? (
        <CardHeader>
          <CardTitle id={headingId}>{title}</CardTitle>
        </CardHeader>
      ) : null}
      <CardContent className={classNames("space-y-3 text-sm", showTitle ? undefined : "p-0")}
      >
        {Array.isArray(formulas) && formulas.length > 0 ? (
          <ul className="space-y-2">
            {formulas.map((formula) => (
              <li key={`${formula.name}-${formula.expression}`}>
                <p className="font-semibold text-neutral-900">{formula.name}</p>
                <p className="text-neutral-600">{formula.expression}</p>
              </li>
            ))}
          </ul>
        ) : null}
        {trimmedBody ? (
          <ReactMarkdown
            remarkPlugins={markdownRemarkPlugins}
            rehypePlugins={markdownRehypePlugins}
            className="prose prose-sm max-w-none text-neutral-700"
          >
            {trimmedBody}
          </ReactMarkdown>
        ) : null}
      </CardContent>
    </Card>
  );

  if (!asSection) {
    return content;
  }

  return (
    <section
      role="complementary"
      aria-labelledby={showTitle && title ? headingId : labelId}
      aria-label={showTitle && title ? undefined : "Formula reference"}
    >
      {content}
    </section>
  );
}
