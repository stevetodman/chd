import { classNames } from "../lib/utils";
import { Button } from "./ui/Button";

type Props = {
  flagged: boolean;
  onToggle: () => void | Promise<void>;
  className?: string;
};

export default function FlagButton({ flagged, onToggle, className }: Props) {
  return (
    <Button
      type="button"
      variant={flagged ? "secondary" : "ghost"}
      onClick={onToggle}
      aria-pressed={flagged}
      aria-label={flagged ? "Remove flag" : "Flag question"}
      className={classNames("flex items-center gap-2", className)}
    >
      <span aria-hidden>🚩</span>
      {flagged ? "Flagged" : "Flag"}
    </Button>
  );
}
