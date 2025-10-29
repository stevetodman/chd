import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { formatRelativeTimeFromNow } from "../components/LeaderboardTable";

describe("formatRelativeTimeFromNow", () => {
  const fixedNow = new Date("2024-05-10T12:00:00Z");

  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(fixedNow);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it("falls back to an em dash when the input is missing", () => {
    expect(formatRelativeTimeFromNow(null, "en")).toBe("—");
  });

  it("formats relative time using the provided locale", () => {
    const isoDate = "2024-05-09T12:00:00Z";
    expect(formatRelativeTimeFromNow(isoDate, "es")).toBe("ayer");
  });

  it("defaults to the fallback locale when the requested locale is invalid", () => {
    const isoDate = "2024-05-09T12:00:00Z";
    expect(formatRelativeTimeFromNow(isoDate, "zz-ZZ")).toBe("yesterday");
  });
});
