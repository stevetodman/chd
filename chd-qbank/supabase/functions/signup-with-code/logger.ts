export type LogLevel = "info" | "error";

export interface LoggerContext {
  requestId: string;
  path: string;
  ipHash: string;
}

export interface LogPayload {
  level: LogLevel;
  outcome: string;
  latencyMs: number;
  userId?: string;
  error?: string;
}

export interface Logger {
  info(entry: Omit<LogPayload, "level">): void;
  error(entry: Omit<LogPayload, "level">): void;
  log(entry: LogPayload): void;
}

export function createLogger(context: LoggerContext): Logger {
  const emit = (entry: LogPayload) => {
    console.log(
      JSON.stringify({
        ...context,
        ...entry
      })
    );
  };

  return {
    info(entry) {
      emit({ ...entry, level: "info" });
    },
    error(entry) {
      emit({ ...entry, level: "error" });
    },
    log: emit
  };
}
