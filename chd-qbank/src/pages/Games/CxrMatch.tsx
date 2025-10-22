import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent } from "react";
import { useLocation } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { Button } from "../../components/ui/Button";
import { supabase } from "../../lib/supabaseClient";
import { useSessionStore } from "../../lib/auth";
import { markdownRemarkPlugins, markdownRehypePlugins } from "../../lib/markdown";
import { classNames } from "../../lib/utils";
import {
  expandRect,
  hasValidSize,
  isPointInRect,
  normalizedBoxToDisplayRect,
  sanitizeNormalizedBBox,
  tolerancePadding
} from "../../games/cxr/geom";
import type { NormalizedBBox, Size } from "../../games/cxr/geom";
import { CxrBoundingBoxOverlay } from "./CxrBoundingBoxOverlay";

interface Label {
  id: string;
  label: string;
  is_correct: boolean;
  bbox: NormalizedBBox | null;
}

interface CxrItem {
  id: string;
  image_url: string;
  caption_md?: string | null;
  labels: Label[];
}

const shuffle = <T,>(input: T[]): T[] => {
  const copy = [...input];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

type CxrLabelRow = {
  id: string;
  label: string;
  is_correct: boolean | null;
  x: number | null;
  y: number | null;
  w: number | null;
  h: number | null;
};
type CxrItemRow = {
  id: string;
  image_url: string;
  caption_md: string | null;
  cxr_labels: CxrLabelRow[] | null;
};

type ImageMetrics = {
  natural: Size;
  display: Size;
};

export default function CxrMatch() {
  const { session } = useSessionStore();
  const [items, setItems] = useState<CxrItem[]>([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDropActive, setIsDropActive] = useState(false);
  const dropZoneRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [imageMetrics, setImageMetrics] = useState<ImageMetrics | null>(null);
  const location = useLocation();
  const overlayForced = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const tokens = params
      .getAll("debug")
      .flatMap((value) =>
        value
          .split(",")
          .map((token) => token.trim().toLowerCase())
          .filter(Boolean)
      );
    return tokens.includes("bbox");
  }, [location.search]);
  const overlayEnvDefault = String(import.meta.env.VITE_SHOW_CXR_BBOX_OVERLAY ?? "")
    .toLowerCase()
    .includes("true");
  const [showOverlay, setShowOverlay] = useState(() => overlayForced || overlayEnvDefault);
  useEffect(() => {
    if (overlayForced) {
      setShowOverlay(true);
    }
  }, [overlayForced]);
  const allowOverlayToggle = import.meta.env.DEV || overlayForced || overlayEnvDefault;

  useEffect(() => {
    setLoading(true);
    setError(null);
    supabase
      .from("cxr_items")
      .select("id, image_url, caption_md, cxr_labels(id,label,is_correct,x,y,w,h)")
      .eq("status", "published")
      .limit(20)
      .then(({ data, error: fetchError }) => {
        if (fetchError) {
          setError(fetchError.message);
          setItems([]);
          return;
        }
        const normalized: CxrItem[] = ((data ?? []) as CxrItemRow[]).map((item) => ({
          id: item.id,
          image_url: item.image_url,
          caption_md: item.caption_md,
          labels: shuffle((item.cxr_labels ?? []).map((label) => ({
            id: label.id,
            label: label.label,
            is_correct: Boolean(label.is_correct),
            bbox: sanitizeNormalizedBBox({
              x: label.x ?? undefined,
              y: label.y ?? undefined,
              w: label.w ?? undefined,
              h: label.h ?? undefined
            })
          })))
        }));
        setItems(shuffle(normalized));
        setIndex(0);
      })
      .finally(() => setLoading(false));
  }, []);

  const current = items[index];
  const correctLabel = useMemo(() => current?.labels.find((label) => label.is_correct) ?? null, [current]);
  const hasHotspots = useMemo(() => current?.labels.some((label) => Boolean(label.bbox)) ?? false, [current]);
  const overlayBoxes = useMemo(
    () =>
      current
        ? current.labels
            .map((label) =>
              label.bbox
                ? {
                    id: label.id,
                    label: label.label,
                    bbox: label.bbox,
                    isCorrect: label.is_correct
                  }
                : null
            )
            .filter((box): box is { id: string; label: string; bbox: NormalizedBBox; isCorrect: boolean } => Boolean(box))
        : [],
    [current]
  );

  const updateDisplayMetrics = useCallback(() => {
    if (!dropZoneRef.current) {
      return;
    }
    const rect = dropZoneRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      return;
    }
    setImageMetrics((prev) => {
      const naturalWidth = imageRef.current?.naturalWidth ?? prev?.natural.width ?? rect.width;
      const naturalHeight = imageRef.current?.naturalHeight ?? prev?.natural.height ?? rect.height;
      const next: ImageMetrics = {
        natural: {
          width: naturalWidth || rect.width,
          height: naturalHeight || rect.height
        },
        display: {
          width: rect.width,
          height: rect.height
        }
      };
      return next;
    });
  }, []);

  const submit = async (label: Label) => {
    if (selected) return;
    const correct = label.is_correct;
    setSelected(label.id);
    if (correct) {
      setMessage("Correct!");
    } else if (correctLabel) {
      setMessage(`Not quite. The correct answer is ${correctLabel.label}.`);
    } else {
      setMessage("Not quite. Try another lesion.");
    }
    if (session) {
      const { data: attempt, error: attemptError } = await supabase
        .from("cxr_attempts")
        .insert({
          user_id: session.user.id,
          item_id: current.id,
          is_correct: correct,
          detail: { selected: label.label }
        })
        .select("id")
        .single();

      if (attemptError) {
        setError("We couldn't record your attempt. Please try again.");
        return;
      }

      if (correct && attempt) {
        const { error: rpcError } = await supabase.rpc("increment_points", {
          source: "cxr_attempt",
          source_id: attempt.id
        });

        if (rpcError) {
          setError("Your answer was saved, but we couldn't update your points. Please try again later.");
        }
      }
    }
  };

  const next = () => {
    setIndex((prev) => (prev + 1) % items.length);
    setSelected(null);
    setMessage(null);
    setIsDropActive(false);
  };

  const selectedLabel = useMemo(
    () => (selected && current ? current.labels.find((label) => label.id === selected) ?? null : null),
    [current, selected]
  );

  useEffect(() => {
    setIsDropActive(false);
    setImageMetrics(null);
  }, [current?.id]);

  useEffect(() => {
    updateDisplayMetrics();
  }, [current?.id, updateDisplayMetrics]);

  useEffect(() => {
    if (!dropZoneRef.current || typeof ResizeObserver === "undefined") {
      return;
    }
    const observer = new ResizeObserver(() => {
      updateDisplayMetrics();
    });
    observer.observe(dropZoneRef.current);
    return () => {
      observer.disconnect();
    };
  }, [current?.id, updateDisplayMetrics]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const handleResize = () => updateDisplayMetrics();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [updateDisplayMetrics]);

  const handleDragStart = (event: DragEvent<HTMLButtonElement>, label: Label) => {
    if (selected) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("application/json", JSON.stringify({ id: label.id }));
  };

  const handleImageLoad = () => {
    if (!imageRef.current) {
      return;
    }
    const rect = dropZoneRef.current?.getBoundingClientRect() ?? imageRef.current.getBoundingClientRect();
    const fallbackWidth = rect.width || imageRef.current.width || 1;
    const fallbackHeight = rect.height || imageRef.current.height || 1;
    setImageMetrics({
      natural: {
        width: imageRef.current.naturalWidth || fallbackWidth,
        height: imageRef.current.naturalHeight || fallbackHeight
      },
      display: {
        width: fallbackWidth,
        height: fallbackHeight
      }
    });
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => updateDisplayMetrics());
    } else {
      updateDisplayMetrics();
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDropActive(false);
    if (selected || !current) return;
    try {
      const payload = event.dataTransfer.getData("application/json");
      if (!payload) return;
      const { id } = JSON.parse(payload) as { id: string };
      const match = current.labels.find((label) => label.id === id);
      if (!match) return;

      if (match.bbox && dropZoneRef.current) {
        const rect = dropZoneRef.current.getBoundingClientRect();
        const displaySize: Size = { width: rect.width, height: rect.height };
        if (hasValidSize(displaySize)) {
          const dropPoint = {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
          };
          const naturalSize: Size =
            imageMetrics && hasValidSize(imageMetrics.natural)
              ? imageMetrics.natural
              : displaySize;
          const displayRect = normalizedBoxToDisplayRect(match.bbox, naturalSize, displaySize);
          const paddedRect = expandRect(displayRect, tolerancePadding(displaySize), displaySize);
          if (!isPointInRect(dropPoint, paddedRect)) {
            setMessage("Drop the label on the highlighted region to submit.");
            return;
          }
        }
      }

      void submit(match);
    } catch {
      // Ignore malformed payloads.
    }
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (selected) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };

  const handleDragEnter = (event: DragEvent<HTMLDivElement>) => {
    if (selected) return;
    event.preventDefault();
    setIsDropActive(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node)) {
      return;
    }
    setIsDropActive(false);
  };

  const handleDragEnd = () => {
    setIsDropActive(false);
  };

  if (!current) {
    if (loading) return <div>Loading radiographs…</div>;
    if (error) return <div className="text-red-600">{error}</div>;
    return <div>No CXR match items configured.</div>;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">CXR Sign Match</h1>
      {loading ? <p className="text-sm text-neutral-500">Loading radiographs…</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="flex w-full max-w-md flex-col gap-2">
            <div
              ref={dropZoneRef}
              data-testid="cxr-drop-zone"
              className={classNames(
                "relative w-full overflow-hidden rounded-lg border-2 bg-black/[0.02] transition-all",
                isDropActive
                  ? "border-brand-500 shadow-lg shadow-brand-500/20"
                  : "border-neutral-200"
              )}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              role="button"
              tabIndex={0}
              aria-label="Drop a lesion label on the radiograph"
            >
              <img
                ref={imageRef}
                src={current.image_url}
                alt="CXR"
                className="block h-auto w-full select-none"
                onLoad={handleImageLoad}
                draggable={false}
              />
              {isDropActive ? <div className="pointer-events-none absolute inset-0 bg-brand-500/10" /> : null}
              <CxrBoundingBoxOverlay boxes={overlayBoxes} visible={showOverlay && hasHotspots} />
              {selectedLabel ? (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center bg-black/40 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                  {selectedLabel.label}
                </div>
              ) : null}
            </div>
            <p className="text-xs text-neutral-500">
              Drag a label onto the radiograph—drops count when placed inside the lesion hotspot.
            </p>
            {allowOverlayToggle && hasHotspots ? (
              <Button
                type="button"
                variant="ghost"
                className="self-start px-2 py-1 text-xs"
                onClick={() => setShowOverlay((prev) => !prev)}
              >
                {showOverlay ? "Hide" : "Show"} hotspot overlay
              </Button>
            ) : null}
          </div>
          <div className="flex-1 space-y-2 text-sm text-neutral-700">
            <ReactMarkdown
              remarkPlugins={markdownRemarkPlugins}
              rehypePlugins={markdownRehypePlugins}
              className="prose prose-sm max-w-none"
            >
              {current.caption_md ?? "Match the imaging sign with the lesion."}
            </ReactMarkdown>
            <p className="text-xs text-neutral-500">Labels remain keyboard accessible—use space or enter to select.</p>
            <div className="grid gap-2">
              {current.labels.map((label) => (
                <Button
                  key={label.id}
                  variant={selected === label.id ? "primary" : "secondary"}
                  draggable={!selected}
                  onDragStart={(event) => handleDragStart(event, label)}
                  onDragEnd={handleDragEnd}
                  onClick={() => submit(label)}
                  disabled={Boolean(selected)}
                >
                  {label.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
        {message ? <p className="mt-4 text-sm font-semibold">{message}</p> : null}
        <Button type="button" className="mt-4" onClick={next} disabled={items.length === 0}>
          Next image
        </Button>
      </div>
    </div>
  );
}
