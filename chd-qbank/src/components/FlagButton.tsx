import { Button } from "./ui/Button";

type Props = {
  flagged: boolean;
  onToggle: () => void;
};

export default function FlagButton({ flagged, onToggle }: Props) {
  return (
    <Button
      type="button"
      variant={flagged ? "secondary" : "ghost"}
      onClick={onToggle}
      aria-pressed={flagged}
      aria-label={flagged ? "Remove flag" : "Flag question"}
      className="flex items-center gap-2"
    >
      <span aria-hidden>🚩</span>
      {flagged ? "Flagged" : "Flag"}
    </Button>
  );
}
