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

  it("accepts drops within the ±5% tolerance band", () => {
    const tolerance = hitTolerance(naturalSize);
    const naturalPointInside = {
      x: naturalSize.width * (bbox.x + bbox.w) + tolerance * 0.75,
      y: naturalSize.height * (bbox.y + bbox.h / 2)
    };
    expect(hitTestBoundingBox(naturalPointInside, bbox, naturalSize, tolerance)).toBe(true);
  });

  it("rejects drops outside the tolerance band", () => {
    const displayPoint = {
      x: displaySize.width * (bbox.x + bbox.w) + displaySize.width * 0.12,
      y: displaySize.height * (bbox.y + bbox.h / 2)
    };
    const naturalPoint = displayPointToNaturalPoint(displayPoint, naturalSize, displaySize);
    expect(hitTestBoundingBox(naturalPoint, bbox, naturalSize)).toBe(false);
  });
});
