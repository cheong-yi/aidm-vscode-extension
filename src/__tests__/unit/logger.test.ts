/**
 * Logger Unit Tests
 * Tests for simple console logging
 */

import { Logger, LoggerFactory, LogLevel } from "../../utils/logger";

describe("Logger", () => {
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger("TestComponent");
    jest.spyOn(console, "info").mockImplementation();
    jest.spyOn(console, "debug").mockImplementation();
    jest.spyOn(console, "warn").mockImplementation();
    jest.spyOn(console, "error").mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("basic logging", () => {
    it("should log info messages", () => {
      logger.info("Test message", { key: "value" }, "req-123");

      expect(console.info).toHaveBeenCalledWith(
        "[INFO] [TestComponent]",
        "Test message",
        { key: "value" },
        "req-123"
      );
    });

    it("should log debug messages", () => {
      const debugLogger = new Logger("TestComponent", {
        level: LogLevel.DEBUG,
      });
      debugLogger.debug("Debug message");

      expect(console.debug).toHaveBeenCalledWith(
        "[DEBUG] [TestComponent]",
        "Debug message",
        undefined,
        undefined
      );
    });

    it("should log warning messages", () => {
      logger.warn("Warning message");

      expect(console.warn).toHaveBeenCalledWith(
        "[WARN] [TestComponent]",
        "Warning message",
        undefined,
        undefined
      );
    });

    it("should log error messages with error objects", () => {
      const testError = new Error("Test error");

      logger.error("Error occurred", testError, { context: "test" });

      expect(console.error).toHaveBeenCalledWith(
        "[ERROR] [TestComponent]",
        "Error occurred",
        testError,
        { context: "test" },
        undefined
      );
    });
  });

  describe("log level filtering", () => {
    it("should respect log level configuration", () => {
      const warnLogger = new Logger("TestComponent", { level: LogLevel.WARN });

      warnLogger.debug("Debug message");
      warnLogger.info("Info message");
      warnLogger.warn("Warning message");
      warnLogger.error("Error message");

      expect(console.debug).not.toHaveBeenCalled();
      expect(console.info).not.toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();
    });

    it("should log all levels when set to DEBUG", () => {
      const debugLogger = new Logger("TestComponent", {
        level: LogLevel.DEBUG,
      });

      debugLogger.debug("Debug message");
      debugLogger.info("Info message");
      debugLogger.warn("Warning message");
      debugLogger.error("Error message");

      expect(console.debug).toHaveBeenCalled();
      expect(console.info).toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe("child logger", () => {
    it("should create child logger with extended component name", () => {
      const childLogger = logger.child("SubComponent");
      childLogger.info("Child message");

      expect(console.info).toHaveBeenCalledWith(
        "[INFO] [TestComponent:SubComponent]",
        "Child message",
        undefined,
        undefined
      );
    });

    it("should inherit parent configuration", () => {
      const parentLogger = new Logger("Parent", { level: LogLevel.WARN });
      const childLogger = parentLogger.child("Child");

      childLogger.info("Info message"); // Should be filtered out
      childLogger.warn("Warning message"); // Should be logged

      expect(console.info).not.toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalled();
    });
  });

  describe("configuration updates", () => {
    it("should update logger configuration", () => {
      logger.updateConfig({ level: LogLevel.ERROR });

      logger.info("Info message"); // Should be filtered out
      logger.error("Error message"); // Should be logged

      expect(console.info).not.toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();
    });
  });
});

describe("LoggerFactory", () => {
  beforeEach(() => {
    jest.spyOn(console, "info").mockImplementation();
    jest.spyOn(console, "debug").mockImplementation();
    jest.spyOn(console, "warn").mockImplementation();
    jest.spyOn(console, "error").mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("getLogger", () => {
    it("should create logger with component name", () => {
      const logger = LoggerFactory.getLogger("FactoryComponent");
      logger.info("Test message");

      expect(console.info).toHaveBeenCalledWith(
        "[INFO] [FactoryComponent]",
        "Test message",
        undefined,
        undefined
      );
    });

    it("should apply custom configuration", () => {
      const logger = LoggerFactory.getLogger("FactoryComponent", {
        level: LogLevel.ERROR,
      });

      logger.info("Info message"); // Should be filtered out
      logger.error("Error message"); // Should be logged

      expect(console.info).not.toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();
    });

    it("should merge with default configuration", () => {
      LoggerFactory.updateDefaultConfig({ level: LogLevel.WARN });

      const logger = LoggerFactory.getLogger("FactoryComponent");

      logger.info("Info message"); // Should be filtered out
      logger.warn("Warning message"); // Should be logged

      expect(console.info).not.toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalled();
    });
  });

  describe("updateDefaultConfig", () => {
    it("should update default configuration for new loggers", () => {
      LoggerFactory.updateDefaultConfig({ level: LogLevel.ERROR });

      const logger = LoggerFactory.getLogger("NewComponent");

      logger.info("Info message"); // Should be filtered out due to ERROR level
      logger.error("Error message", new Error("test"), { context: "test" });

      expect(console.info).not.toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith(
        "[ERROR] [NewComponent]",
        "Error message",
        expect.any(Error),
        { context: "test" },
        undefined
      );
    });
  });
});
