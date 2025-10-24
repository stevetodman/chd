import { describe, expect, it } from 'vitest';
import {
  BoundingBox,
  Point,
  Size,
  bboxToNaturalRect,
  displayPointToNaturalPoint,
  hitTestBoundingBox,
  hitTestDisplayPoint,
  hitTolerance,
} from '../games/cxr/geom';

const makeNaturalPoint = (
  bbox: BoundingBox,
  naturalSize: Size,
  offset: Point = { x: 0, y: 0 },
): Point => {
  return {
    x: naturalSize.width * (bbox.x + bbox.w / 2) + offset.x,
    y: naturalSize.height * (bbox.y + bbox.h / 2) + offset.y,
  };
};

describe('CXR geometry helpers', () => {
  it('rejects points that fall just beyond the tolerance band', () => {
    const natural: Size = { width: 1600, height: 1200 };
    const bbox: BoundingBox = { x: 0.25, y: 0.4, w: 0.18, h: 0.22 };
    const tolerance = hitTolerance(natural);
    const rect = bboxToNaturalRect(bbox, natural);

    const justInside: Point = {
      x: rect.x + rect.width + tolerance * 0.99,
      y: rect.y + rect.height / 2,
    };
    const justOutside: Point = {
      x: rect.x + rect.width + tolerance * 1.01,
      y: rect.y + rect.height / 2,
    };

    expect(hitTestBoundingBox(justInside, bbox, natural, tolerance)).toBe(true);
    expect(hitTestBoundingBox(justOutside, bbox, natural, tolerance)).toBe(false);
  });

  it('keeps thin bounding boxes from leaking tolerance vertically', () => {
    const natural: Size = { width: 3600, height: 320 };
    const bbox: BoundingBox = { x: 0.6, y: 0.15, w: 0.08, h: 0.12 };
    const tolerance = hitTolerance(natural);
    const rect = bboxToNaturalRect(bbox, natural);

    const inside: Point = {
      x: rect.x + rect.width / 2,
      y: rect.y + rect.height + tolerance * 0.9,
    };
    const outside: Point = {
      x: rect.x + rect.width / 2,
      y: rect.y + rect.height + tolerance * 1.05,
    };

    expect(hitTestBoundingBox(inside, bbox, natural, tolerance)).toBe(true);
    expect(hitTestBoundingBox(outside, bbox, natural, tolerance)).toBe(false);
  });

  it('handles fractional display rounding and keeps hits within tolerance', () => {
    const natural: Size = { width: 1875, height: 1125 };
    const display: Size = { width: 533.3, height: 299.7 };
    const bbox: BoundingBox = { x: 0.12, y: 0.3, w: 0.18, h: 0.16 };
    const tolerance = hitTolerance(natural);

    const naturalPoint = makeNaturalPoint(bbox, natural);
    const cssDisplay: Point = {
      x: (naturalPoint.x / natural.width) * display.width,
      y: (naturalPoint.y / natural.height) * display.height,
    };
    const roundedDisplay: Point = {
      x: Math.round(cssDisplay.x + 0.4),
      y: Math.floor(cssDisplay.y + 0.6),
    };

    expect(hitTestDisplayPoint(roundedDisplay, bbox, natural, display, tolerance)).toBe(true);
  });

  it('supports device pixel ratios greater than 1', () => {
    const natural: Size = { width: 2048, height: 1536 };
    const display: Size = { width: 512, height: 384 };
    const bbox: BoundingBox = { x: 0.45, y: 0.2, w: 0.15, h: 0.18 };
    const tolerance = hitTolerance(natural);
    const devicePixelRatio = 2.75;

    const rect = bboxToNaturalRect(bbox, natural);
    const insideNatural: Point = {
      x: rect.x + rect.width / 2,
      y: rect.y + rect.height / 2,
    };
    const outsideNatural: Point = {
      x: rect.x + rect.width + tolerance * 1.05,
      y: insideNatural.y,
    };

    const toDevicePoint = (naturalPoint: Point): Point => {
      const cssDisplayPoint: Point = {
        x: (naturalPoint.x / natural.width) * display.width,
        y: (naturalPoint.y / natural.height) * display.height,
      };
      return {
        x: Math.round(cssDisplayPoint.x * devicePixelRatio),
        y: Math.round(cssDisplayPoint.y * devicePixelRatio),
      };
    };

    const deviceHit = toDevicePoint(insideNatural);
    const deviceMiss = toDevicePoint(outsideNatural);

    expect(
      hitTestDisplayPoint(deviceHit, bbox, natural, display, tolerance, devicePixelRatio),
    ).toBe(true);
    expect(
      hitTestDisplayPoint(deviceMiss, bbox, natural, display, tolerance, devicePixelRatio),
    ).toBe(false);
  });

  it('is approximately inverse to the natural-to-display mapping across random inputs', () => {
    const iterations = 300;
    for (let i = 0; i < iterations; i += 1) {
      const natural: Size = {
        width: 640 + Math.random() * 3200,
        height: 640 + Math.random() * 2200,
      };
      const display: Size = {
        width: 240 + Math.random() * 960,
        height: 200 + Math.random() * 780,
      };
      const devicePixelRatio = Math.random() < 0.5 ? 1 : 1 + Math.random() * 2.5;
      const naturalPoint: Point = {
        x: Math.random() * natural.width,
        y: Math.random() * natural.height,
      };

      const cssDisplayPoint: Point = {
        x: (naturalPoint.x / natural.width) * display.width,
        y: (naturalPoint.y / natural.height) * display.height,
      };
      const devicePixelPoint: Point = {
        x: Math.round(cssDisplayPoint.x * devicePixelRatio),
        y: Math.round(cssDisplayPoint.y * devicePixelRatio),
      };

      const converted = displayPointToNaturalPoint(
        devicePixelPoint,
        natural,
        display,
        devicePixelRatio,
      );

      const maxXError =
        (0.5 / devicePixelRatio) * (natural.width / Math.max(display.width, Number.EPSILON));
      const maxYError =
        (0.5 / devicePixelRatio) * (natural.height / Math.max(display.height, Number.EPSILON));

      expect(Math.abs(converted.x - naturalPoint.x)).toBeLessThanOrEqual(maxXError + 1e-7);
      expect(Math.abs(converted.y - naturalPoint.y)).toBeLessThanOrEqual(maxYError + 1e-7);
      expect(converted.x).toBeGreaterThanOrEqual(0);
      expect(converted.x).toBeLessThanOrEqual(natural.width);
      expect(converted.y).toBeGreaterThanOrEqual(0);
      expect(converted.y).toBeLessThanOrEqual(natural.height);
    }
  });
});
