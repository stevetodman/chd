import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { markdownRemarkPlugins, markdownRehypePlugins } from "../lib/markdown";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";
import { Button } from "./ui/Button";

type Props = {
  brief: string;
  deep?: string | null;
};

export default function Explanation({ brief, deep }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Explanation</CardTitle>
        {deep ? (
          <Button type="button" variant="ghost" onClick={() => setOpen((prev) => !prev)}>
            {open ? "Hide deep dive" : "Show deep dive"}
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-neutral-700">
        <ReactMarkdown
          remarkPlugins={markdownRemarkPlugins}
          rehypePlugins={markdownRehypePlugins}
          className="prose prose-sm max-w-none"
        >
          {brief}
        </ReactMarkdown>
        {deep && open ? (
          <div className="rounded-md bg-neutral-50 p-3">
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
}
