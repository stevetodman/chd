import { supabase } from "./supabaseClient";

const ABSOLUTE_URL_PATTERN = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//;

type StorageLocation = {
  bucket: string;
  path: string;
};

type ResolveSupabaseAssetUrlOptions = {
  /**
   * When the provided path does not include an explicit bucket, fall back to this bucket.
   */
  defaultBucket?: string;
  /**
   * Cache instance for memoizing signed URLs. Defaults to a module-level cache.
   */
  cache?: Map<string, string>;
  /**
   * Expiration for signed URLs in seconds. Defaults to one hour.
   */
  expiresIn?: number;
};

const signedUrlCache = new Map<string, string>();

export function clearSupabaseAssetUrlCache() {
  signedUrlCache.clear();
}

function normalizePotentialStoragePath(raw: string): string {
  return raw.replace(/^(?:supabase|storage):\/\//i, "").replace(/^\/+/, "");
}

function parseStorageLocation(value: string, defaultBucket: string | undefined): StorageLocation | null {
  const trimmed = value.trim();
  if (!trimmed || ABSOLUTE_URL_PATTERN.test(trimmed) || trimmed.startsWith("data:")) {
    return null;
  }

  const normalized = normalizePotentialStoragePath(trimmed);

  if (!normalized || normalized.includes("://")) {
    return null;
  }

  const [bucketOrFile, ...rest] = normalized.split("/");

  if (rest.length === 0) {
    if (!defaultBucket) {
      return null;
    }

    return { bucket: defaultBucket, path: bucketOrFile };
  }

  const bucket = bucketOrFile;
  const path = rest.join("/");

  if (!bucket || !path) {
    return null;
  }

  return { bucket, path };
}

export async function resolveSupabaseAssetUrl(
  rawUrl: string,
  options: ResolveSupabaseAssetUrlOptions = {}
): Promise<string> {
  const trimmed = rawUrl.trim();

  if (!trimmed || ABSOLUTE_URL_PATTERN.test(trimmed) || trimmed.startsWith("data:") || trimmed.startsWith("blob:")) {
    return trimmed;
  }

  const { defaultBucket, cache = signedUrlCache, expiresIn = 3600 } = options;
  const location = parseStorageLocation(trimmed, defaultBucket);

  if (!location) {
    return trimmed;
  }

  const cacheKey = `${location.bucket}/${location.path}`;
  const cachedUrl = cache.get(cacheKey);
  if (cachedUrl) {
    return cachedUrl;
  }

  const { data, error } = await supabase.storage.from(location.bucket).createSignedUrl(location.path, expiresIn);

  if (error || !data?.signedUrl) {
    return trimmed;
  }

  cache.set(cacheKey, data.signedUrl);
  return data.signedUrl;
}

export type { ResolveSupabaseAssetUrlOptions };
