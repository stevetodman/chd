export interface NormalizedBBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/**
 * Ensures the provided bounding box values are finite and clamped to [0, 1].
 * Returns null when any coordinate is missing or non-finite.
 */
export function sanitizeNormalizedBBox(input: Partial<NormalizedBBox> | null | undefined): NormalizedBBox | null {
  if (!input) return null;
  const { x, y, w, h } = input;
  if ([x, y, w, h].some((value) => typeof value !== "number" || !Number.isFinite(value))) {
    return null;
  }

  const width = clamp(w!, 0, 1);
  const height = clamp(h!, 0, 1);
  if (width <= 0 || height <= 0) {
    return null;
  }

  return {
    x: clamp(x!, 0, 1),
    y: clamp(y!, 0, 1),
    w: width,
    h: height
  };
}

export function hasValidSize(size: Size | null | undefined): size is Size {
  return Boolean(size && size.width > 0 && size.height > 0);
}

export function normalizedBoxToDisplayRect(bbox: NormalizedBBox, natural: Size, display: Size): Rect {
  const naturalWidth = natural.width || 1;
  const naturalHeight = natural.height || 1;
  const scaleX = display.width / naturalWidth;
  const scaleY = display.height / naturalHeight;

  const x = bbox.x * naturalWidth * scaleX;
  const y = bbox.y * naturalHeight * scaleY;
  const width = bbox.w * naturalWidth * scaleX;
  const height = bbox.h * naturalHeight * scaleY;

  return { x, y, width, height };
}

export function expandRect(rect: Rect, padding: number, bounds?: Size): Rect {
  const left = rect.x - padding;
  const top = rect.y - padding;
  const right = rect.x + rect.width + padding;
  const bottom = rect.y + rect.height + padding;

  const clampedLeft = bounds ? Math.max(0, left) : left;
  const clampedTop = bounds ? Math.max(0, top) : top;
  const clampedRight = bounds ? Math.min(bounds.width, right) : right;
  const clampedBottom = bounds ? Math.min(bounds.height, bottom) : bottom;

  return {
    x: clampedLeft,
    y: clampedTop,
    width: Math.max(0, clampedRight - clampedLeft),
    height: Math.max(0, clampedBottom - clampedTop)
  };
}

export function isPointInRect(point: Point, rect: Rect): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

export function tolerancePadding(display: Size): number {
  return 0.05 * Math.min(display.width, display.height);
}
