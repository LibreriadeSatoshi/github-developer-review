import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logger } from "@/lib/logger";

describe("logger", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalDebugConsole = process.env.DEBUG_CONSOLE;

  let spyError: ReturnType<typeof vi.spyOn>;
  let spyWarn: ReturnType<typeof vi.spyOn>;
  let spyInfo: ReturnType<typeof vi.spyOn>;
  let spyDebug: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    spyError = vi.spyOn(console, "error").mockImplementation(() => {});
    spyWarn  = vi.spyOn(console, "warn").mockImplementation(() => {});
    spyInfo  = vi.spyOn(console, "info").mockImplementation(() => {});
    spyDebug = vi.spyOn(console, "debug").mockImplementation(() => {});
    delete process.env.DEBUG_CONSOLE;
    process.env.NODE_ENV = "test";
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env.NODE_ENV = originalNodeEnv;
    if (originalDebugConsole !== undefined) {
      process.env.DEBUG_CONSOLE = originalDebugConsole;
    } else {
      delete process.env.DEBUG_CONSOLE;
    }
  });

  // Default level = warn: error and warn pass, info and debug suppressed
  it("emits error by default", () => {
    logger.error("test error");
    expect(spyError).toHaveBeenCalledOnce();
  });

  it("emits warn by default", () => {
    logger.warn("test warn");
    expect(spyWarn).toHaveBeenCalledOnce();
  });

  it("suppresses info by default", () => {
    logger.info("test info");
    expect(spyInfo).not.toHaveBeenCalled();
  });

  it("suppresses debug by default", () => {
    logger.debug("test debug");
    expect(spyDebug).not.toHaveBeenCalled();
  });

  // DEBUG_CONSOLE=TRUE enables all levels
  it("emits info when DEBUG_CONSOLE=TRUE", () => {
    process.env.DEBUG_CONSOLE = "TRUE";
    logger.info("info msg");
    expect(spyInfo).toHaveBeenCalledOnce();
  });

  it("emits debug when DEBUG_CONSOLE=TRUE", () => {
    process.env.DEBUG_CONSOLE = "TRUE";
    logger.debug("debug msg");
    expect(spyDebug).toHaveBeenCalledOnce();
  });

  it("does not activate debug for DEBUG_CONSOLE=true (case-sensitive)", () => {
    process.env.DEBUG_CONSOLE = "true";
    logger.debug("debug msg");
    expect(spyDebug).not.toHaveBeenCalled();
  });

  // Production: JSON format
  it("emits valid JSON in production", () => {
    process.env.NODE_ENV = "production";
    logger.warn("prod message");
    expect(spyWarn).toHaveBeenCalledOnce();
    const arg = spyWarn.mock.calls[0][0] as string;
    const parsed = JSON.parse(arg);
    expect(parsed).toMatchObject({ level: "warn", message: "prod message" });
    expect(typeof parsed.timestamp).toBe("string");
  });

  it("includes meta in JSON when provided", () => {
    process.env.NODE_ENV = "production";
    logger.error("with meta", { key: "value" });
    const arg = spyError.mock.calls[0][0] as string;
    expect(JSON.parse(arg).meta).toEqual({ key: "value" });
  });

  it("omits meta field in JSON when not provided", () => {
    process.env.NODE_ENV = "production";
    logger.warn("no meta");
    const arg = spyWarn.mock.calls[0][0] as string;
    expect(JSON.parse(arg)).not.toHaveProperty("meta");
  });
});
