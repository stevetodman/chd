import { useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent, SyntheticEvent } from "react";
import type { PostgrestError } from "@supabase/supabase-js";
import ReactMarkdown from "react-markdown";
import { useLocation } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { supabase } from "../../lib/supabaseClient";
import { useSessionStore } from "../../lib/auth";
import { markdownRemarkPlugins, markdownRehypePlugins } from "../../lib/markdown";
import type { BoundingBox, Point, Size } from "../../games/cxr/geom";
import { BoundingBoxOverlay } from "../../games/cxr/BoundingBoxOverlay";
import {
  displayPointToNaturalPoint,
  hasPositiveArea,
  hitTestBoundingBox,
  hitTolerance
} from "../../games/cxr/geom";

const DEFAULT_CXR_ALT_TEXT = "Chest radiograph for the congenital heart disease lesion matching game.";

const isPermissionDeniedError = (error: PostgrestError | null): boolean => {
  if (!error) return false;
  if (error.code === "PGRST301") {
    return true;
  }
  return /permission denied/i.test(error.message ?? "");
};

const describeFetchError = (error: PostgrestError | null): string => {
  if (!error) {
    return "We couldn't load radiographs right now. Please try again.";
  }
  if (isPermissionDeniedError(error)) {
    return "We couldn't load radiographs for your account yet. Please reach out to your administrator for access.";
  }
  return "We couldn't load radiographs right now. Please try again.";
};

interface Label {
  id: string;
  label: string;
  is_correct: boolean;
  bbox: BoundingBox | null;
}

interface CxrItem {
  id: string;
  image_url: string;
  caption_md?: string | null;
  lesion?: string | null;
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
  lesion: string | null;
  cxr_labels: CxrLabelRow[] | null;
};

