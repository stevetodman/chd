import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearSupabaseAssetUrlCache, resolveSupabaseAssetUrl } from "../lib/storage";

const createSignedUrlMock = vi.fn();
const storageFromMock = vi.fn();

vi.mock("../lib/supabaseClient", () => ({
  supabase: {
    storage: {
      from: (...args: unknown[]) => storageFromMock(...args)
    }
  }
}));

describe("resolveSupabaseAssetUrl", () => {
  beforeEach(() => {
    clearSupabaseAssetUrlCache();
    createSignedUrlMock.mockReset();
    storageFromMock.mockReset();
    storageFromMock.mockReturnValue({ createSignedUrl: createSignedUrlMock });
  });

  it("returns absolute URLs without signing", async () => {
    const url = "https://example.com/audio.mp3";
    const result = await resolveSupabaseAssetUrl(url);
    expect(result).toBe(url);
    expect(storageFromMock).not.toHaveBeenCalled();
  });

  it("creates a signed URL when a bucket is present in the path", async () => {
    const cache = new Map<string, string>();
    createSignedUrlMock.mockResolvedValue({ data: { signedUrl: "https://signed.example.com/audio.mp3" }, error: null });

    const result = await resolveSupabaseAssetUrl("murmurs/audio.mp3", { cache });

    expect(storageFromMock).toHaveBeenCalledWith("murmurs");
    expect(createSignedUrlMock).toHaveBeenCalledWith("audio.mp3", 3600);
    expect(result).toBe("https://signed.example.com/audio.mp3");
  });

  it("falls back to the default bucket when only a filename is provided", async () => {
    const cache = new Map<string, string>();
    createSignedUrlMock.mockResolvedValue({ data: { signedUrl: "https://signed.example.com/audio.mp3" }, error: null });

    const result = await resolveSupabaseAssetUrl("audio.mp3", { defaultBucket: "murmurs", cache });

    expect(storageFromMock).toHaveBeenCalledWith("murmurs");
    expect(createSignedUrlMock).toHaveBeenCalledWith("audio.mp3", 3600);
    expect(result).toBe("https://signed.example.com/audio.mp3");
  });

  it("memoizes signed URLs when using a shared cache", async () => {
    const cache = new Map<string, string>();
    createSignedUrlMock.mockResolvedValue({ data: { signedUrl: "https://signed.example.com/audio.mp3" }, error: null });

    const first = await resolveSupabaseAssetUrl("murmurs/audio.mp3", { cache });
    const second = await resolveSupabaseAssetUrl("murmurs/audio.mp3", { cache });

    expect(first).toBe("https://signed.example.com/audio.mp3");
    expect(second).toBe("https://signed.example.com/audio.mp3");
    expect(createSignedUrlMock).toHaveBeenCalledTimes(1);
  });

  it("returns the original value when signing fails", async () => {
    const cache = new Map<string, string>();
    createSignedUrlMock.mockResolvedValue({ data: null, error: { message: "nope" } });

    const result = await resolveSupabaseAssetUrl("murmurs/audio.mp3", { cache });

    expect(result).toBe("murmurs/audio.mp3");
  });
});
