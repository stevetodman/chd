let telemetryInitialized = false;
let lastNavigationSent = false;

const endpoint = import.meta.env.VITE_TELEMETRY_ENDPOINT;

type ErrorPayload = {
  type: "error";
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
  timestamp: string;
};

type MetricPayload = {
  type: "metric";
  name: string;
  value: number;
  context?: Record<string, unknown>;
  timestamp: string;
};

function safeSerialize(payload: ErrorPayload | MetricPayload) {
  try {
    return JSON.stringify(payload);
  } catch (error) {
    console.warn("Unable to serialize telemetry payload", error);
    return null;
  }
}

function deliver(payload: ErrorPayload | MetricPayload) {
  if (!endpoint) return;
  const body = safeSerialize(payload);
  if (!body) return;

  try {
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon(endpoint, blob);
      return;
    }

    void fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true
    });
  } catch (error) {
    console.warn("Failed to deliver telemetry payload", error);
  }
}

function toError(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) {
    return { message: error.message, stack: error.stack ?? undefined };
  }

  if (typeof error === "string") {
    return { message: error };
  }

  try {
    return { message: JSON.stringify(error) };
  } catch {
    return { message: String(error) };
  }
}

export function logError(error: unknown, context?: Record<string, unknown>) {
  const normalized = toError(error);
  console.error("[telemetry:error]", normalized.message, context ?? {});
  deliver({
    type: "error",
    message: normalized.message,
    stack: normalized.stack,
    context,
    timestamp: new Date().toISOString()
  });
}

export function logMetric(name: string, value: number, context?: Record<string, unknown>) {
  deliver({
    type: "metric",
    name,
    value,
    context,
    timestamp: new Date().toISOString()
  });
}

function observeNavigationTiming() {
  if (lastNavigationSent) return;
  if (typeof performance === "undefined" || typeof performance.getEntriesByType !== "function") {
    return;
  }
  const entries = performance.getEntriesByType("navigation");
  if (!entries || entries.length === 0) return;
  const navigation = entries[0] as PerformanceNavigationTiming;
  logMetric("navigation", navigation.duration, { type: navigation.type });
  lastNavigationSent = true;
}

function observePerformanceEntries() {
  if (typeof window === "undefined") return;
  if (!("PerformanceObserver" in window)) {
    observeNavigationTiming();
    return;
  }

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === "largest-contentful-paint") {
          const value = (entry as LargestContentfulPaint).renderTime || entry.startTime;
          logMetric("lcp", value);
        }
        if (entry.entryType === "first-input") {
          const fidEntry = entry as PerformanceEventTiming;
          const delay = fidEntry.processingStart - fidEntry.startTime;
          logMetric("fid", delay);
        }
      }
    });
    observer.observe({ type: "largest-contentful-paint", buffered: true });
    observer.observe({ type: "first-input", buffered: true });
  } catch (error) {
    logError(error, { scope: "telemetry.performanceObserver" });
  }

  observeNavigationTiming();
}

export function initTelemetry() {
  if (telemetryInitialized) return;
  if (typeof window === "undefined") return;

  telemetryInitialized = true;

  window.addEventListener("error", (event) => {
    logError(event.error ?? event.message ?? "Unknown error", { scope: "window.error" });
  });

  window.addEventListener("unhandledrejection", (event) => {
    logError(event.reason ?? "Unhandled rejection", { scope: "window.unhandledrejection" });
  });

  if (document.readyState === "complete") {
    observePerformanceEntries();
  } else {
    window.addEventListener("load", () => {
      observePerformanceEntries();
    });
  }
}
