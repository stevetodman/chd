import type { NormalizedBBox } from "../../games/cxr/geom";

interface OverlayBox {
  id: string;
  label: string;
  bbox: NormalizedBBox;
  isCorrect: boolean;
}

interface CxrBoundingBoxOverlayProps {
  boxes: OverlayBox[];
  visible: boolean;
}

export function CxrBoundingBoxOverlay({ boxes, visible }: CxrBoundingBoxOverlayProps) {
  if (!visible || boxes.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-0">
      {boxes.map((box) => {
        const style = {
          left: `${box.bbox.x * 100}%`,
          top: `${box.bbox.y * 100}%`,
          width: `${box.bbox.w * 100}%`,
          height: `${box.bbox.h * 100}%`
        } as const;

        const colorClasses = box.isCorrect
          ? "border-emerald-500/80 bg-emerald-500/10 text-emerald-700"
          : "border-amber-500/80 bg-amber-500/10 text-amber-700";

        return (
          <div
            key={box.id}
            className={`absolute rounded border-2 ${colorClasses}`}
            style={style}
          >
            <div className="absolute left-1 top-1 rounded bg-black/60 px-1 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white">
              {box.id}
            </div>
            <div className="absolute bottom-1 left-1 right-1 truncate rounded bg-white/70 px-1 py-0.5 text-[10px] font-medium text-neutral-800">
              {box.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}
