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
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full select-none"
      viewBox={`0 0 ${displaySize.width} ${displaySize.height}`}
      preserveAspectRatio="none"
    >
      {labels.map((label) => {
        if (!isBoundingBox(label.bbox)) {
          return null;
        }

        const naturalRect = bboxToNaturalRect(label.bbox, naturalSize);
        const displayRect = naturalRectToDisplayRect(naturalRect, naturalSize, displaySize);
        const { x, y, width, height } = displayRect;

        const labelTagWidth = Math.min(width, Math.max(36, label.label.length * 6 + 8));
        const idText = label.id.slice(0, 6);
        const idTagWidth = Math.min(width, Math.max(28, idText.length * 6 + 8));
        const tagHeight = 16;

        return (
          <g key={label.id}>
            <rect
              x={x}
              y={y}
              width={width}
              height={height}
              fill="#38bdf8"
              fillOpacity={0.15}
              stroke="#0ea5e9"
              strokeWidth={1}
            />
            <rect x={x} y={y} width={labelTagWidth} height={tagHeight} fill="#0ea5e9" />
            <text
              x={x + 4}
              y={y + 3}
              fill="#fff"
              fontSize={10}
              fontFamily="Inter, system-ui, sans-serif"
              fontWeight={600}
              dominantBaseline="hanging"
            >
              {label.label}
            </text>
            <rect
              x={x + width - idTagWidth}
              y={y + height - tagHeight}
              width={idTagWidth}
              height={tagHeight}
              fill="#0ea5e9"
              fillOpacity={0.8}
            />
            <text
              x={x + width - idTagWidth + 4}
              y={y + height - 4}
              fill="#fff"
              fontSize={10}
              fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace"
              fontWeight={500}
              textAnchor="start"
            >
              {idText}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
