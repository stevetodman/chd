import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { I18nProvider } from "./i18n";
import { EXPECTED_STORAGE_BUCKETS } from "./config/storageBuckets";
import { supabase } from "./lib/supabaseClient";
import "./styles/globals.css";

async function verifyStorageBuckets() {
  if (import.meta.env.PROD || import.meta.env.MODE === "test") {
    return;
  }

  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();

    if (error) {
      console.warn("[storage] Failed to list buckets for verification", error);
      return;
    }

    const bucketMap = new Map((buckets ?? []).map((bucket) => [bucket.name, bucket]));
    const issues: string[] = [];

    for (const expected of EXPECTED_STORAGE_BUCKETS) {
      const bucket = bucketMap.get(expected.name);

      if (!bucket) {
        issues.push(`Missing bucket "${expected.name}"`);
        continue;
      }

      if (bucket.public !== expected.public) {
        issues.push(
          `Bucket "${expected.name}" should be ${expected.public ? "public" : "private"} but is ${
            bucket.public ? "public" : "private"
          }`
        );
      }
    }

    if (issues.length > 0) {
      console.warn(["Storage configuration drift detected:", ...issues.map((issue) => `- ${issue}`)].join("\n"));
    }
  } catch (error) {
    console.warn("[storage] Unexpected error verifying bucket configuration", error);
  }
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || !import.meta.env.PROD) {
    return;
  }

  try {
    const registrationUrl = new URL("./service-worker.ts", import.meta.url);
    await navigator.serviceWorker.register(registrationUrl, { type: "module" });
  } catch (error) {
    console.error("Service worker registration failed", error);
  }
}

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element not found");
}

const locale = typeof navigator !== "undefined" && navigator.language ? navigator.language : "en-US";

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <BrowserRouter>
      <I18nProvider locale={locale}>
        <App />
      </I18nProvider>
    </BrowserRouter>
  </React.StrictMode>
);

void registerServiceWorker();
void verifyStorageBuckets();
