/**
 * Logger Unit Tests
 * Tests for secure logging without sensitive data exposure
 */

import { Logger, LoggerFactory, LogLevel } from "../../utils/logger";

describe("Logger", () => {
  let logger: Logger;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    logger = new Logger("TestComponent");
    consoleSpy = jest.spyOn(console, "info").mockImplementation();
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
        expect.stringContaining("[INFO] [TestComponent]"),
        expect.objectContaining({
          message: "Test message",
          metadata: { key: "[REDACTED]" }, // "key" is treated as sensitive
          requestId: "req-123",
        })
      );
    });

    it("should log debug messages", () => {
      const debugLogger = new Logger("TestComponent", {
        level: LogLevel.DEBUG,
      });
      debugLogger.debug("Debug message");

      expect(console.debug).toHaveBeenCalledWith(
        expect.stringContaining("[DEBUG] [TestComponent]"),
        expect.objectContaining({
          message: "Debug message",
        })
      );
    });

    it("should log warning messages", () => {
      logger.warn("Warning message");

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining("[WARN] [TestComponent]"),
        expect.objectContaining({
          message: "Warning message",
        })
      );
    });

    it("should log error messages with error objects", () => {
      const testError = new Error("Test error");
      testError.stack = "Error stack trace";

      logger.error("Error occurred", testError, { context: "test" });

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining("[ERROR] [TestComponent]"),
        expect.objectContaining({
          message: "Error occurred",
          metadata: { context: "test" },
          error: {
            name: "Error",
            message: "Test error",
            stack: "Error stack trace",
          },
        })
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

  describe("sensitive data sanitization", () => {
    it("should sanitize password fields", () => {
      logger.info("User login", {
        username: "testuser",
        password: "secret123",
        userPassword: "anothersecret",
      });

      expect(console.info).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          metadata: {
            username: "testuser",
            password: "[REDACTED]",
            userPassword: "[REDACTED]",
          },
        })
      );
    });

    it("should sanitize token fields", () => {
      logger.info("API request", {
        endpoint: "/api/users",
        authToken: "bearer-token-123",
        accessToken: "access-token-456",
      });

      expect(console.info).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          metadata: {
            endpoint: "/api/users",
            authToken: "[REDACTED]",
            accessToken: "[REDACTED]",
          },
        })
      );
    });

    it("should sanitize personal information fields", () => {
      logger.info("User data", {
        name: "John Doe",
        email: "john@example.com",
        phone: "555-1234",
        ssn: "123-45-6789",
        address: "123 Main St",
      });

      expect(console.info).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          metadata: {
            name: "John Doe",
            email: "[REDACTED]",
            phone: "[REDACTED]",
            ssn: "[REDACTED]",
            address: "[REDACTED]",
          },
        })
      );
    });

    it("should sanitize nested objects", () => {
      logger.info("Complex data", {
        user: {
          id: 123,
          credentials: {
            password: "secret",
            apiKey: "key123",
          },
          profile: {
            name: "John",
            email: "john@example.com",
          },
        },
      });

      expect(console.info).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          metadata: {
            user: {
              id: 123,
              credentials: "[REDACTED]", // Entire object is redacted when it contains sensitive fields
              profile: {
                name: "John",
                email: "[REDACTED]",
              },
            },
          },
        })
      );
    });

    it("should sanitize arrays containing sensitive data", () => {
      logger.info("User list", {
        users: [
          { id: 1, name: "John", password: "secret1" },
          { id: 2, name: "Jane", password: "secret2" },
        ],
      });

      expect(console.info).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          metadata: {
            users: [
              { id: 1, name: "John", password: "[REDACTED]" },
              { id: 2, name: "Jane", password: "[REDACTED]" },
            ],
          },
        })
      );
    });

    it("should not sanitize when sanitization is disabled", () => {
      const unsanitizedLogger = new Logger("TestComponent", {
        sanitizeData: false,
      });

      unsanitizedLogger.info("Sensitive data", {
        password: "secret123",
        token: "token456",
      });

      expect(console.info).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          metadata: {
            password: "secret123",
            token: "token456",
          },
        })
      );
    });
  });

  describe("timestamp formatting", () => {
    it("should include ISO timestamp in log output", () => {
      logger.info("Test message");

      const logCall = (console.info as jest.Mock).mock.calls[0];
      const logPrefix = logCall[0];

      // Should contain ISO timestamp format
      expect(logPrefix).toMatch(
        /\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/
      );
    });
  });

  describe("child logger", () => {
    it("should create child logger with extended component name", () => {
      const childLogger = logger.child("SubComponent");
      childLogger.info("Child message");

      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining("[TestComponent:SubComponent]"),
        expect.any(Object)
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

    it("should merge configuration updates", () => {
      const originalConfig = {
        level: LogLevel.INFO,
        enableConsole: true,
        sanitizeData: true,
      };

      const configLogger = new Logger("TestComponent", originalConfig);
      configLogger.updateConfig({ level: LogLevel.WARN });

      // Should update level but keep other settings
      configLogger.warn("Warning message");
      expect(console.warn).toHaveBeenCalled();
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
        expect.stringContaining("[FactoryComponent]"),
        expect.any(Object)
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
      LoggerFactory.updateDefaultConfig({
        level: LogLevel.ERROR,
        sanitizeData: false,
      });

      const logger = LoggerFactory.getLogger("NewComponent");

      logger.info("Info message"); // Should be filtered out due to ERROR level
      logger.error("Error message", undefined, { password: "secret" }); // Should not sanitize

      expect(console.info).not.toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          metadata: { password: "secret" }, // Not sanitized
        })
      );
    });
  });
});
