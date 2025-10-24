import { useCallback, useEffect, useMemo, useState } from "react";

export function formatElapsedTime(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const minutePart = hours > 0 ? minutes.toString().padStart(2, "0") : minutes.toString();
  const secondPart = seconds.toString().padStart(2, "0");
  return hours > 0 ? `${hours}:${minutePart}:${secondPart}` : `${minutePart}:${secondPart}`;
}

export function useElapsedTimer(resetKey?: unknown) {
  const [startTime, setStartTime] = useState(() => Date.now());
  const [elapsedMs, setElapsedMs] = useState(0);

  const reset = useCallback(() => {
    setStartTime(Date.now());
    setElapsedMs(0);
  }, []);

  useEffect(() => {
    reset();
  }, [reset, resetKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setElapsedMs(Date.now() - startTime);
    const interval = window.setInterval(() => {
      setElapsedMs(Date.now() - startTime);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [startTime]);

  const elapsedLabel = useMemo(() => formatElapsedTime(elapsedMs), [elapsedMs]);

  return { elapsedMs, elapsedLabel, reset };
}
