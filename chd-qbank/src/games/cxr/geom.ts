export interface Size {
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface BoundingBox {
  /** Left edge expressed as a fraction of the natural image width. */
  x: number;
  /** Top edge expressed as a fraction of the natural image height. */
  y: number;
  /** Width expressed as a fraction of the natural image width. */
  w: number;
  /** Height expressed as a fraction of the natural image height. */
  h: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const hasPositiveArea = (size: Size | null | undefined): size is Size => {
  return Boolean(size && size.width > 0 && size.height > 0 && Number.isFinite(size.width) && Number.isFinite(size.height));
};

export const isBoundingBox = (value: BoundingBox | null | undefined): value is BoundingBox => {
  return (
    Boolean(value) &&
    Number.isFinite(value!.x) &&
    Number.isFinite(value!.y) &&
    Number.isFinite(value!.w) &&
    Number.isFinite(value!.h)
  );
};

export const bboxToNaturalRect = (bbox: BoundingBox, naturalSize: Size): Rect => ({
  x: bbox.x * naturalSize.width,
  y: bbox.y * naturalSize.height,
  width: bbox.w * naturalSize.width,
  height: bbox.h * naturalSize.height
});

export const naturalRectToDisplayRect = (rect: Rect, naturalSize: Size, displaySize: Size): Rect => ({
  x: (rect.x / naturalSize.width) * displaySize.width,
  y: (rect.y / naturalSize.height) * displaySize.height,
  width: (rect.width / naturalSize.width) * displaySize.width,
  height: (rect.height / naturalSize.height) * displaySize.height
});

export const expandRect = (rect: Rect, margin: number): Rect => ({
  x: rect.x - margin,
  y: rect.y - margin,
  width: rect.width + margin * 2,
  height: rect.height + margin * 2
});

export const isPointInRect = (rect: Rect, point: Point): boolean => {
  return point.x >= rect.x && point.x <= rect.x + rect.width && point.y >= rect.y && point.y <= rect.y + rect.height;
};

const clamp = (value: number, min: number, max: number): number => {
  if (value < min) return min;
  if (value > max) return max;
  return value;
};

const safeDivisor = (value: number): number => {
  return value === 0 ? Number.EPSILON : value;
};

export const displayPointToNaturalPoint = (
  point: Point,
  naturalSize: Size,
  displaySize: Size,
  devicePixelRatio: number = 1
): Point => {
  const ratio = devicePixelRatio > 0 ? devicePixelRatio : 1;
  const cssWidth = safeDivisor(displaySize.width) * ratio;
  const cssHeight = safeDivisor(displaySize.height) * ratio;
  const naturalX = (point.x / cssWidth) * naturalSize.width;
  const naturalY = (point.y / cssHeight) * naturalSize.height;
  return {
    x: clamp(naturalX, 0, naturalSize.width),
    y: clamp(naturalY, 0, naturalSize.height)
  };
};

export const hitTolerance = (naturalSize: Size): number => {
  return Math.min(naturalSize.width, naturalSize.height) * 0.05;
};

export const hitTestBoundingBox = (
  point: Point,
  bbox: BoundingBox,
  naturalSize: Size,
  tolerance: number = hitTolerance(naturalSize)
): boolean => {
  const naturalRect = bboxToNaturalRect(bbox, naturalSize);
  const expanded = expandRect(naturalRect, tolerance);
  return isPointInRect(expanded, point);
};

export const hitTestDisplayPoint = (
  displayPoint: Point,
  bbox: BoundingBox,
  naturalSize: Size,
  displaySize: Size,
  tolerance: number = hitTolerance(naturalSize),
  devicePixelRatio: number = 1
): boolean => {
  const naturalPoint = displayPointToNaturalPoint(displayPoint, naturalSize, displaySize, devicePixelRatio);
  return hitTestBoundingBox(naturalPoint, bbox, naturalSize, tolerance);
};
