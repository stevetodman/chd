import { Button } from "./ui/Button";

type Props = {
  active: boolean;
  onToggle: () => void;
};

export default function StrikeThroughToggle({ active, onToggle }: Props) {
  return (
    <Button
      type="button"
      variant={active ? "secondary" : "ghost"}
      onClick={onToggle}
      aria-keyshortcuts="x"
      aria-pressed={active}
    >
      Strike
    </Button>
  );
}
