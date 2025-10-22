import { describe, expect, it } from "vitest";
import {
  displayPointToNaturalPoint,
  hitTestBoundingBox,
  hitTestDisplayPoint,
  hitTolerance
} from "../../src/games/cxr/geom";

describe("CXR bounding box hit testing", () => {
  const naturalSize = { width: 1000, height: 800 };
  const displaySize = { width: 500, height: 400 };
  const bbox = { x: 0.4, y: 0.3, w: 0.2, h: 0.25 };

  it("accepts drops whose center falls inside the bounding box", () => {
    const displayPoint = { x: displaySize.width * 0.5, y: displaySize.height * 0.5 };
    expect(hitTestDisplayPoint(displayPoint, bbox, naturalSize, displaySize)).toBe(true);
  });

  it("rejects drops just beyond the horizontal tolerance band", () => {
    const tolerance = hitTolerance(naturalSize);
    const naturalPointOutside = {
      x: naturalSize.width * (bbox.x + bbox.w) + tolerance + 0.5,
      y: naturalSize.height * (bbox.y + bbox.h / 2)
    };
    expect(hitTestBoundingBox(naturalPointOutside, bbox, naturalSize, tolerance)).toBe(false);
  });

  it("handles extreme aspect ratios without accepting out-of-band drops", () => {
    const tallNatural = { width: 2800, height: 400 };
    const tallDisplay = { width: 560, height: 200 };
    const tallBox = { x: 0.05, y: 0.25, w: 0.1, h: 0.4 };
    const tolerance = hitTolerance(tallNatural);
    const offTarget = {
      x: tallDisplay.width * (tallBox.x + tallBox.w / 2),
      y: tallDisplay.height * (tallBox.y + tallBox.h) + tolerance * 0.8
    };
    const naturalOffTarget = displayPointToNaturalPoint(offTarget, tallNatural, tallDisplay);
    expect(hitTestBoundingBox(naturalOffTarget, tallBox, tallNatural, tolerance)).toBe(false);
  });

  it("keeps fractional display pixels inside the tolerance band", () => {
    const tolerance = hitTolerance(naturalSize);
    const naturalPoint = {
      x: naturalSize.width * (bbox.x + bbox.w / 2),
      y: naturalSize.height * (bbox.y + bbox.h / 2)
    };
    const fractionalDisplay = {
      x: (naturalPoint.x / naturalSize.width) * displaySize.width,
      y: (naturalPoint.y / naturalSize.height) * displaySize.height
    };
    const roundedDisplay = {
      x: Math.round(fractionalDisplay.x + 0.25),
      y: Math.floor(fractionalDisplay.y + 0.1)
    };
    expect(hitTestDisplayPoint(roundedDisplay, bbox, naturalSize, displaySize, tolerance)).toBe(true);
  });

  it("correctly maps points recorded in device pixels when DPR > 1", () => {
    const natural = { width: 2048, height: 1536 };
    const display = { width: 512, height: 384 };
    const lesion = { x: 0.62, y: 0.35, w: 0.08, h: 0.12 };
    const dpr = 2.5;
    const naturalPoint = {
      x: natural.width * (lesion.x + lesion.w / 2),
      y: natural.height * (lesion.y + lesion.h / 2)
    };
    const cssDisplayPoint = {
      x: (naturalPoint.x / natural.width) * display.width,
      y: (naturalPoint.y / natural.height) * display.height
    };
    const devicePixelPoint = {
      x: Math.round(cssDisplayPoint.x * dpr),
      y: Math.round(cssDisplayPoint.y * dpr)
    };
    const tolerance = hitTolerance(natural);
    expect(hitTestDisplayPoint(devicePixelPoint, lesion, natural, display, tolerance, dpr)).toBe(true);
  });
});
