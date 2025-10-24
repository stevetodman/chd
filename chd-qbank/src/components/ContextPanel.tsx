import { useId } from "react";
import ReactMarkdown from "react-markdown";
import { markdownRemarkPlugins, markdownRehypePlugins } from "../lib/markdown";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";

type Props = {
  title?: string | null;
  bodyMd?: string | null;
  labelId?: string;
  showTitle?: boolean;
  asSection?: boolean;
};

export default function ContextPanel({
  title = "Context",
  bodyMd,
  labelId,
  showTitle = true,
  asSection = true
}: Props) {
  const trimmedBody = typeof bodyMd === "string" ? bodyMd.trim() : "";

  if (!trimmedBody) {
    return null;
  }

  const headingId = useId();

  const content = (
    <Card className={showTitle ? undefined : "border-0 bg-transparent shadow-none"}>
      {showTitle && title ? (
        <CardHeader>
          <CardTitle id={headingId}>{title}</CardTitle>
        </CardHeader>
      ) : null}
      <CardContent className={showTitle ? "text-sm text-neutral-700" : "p-0 text-sm text-neutral-700"}>
        <ReactMarkdown
          remarkPlugins={markdownRemarkPlugins}
          rehypePlugins={markdownRehypePlugins}
          className="prose prose-sm max-w-none"
        >
          {trimmedBody}
        </ReactMarkdown>
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
      aria-label={showTitle && title ? undefined : "Additional context"}
    >
      {content}
    </section>
  );
}
