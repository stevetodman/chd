import type { BoundingBox, Size } from "./geom";
import { bboxToNaturalRect, naturalRectToDisplayRect, hasPositiveArea, isBoundingBox } from "./geom";

interface OverlayLabel {
  id: string;
  label: string;
  bbox: BoundingBox | null | undefined;
}

interface Props {
  labels: OverlayLabel[];
  naturalSize: Size | null;
  displaySize: Size | null;
  visible: boolean;
}

export function BoundingBoxOverlay({ labels, naturalSize, displaySize, visible }: Props) {
  if (!visible || !hasPositiveArea(naturalSize) || !hasPositiveArea(displaySize)) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-0 select-none">
      {labels.map((label) => {
        if (!isBoundingBox(label.bbox)) {
          return null;
        }

        const naturalRect = bboxToNaturalRect(label.bbox, naturalSize);
        const displayRect = naturalRectToDisplayRect(naturalRect, naturalSize, displaySize);

        return (
          <div
            key={label.id}
            style={{
              left: `${displayRect.x}px`,
              top: `${displayRect.y}px`,
              width: `${displayRect.width}px`,
              height: `${displayRect.height}px`
            }}
            className="absolute border border-sky-500 bg-sky-500/10"
          >
            <span className="absolute left-0 top-0 bg-sky-500 px-1 text-[10px] font-semibold leading-4 text-white">
              {label.label}
            </span>
            <span className="absolute right-0 bottom-0 bg-sky-500/80 px-1 text-[10px] font-mono text-white">
              {label.id.slice(0, 6)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
