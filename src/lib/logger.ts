type LogLevel = "error" | "warn" | "info" | "debug";

const LEVELS: Record<LogLevel, number> = { error: 0, warn: 1, info: 2, debug: 3 };

function log(level: LogLevel, message: string, meta?: unknown): void {
  // DEBUG_CONSOLE must be exactly "TRUE" (uppercase) to enable debug/info levels
  const activeLevel: LogLevel = process.env.DEBUG_CONSOLE === "TRUE" ? "debug" : "warn";
  if (LEVELS[level] > LEVELS[activeLevel]) return;

  if (process.env.NODE_ENV === "production") {
    const entry: Record<string, unknown> = { timestamp: new Date().toISOString(), level, message };
    if (meta !== undefined) entry.meta = meta;
    let serialized: string;
    try {
      serialized = JSON.stringify(entry);
    } catch {
      serialized = JSON.stringify({ timestamp: entry.timestamp, level, message, meta: "[unserializable]" });
    }
    console[level](serialized);
  } else {
    if (meta !== undefined) {
      console[level](`[${level.toUpperCase()}] ${message}`, meta);
    } else {
      console[level](`[${level.toUpperCase()}] ${message}`);
    }
  }
}

export const logger = {
  error: (message: string, meta?: unknown) => log("error", message, meta),
  warn:  (message: string, meta?: unknown) => log("warn",  message, meta),
  info:  (message: string, meta?: unknown) => log("info",  message, meta),
  debug: (message: string, meta?: unknown) => log("debug", message, meta),
};
