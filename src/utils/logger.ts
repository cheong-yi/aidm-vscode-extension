/**
 * Structured Logging System
 * Provides secure logging without sensitive data exposure
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  component: string;
  message: string;
  metadata?: Record<string, any>;
  requestId?: string;
  userId?: string;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  maxLogSize: number;
  sanitizeData: boolean;
}

/**
 * Secure logger that sanitizes sensitive data
 */
export class Logger {
  private config: LoggerConfig;
  private component: string;
  private sensitiveFields = [
    "password",
    "token",
    "secret",
    "key",
    "auth",
    "credential",
    "ssn",
    "social",
    "email",
    "phone",
    "address",
    "ip",
  ];

  constructor(component: string, config: Partial<LoggerConfig> = {}) {
    this.component = component;
    this.config = {
      level: LogLevel.INFO,
      enableConsole: true,
      enableFile: false,
      maxLogSize: 10 * 1024 * 1024, // 10MB
      sanitizeData: true,
      ...config,
    };
  }

  debug(
    message: string,
    metadata?: Record<string, any>,
    requestId?: string
  ): void {
    this.log(LogLevel.DEBUG, message, metadata, requestId);
  }

  info(
    message: string,
    metadata?: Record<string, any>,
    requestId?: string
  ): void {
    this.log(LogLevel.INFO, message, metadata, requestId);
  }

  warn(
    message: string,
    metadata?: Record<string, any>,
    requestId?: string
  ): void {
    this.log(LogLevel.WARN, message, metadata, requestId);
  }

  error(
    message: string,
    error?: Error,
    metadata?: Record<string, any>,
    requestId?: string
  ): void {
    const errorInfo = error
      ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        }
      : undefined;

    this.log(LogLevel.ERROR, message, metadata, requestId, errorInfo);
  }

  private log(
    level: LogLevel,
    message: string,
    metadata?: Record<string, any>,
    requestId?: string,
    error?: { name: string; message: string; stack?: string }
  ): void {
    if (level < this.config.level) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      component: this.component,
      message,
      metadata: this.config.sanitizeData
        ? this.sanitizeMetadata(metadata)
        : metadata,
      requestId,
      error,
    };

    if (this.config.enableConsole) {
      this.logToConsole(entry);
    }

    // File logging would be implemented here for production
    // For VSCode extension, we primarily use console and VSCode output channels
  }

  private sanitizeMetadata(
    metadata?: Record<string, any>
  ): Record<string, any> | undefined {
    if (!metadata) return undefined;

    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(metadata)) {
      if (this.isSensitiveField(key)) {
        sanitized[key] = "[REDACTED]";
      } else if (typeof value === "object" && value !== null) {
        sanitized[key] = this.sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  private sanitizeObject(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map((item) =>
        typeof item === "object" && item !== null
          ? this.sanitizeObject(item)
          : item
      );
    }

    if (typeof obj === "object" && obj !== null) {
      const sanitized: Record<string, any> = {};
      for (const [key, value] of Object.entries(obj)) {
        if (this.isSensitiveField(key)) {
          sanitized[key] = "[REDACTED]";
        } else if (typeof value === "object" && value !== null) {
          sanitized[key] = this.sanitizeObject(value);
        } else {
          sanitized[key] = value;
        }
      }
      return sanitized;
    }

    return obj;
  }

  private isSensitiveField(fieldName: string): boolean {
    const lowerField = fieldName.toLowerCase();
    return this.sensitiveFields.some((sensitive) =>
      lowerField.includes(sensitive)
    );
  }

  private logToConsole(entry: LogEntry): void {
    const levelName = LogLevel[entry.level];
    const timestamp = entry.timestamp.toISOString();
    const prefix = `[${timestamp}] [${levelName}] [${entry.component}]`;

    const logData = {
      message: entry.message,
      ...(entry.metadata && { metadata: entry.metadata }),
      ...(entry.requestId && { requestId: entry.requestId }),
      ...(entry.error && { error: entry.error }),
    };

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(prefix, logData);
        break;
      case LogLevel.INFO:
        console.info(prefix, logData);
        break;
      case LogLevel.WARN:
        console.warn(prefix, logData);
        break;
      case LogLevel.ERROR:
        console.error(prefix, logData);
        break;
    }
  }

  /**
   * Create a child logger with additional context
   */
  child(additionalComponent: string): Logger {
    return new Logger(`${this.component}:${additionalComponent}`, this.config);
  }

  /**
   * Update logger configuration
   */
  updateConfig(newConfig: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

/**
 * Global logger factory
 */
export class LoggerFactory {
  private static defaultConfig: LoggerConfig = {
    level: LogLevel.INFO,
    enableConsole: true,
    enableFile: false,
    maxLogSize: 10 * 1024 * 1024,
    sanitizeData: true,
  };

  static getLogger(component: string, config?: Partial<LoggerConfig>): Logger {
    return new Logger(component, { ...this.defaultConfig, ...config });
  }

  static updateDefaultConfig(config: Partial<LoggerConfig>): void {
    this.defaultConfig = { ...this.defaultConfig, ...config };
  }
}
