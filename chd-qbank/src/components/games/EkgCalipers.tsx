import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { ChangeEvent, KeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import { Button } from "../ui/Button";

type DragHandle = "left" | "right" | "span";

const DEFAULT_POSITIONS = { left: 0.32, right: 0.56 };
const MIN_SPAN = 0.02;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

type CaliperMeasurement = {
  pixels: number;
  smallBoxes: number;
  bigBoxes: number;
  seconds: number;
  milliseconds: number;
  heartRate: number | null;
};

type DragState = {
  handle: DragHandle;
  pointerId: number;
  startPct: number;
  initialLeft: number;
  initialRight: number;
};

function formatNumber(value: number, fractionDigits: number) {
  return value.toLocaleString(undefined, {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: value < 10 ? Math.min(fractionDigits, 2) : 0
  });
}

export function EkgCalipers({ alt, src }: { alt: string; src: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [positions, setPositions] = useState({ ...DEFAULT_POSITIONS });
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [smallBoxSize, setSmallBoxSize] = useState(12);
  const [isVisible, setIsVisible] = useState(true);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const smallBoxInputId = useId();

  useEffect(() => {
    const imageEl = imageRef.current;
    if (!imageEl || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setDimensions({ width, height });
    });

    observer.observe(imageEl);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const handleMove = (event: PointerEvent) => {
      if (!dragState) return;
      if (event.pointerId !== dragState.pointerId) return;
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      if (rect.width === 0) return;

      const rawPct = (event.clientX - rect.left) / rect.width;

      setPositions((prev) => {
        if (dragState.handle === "left") {
          const nextLeft = clamp(rawPct, 0, prev.right - MIN_SPAN);
          return { ...prev, left: nextLeft };
        }

        if (dragState.handle === "right") {
          const nextRight = clamp(rawPct, prev.left + MIN_SPAN, 1);
          return { ...prev, right: nextRight };
        }

        const spanWidth = dragState.initialRight - dragState.initialLeft;
        const delta = rawPct - dragState.startPct;
        let nextLeft = dragState.initialLeft + delta;
        let nextRight = dragState.initialRight + delta;

        if (nextLeft < 0) {
          const correction = -nextLeft;
          nextLeft += correction;
          nextRight += correction;
        }

        if (nextRight > 1) {
          const correction = nextRight - 1;
          nextLeft -= correction;
          nextRight -= correction;
        }

        nextLeft = clamp(nextLeft, 0, 1 - spanWidth);
        nextRight = clamp(nextRight, spanWidth, 1);

        return { left: nextLeft, right: nextRight };
      });
    };

    const handleUp = (event: PointerEvent) => {
      if (!dragState) return;
      if (event.pointerId !== dragState.pointerId) return;
      setDragState(null);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);

    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
    };
  }, [dragState]);

  const measurement: CaliperMeasurement | null = useMemo(() => {
    if (dimensions.width === 0) return null;
    const leftPx = positions.left * dimensions.width;
    const rightPx = positions.right * dimensions.width;
    const pixels = Math.max(0, Math.abs(rightPx - leftPx));
    if (pixels === 0) return null;
    const smallBoxes = smallBoxSize > 0 ? pixels / smallBoxSize : 0;
    const bigBoxes = smallBoxes / 5;
    const seconds = smallBoxes * 0.04;
    const milliseconds = seconds * 1000;
    const heartRate = seconds > 0 ? 60 / seconds : null;
    return { pixels, smallBoxes, bigBoxes, seconds, milliseconds, heartRate };
  }, [dimensions.width, positions.left, positions.right, smallBoxSize]);

  const startDrag = (handle: DragHandle) => (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    if (rect.width === 0) return;
    const pct = (event.clientX - rect.left) / rect.width;
    setDragState({
      handle,
      pointerId: event.pointerId,
      startPct: pct,
      initialLeft: positions.left,
      initialRight: positions.right
    });
  };

  const handleKeyMove = (handle: DragHandle, direction: -1 | 1) => {
    setPositions((prev) => {
      const step = dimensions.width > 0 ? 1 / dimensions.width : 0.01;
      if (handle === "left") {
        const nextLeft = clamp(prev.left + step * direction, 0, prev.right - MIN_SPAN);
        return { ...prev, left: nextLeft };
      }
      if (handle === "right") {
        const nextRight = clamp(prev.right + step * direction, prev.left + MIN_SPAN, 1);
        return { ...prev, right: nextRight };
      }
      const spanWidth = prev.right - prev.left;
      let nextLeft = prev.left + step * direction;
      let nextRight = prev.right + step * direction;
      if (nextLeft < 0) {
        nextLeft = 0;
        nextRight = spanWidth;
      }
      if (nextRight > 1) {
        nextRight = 1;
        nextLeft = 1 - spanWidth;
      }
      return { left: nextLeft, right: nextRight };
    });
  };

  const onHandleKeyDown = (handle: DragHandle) => (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      handleKeyMove(handle, event.key === "ArrowLeft" ? -1 : 1);
    }
  };

  const resetCalipers = () => {
    setPositions({ ...DEFAULT_POSITIONS });
  };

  const handleSmallBoxChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = Number(event.target.value);
    if (Number.isFinite(nextValue) && nextValue > 0) {
      setSmallBoxSize(nextValue);
    }
  };

  const leftPx = positions.left * dimensions.width;
  const rightPx = positions.right * dimensions.width;
  const spanPx = Math.max(0, Math.abs(rightPx - leftPx));
  const spanLeftPx = Math.min(leftPx, rightPx);

  return (
    <div className="space-y-3">
      <div ref={containerRef} className="relative mx-auto w-full max-w-2xl">
        <img
          ref={imageRef}
          src={src}
          alt={alt}
          className="block max-h-[360px] w-full rounded border border-neutral-200 object-contain"
        />
        {isVisible && dimensions.width > 0 ? (
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-y-0" style={{ left: `${leftPx}px` }}>
              <div className="absolute inset-y-0 left-0 w-px bg-brand-500" />
              <button
                type="button"
                className="pointer-events-auto absolute top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 cursor-grab items-center justify-center rounded-full border border-white/70 bg-brand-500 text-white shadow-lg outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
                onPointerDown={startDrag("left")}
                onKeyDown={onHandleKeyDown("left")}
                aria-label="Move left caliper"
                style={{ touchAction: "none" }}
              >
                <span className="sr-only">Move left caliper</span>
                <span aria-hidden className="h-6 w-0.5 bg-white" />
              </button>
              <div className="absolute left-1/2 top-0 h-3 w-8 -translate-x-1/2 rounded-b bg-brand-500/80" />
              <div className="absolute bottom-0 left-1/2 h-3 w-8 -translate-x-1/2 rounded-t bg-brand-500/80" />
            </div>
            <div className="absolute inset-y-0" style={{ left: `${rightPx}px` }}>
              <div className="absolute inset-y-0 left-0 w-px bg-brand-500" />
              <button
                type="button"
                className="pointer-events-auto absolute top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 cursor-grab items-center justify-center rounded-full border border-white/70 bg-brand-500 text-white shadow-lg outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
                onPointerDown={startDrag("right")}
                onKeyDown={onHandleKeyDown("right")}
                aria-label="Move right caliper"
                style={{ touchAction: "none" }}
              >
                <span className="sr-only">Move right caliper</span>
                <span aria-hidden className="h-6 w-0.5 bg-white" />
              </button>
              <div className="absolute left-1/2 top-0 h-3 w-8 -translate-x-1/2 rounded-b bg-brand-500/80" />
              <div className="absolute bottom-0 left-1/2 h-3 w-8 -translate-x-1/2 rounded-t bg-brand-500/80" />
            </div>
            {spanPx > 0 ? (
              <div className="absolute inset-y-0" style={{ left: `${spanLeftPx}px`, width: `${spanPx}px` }}>
                <div className="absolute left-0 right-0 top-0 h-px bg-brand-500" />
                <div className="absolute left-0 right-0 bottom-0 h-px bg-brand-500" />
                <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 border-t border-dashed border-brand-400" />
                {spanPx > 24 ? (
                  <button
                    type="button"
                    className="pointer-events-auto absolute left-1/2 top-1/2 flex h-8 w-16 -translate-x-1/2 -translate-y-1/2 cursor-grab items-center justify-center rounded border border-brand-500/60 bg-brand-500/10 text-xs font-semibold uppercase tracking-wide text-brand-700 outline-none backdrop-blur focus-visible:ring-2 focus-visible:ring-brand-300"
                    onPointerDown={startDrag("span")}
                    onKeyDown={onHandleKeyDown("span")}
                    aria-label="Move both calipers"
                    style={{ touchAction: "none" }}
                  >
                    Move
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-neutral-900">
              {measurement ? `Interval: ${formatNumber(measurement.seconds, 2)} s (${Math.round(measurement.milliseconds)} ms)` : "Calipers ready"}
            </p>
            <p className="mt-1 text-xs text-neutral-600">
              Drag the handles to bracket waveform landmarks. Adjust the small box size so one small grid box equals 0.04 seconds.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-xs font-medium text-neutral-700" htmlFor={smallBoxInputId}>
              <span>Small box size</span>
              <input
                id={smallBoxInputId}
                type="number"
                min={4}
                max={60}
                step={0.5}
                value={smallBoxSize}
                onChange={handleSmallBoxChange}
                className="h-9 w-24 rounded border border-neutral-300 bg-white px-2 py-1 text-sm text-neutral-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
              <span className="text-[11px] font-normal text-neutral-500">px</span>
            </label>
            <Button variant="ghost" type="button" onClick={() => setIsVisible((prev) => !prev)}>
              {isVisible ? "Hide calipers" : "Show calipers"}
            </Button>
            <Button variant="secondary" type="button" onClick={resetCalipers} disabled={!measurement}>
              Reset
            </Button>
          </div>
        </div>
        {measurement ? (
          <dl className="mt-3 grid grid-cols-1 gap-2 text-xs text-neutral-700 sm:grid-cols-3">
            <div>
              <dt className="font-semibold">Small boxes</dt>
              <dd>{formatNumber(measurement.smallBoxes, 1)}</dd>
            </div>
            <div>
              <dt className="font-semibold">Big boxes</dt>
              <dd>{formatNumber(measurement.bigBoxes, 2)}</dd>
            </div>
            <div>
              <dt className="font-semibold">Pixels</dt>
              <dd>{Math.round(measurement.pixels)}</dd>
            </div>
            <div>
              <dt className="font-semibold">Interval</dt>
              <dd>
                {formatNumber(measurement.seconds, 2)} s • {Math.round(measurement.milliseconds)} ms
              </dd>
            </div>
            <div>
              <dt className="font-semibold">Heart rate</dt>
              <dd>{measurement.heartRate ? `${Math.round(measurement.heartRate)} bpm` : "–"}</dd>
            </div>
          </dl>
        ) : null}
      </div>
    </div>
  );
}

