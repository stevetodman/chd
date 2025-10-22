import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import type { FormulaReference } from "../lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";

type Props = {
  title?: string | null;
  formulas?: FormulaReference[] | null;
  bodyMd?: string | null;
};

const hasContent = (items?: FormulaReference[] | null, bodyMd?: string | null) => {
  const hasItems = Array.isArray(items) && items.length > 0;
  const hasBody = typeof bodyMd === "string" && bodyMd.trim().length > 0;
  return hasItems || hasBody;
};

export default function FormulaPanel({ title = "Formula Quick Ref", formulas, bodyMd }: Props) {
  if (!hasContent(formulas, bodyMd)) {
    return null;
  }

  const trimmedBody = typeof bodyMd === "string" ? bodyMd.trim() : "";

  return (
    <Card>
      {title ? (
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
      ) : null}
      <CardContent className="space-y-3 text-sm">
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
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw, rehypeHighlight]}
            className="prose prose-sm max-w-none text-neutral-700"
          >
            {trimmedBody}
          </ReactMarkdown>
        ) : null}
      </CardContent>
    </Card>
  );
}