export default function CxrMatch() {
  const { session } = useSessionStore();
  const location = useLocation();
  const [items, setItems] = useState<CxrItem[]>([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDropActive, setIsDropActive] = useState(false);
  const imageContainerRef = useRef<HTMLDivElement | null>(null);
  const [naturalSize, setNaturalSize] = useState<Size | null>(null);
  const [displaySize, setDisplaySize] = useState<Size | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from("cxr_items")
          .select("id, image_url, caption_md, lesion, cxr_labels(id,label,is_correct,x,y,w,h)")
          .eq("status", "published")
          .limit(20);

        if (fetchError) {
          setError(describeFetchError(fetchError));
          setItems([]);
          return;
        }
        const normalized: CxrItem[] = ((data ?? []) as CxrItemRow[]).map((item) => ({
          id: item.id,
          image_url: item.image_url,
          caption_md: item.caption_md,
          lesion: item.lesion,
          labels: shuffle((item.cxr_labels ?? []).map((label) => ({
            id: label.id,
            label: label.label,
            is_correct: Boolean(label.is_correct),
            bbox: mapBoundingBox(label)
          })))
        }));
        setItems(shuffle(normalized));
        setIndex(0);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const current = items[index];
  const correctLabel = useMemo(() => current?.labels.find((label) => label.is_correct) ?? null, [current]);

  const cxrAltText = useMemo(() => {
    if (!current) {
      return DEFAULT_CXR_ALT_TEXT;
    }
    if (correctLabel) {
      return `Chest x-ray showing ${correctLabel.label}`;
    }
    if (current.lesion) {
      return `Chest x-ray associated with ${current.lesion}`;
    }
    if (current.caption_md) {
      const plainCaption = current.caption_md
        .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
        .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
        .replace(/\\/g, "")
        .replace(/\*/g, "")
        .replace(/_/g, "")
        .replace(/`/g, "")
        .replace(/>/g, "")
        .replace(/#/g, "")
        .replace(/~/g, "")
        .replace(/\|/g, "")
        .replace(/-/g, "")
        .replace(/\s+/g, " ")
        .trim();
      if (plainCaption) {
        return `Chest radiograph: ${plainCaption}`;
      }
    }
    return DEFAULT_CXR_ALT_TEXT;
  }, [correctLabel, current]);

  const submit = async (label: Label) => {
    if (selected) return;
    const correct = label.is_correct;
    setSelected(label.id);
    setError(null);
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
        setSelected(null);
        setMessage(null);
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
  }, [current?.id]);

  const handleDragStart = (event: DragEvent<HTMLButtonElement>, label: Label) => {
    if (selected) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("application/json", JSON.stringify({ id: label.id }));
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDropActive(false);
    if (selected || !current) return;
    const container = imageContainerRef.current;
    try {
      const payload = event.dataTransfer.getData("application/json");
      if (!payload) return;
      const { id } = JSON.parse(payload) as { id: string };
      const match = current.labels.find((label) => label.id === id);
      if (!match) {
        return;
      }
      if (!container || !hasPositiveArea(naturalSize) || !match.bbox) {
        void submit(match);
        return;
      }
      const rect = container.getBoundingClientRect();
      const displayPoint: Point = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      };
      const currentDisplaySize: Size = {
        width: rect.width,
        height: rect.height
      };
      setDisplaySize(currentDisplaySize);
      const naturalPoint = displayPointToNaturalPoint(displayPoint, naturalSize, currentDisplaySize);
      const tolerance = hitTolerance(naturalSize);
      if (hitTestBoundingBox(naturalPoint, match.bbox, naturalSize, tolerance)) {
        void submit(match);
      } else {
        setMessage("Drop inside the target lesion to submit your answer.");
      }
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
    const related = event.relatedTarget as Node | null;
    if (related && event.currentTarget.contains(related)) {
      return;
    }
    setIsDropActive(false);
  };

  const handleDragEnd = () => {
    setIsDropActive(false);
  };

  useEffect(() => {
    if (!imageContainerRef.current || typeof ResizeObserver === "undefined") {
      return;
    }
    const element = imageContainerRef.current;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const { width, height } = entry.contentRect;
        setDisplaySize({ width, height });
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setNaturalSize(null);
  }, [current?.image_url]);

  const showBoundingBoxes = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const debugValues = params.getAll("debug").flatMap((value) => value.split(","));
    return debugValues.some((value) => value.trim().toLowerCase() === "bbox");
  }, [location.search]);

  const handleImageLoad = (event: SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;
    if (img.naturalWidth > 0 && img.naturalHeight > 0) {
      setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
    }
    if (imageContainerRef.current) {
      const rect = imageContainerRef.current.getBoundingClientRect();
      setDisplaySize({ width: rect.width, height: rect.height });
    }
  };

  const overlayLabels = useMemo(
    () =>
      current
        ? current.labels.map((label) => ({
            id: label.id,
            label: label.label,
            bbox: label.bbox
          }))
        : [],
    [current]
  );

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
        <div className="flex flex-col gap-4 lg:flex-row">
          <div
            ref={imageContainerRef}
            className={`relative w-full max-w-xl overflow-hidden rounded border ${
              isDropActive ? "border-brand-500 ring-4 ring-brand-200" : "border-neutral-200"
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            role="button"
            tabIndex={0}
            aria-label="Drop a lesion label on the matching region"
          >
            <img src={current.image_url} alt={cxrAltText} className="block h-auto w-full" onLoad={handleImageLoad} />
            {!selectedLabel ? (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4">
                <span className="rounded bg-neutral-900/80 px-3 py-1 text-sm font-medium text-white">
                  Drag a label onto the lesion.
                </span>
              </div>
            ) : null}
            <BoundingBoxOverlay
              labels={overlayLabels}
              naturalSize={naturalSize}
              displaySize={displaySize}
              visible={showBoundingBoxes}
            />
          </div>
          <div className="flex-1 space-y-2 text-sm text-neutral-700">
            <ReactMarkdown
              remarkPlugins={markdownRemarkPlugins}
              rehypePlugins={markdownRehypePlugins}
              className="prose prose-sm max-w-none"
            >
              {current.caption_md ?? "Match the imaging sign with the lesion."}
            </ReactMarkdown>
            <p className="text-xs text-neutral-500">
              Drop the label onto the lesion (or click a label) to submit. Labels remain keyboard accessible—use space
              or enter to select.
            </p>
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

const mapBoundingBox = (label: CxrLabelRow): BoundingBox | null => {
  if (
    typeof label.x === "number" &&
    typeof label.y === "number" &&
    typeof label.w === "number" &&
    typeof label.h === "number"
  ) {
    return {
      x: label.x,
      y: label.y,
      w: label.w,
      h: label.h
    };
  }
  return null;
};
