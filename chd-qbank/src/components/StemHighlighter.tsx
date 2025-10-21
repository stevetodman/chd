import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";
import { Button } from "./ui/Button";

type Props = {
  stem: string;
};

export default function StemHighlighter({ stem }: Props) {
  const [highlight, setHighlight] = useState(false);
  return (
    <div className="space-y-3">
      <div className={highlight ? "rounded-md bg-yellow-100 p-4" : "rounded-md bg-white p-4"}>
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw, rehypeHighlight]} className="prose prose-sm max-w-none">
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
