import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "./ui/Button";
import { markdownRemarkPlugins, markdownRehypePlugins } from "../lib/markdown";

type Props = {
  stem: string;
};

export default function StemHighlighter({ stem }: Props) {
  const [highlight, setHighlight] = useState(false);
  return (
    <div className="space-y-3">
      <div className={highlight ? "rounded-md bg-yellow-100 p-4" : "rounded-md bg-white p-4"}>
        <ReactMarkdown
          remarkPlugins={markdownRemarkPlugins}
          rehypePlugins={markdownRehypePlugins}
          className="prose prose-sm max-w-none"
        >
          {stem}
        </ReactMarkdown>
      </div>
      <Button
        type="button"
        variant={highlight ? "secondary" : "ghost"}
        onClick={() => setHighlight((prev) => !prev)}
        aria-keyshortcuts="h"
      >
        {highlight ? "Remove highlight" : "Highlight stem"}
      </Button>
    </div>
  );
}
