import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY");
}

// Supabase client used across the SPA; all DB interactions run through RLS.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

export const STORAGE_BUCKET_NAMES = ["murmurs", "cxr", "ekg", "diagrams"] as const;
export type StorageBucketName = (typeof STORAGE_BUCKET_NAMES)[number];
type StorageBucketClient = ReturnType<typeof supabase.storage.from>;

export const storageBuckets = STORAGE_BUCKET_NAMES.reduce<Record<StorageBucketName, StorageBucketClient>>(
  (acc, bucket) => {
    acc[bucket] = supabase.storage.from(bucket);
    return acc;
  },
  {} as Record<StorageBucketName, StorageBucketClient>
);

type StorageErrorLike = {
  statusCode?: number;
  message: string;
};

const checkStorageBuckets = async (): Promise<boolean> => {
  let sawAuthError = false;

  await Promise.all(
    STORAGE_BUCKET_NAMES.map(async (bucketName) => {
      try {
        const { error } = await storageBuckets[bucketName].list({ limit: 1 });
        if (!error) {
          return;
        }

        const statusCode = typeof (error as StorageErrorLike).statusCode === "number"
          ? (error as StorageErrorLike).statusCode
          : undefined;

        if (statusCode === 401) {
          sawAuthError = true;
          return;
        }

        if (statusCode === 404) {
          console.warn(`Supabase Storage bucket "${bucketName}" is missing or inaccessible.`);
          return;
        }

        if (statusCode && statusCode >= 400) {
          console.warn(
            `Supabase Storage bucket "${bucketName}" check failed (status ${statusCode}): ${error.message}`
          );
          return;
        }

        console.warn(`Supabase Storage bucket "${bucketName}" check failed: ${error.message}`);
      } catch (err) {
        console.warn(`Supabase Storage bucket "${bucketName}" check threw an error:`, err);
      }
    })
  );

  return sawAuthError;
};

const verifyStorageBuckets = async (): Promise<void> => {
  if (typeof window === "undefined") {
    return;
  }

  const { data } = await supabase.auth.getSession();
  if (data.session) {
    await checkStorageBuckets();
    return;
  }

  const requiresAuth = await checkStorageBuckets();
  if (!requiresAuth) {
    return;
  }

  const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
    if (session) {
      void checkStorageBuckets().finally(() => {
        authListener?.subscription.unsubscribe();
      });
    }
  });
};

void verifyStorageBuckets();
