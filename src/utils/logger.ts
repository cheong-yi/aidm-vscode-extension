/**
 * Simple Console Logger
 * Basic logging wrapper for console output
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LoggerConfig {
  level: LogLevel;
}

/**
 * Simple console wrapper for logging
 */
export class Logger {
  private config: LoggerConfig;
  private component: string;

  constructor(component: string, config: Partial<LoggerConfig> = {}) {
    this.component = component;
    this.config = { level: LogLevel.INFO, ...config };
  }

  debug(message: string, metadata?: Record<string, any>, requestId?: string): void {
    if (LogLevel.DEBUG >= this.config.level) {
      console.debug(`[DEBUG] [${this.component}]`, message, metadata, requestId);
    }
  }

  info(message: string, metadata?: Record<string, any>, requestId?: string): void {
    if (LogLevel.INFO >= this.config.level) {
      console.info(`[INFO] [${this.component}]`, message, metadata, requestId);
    }
  }

  warn(message: string, metadata?: Record<string, any>, requestId?: string): void {
    if (LogLevel.WARN >= this.config.level) {
      console.warn(`[WARN] [${this.component}]`, message, metadata, requestId);
    }
  }

  error(message: string, error?: Error, metadata?: Record<string, any>, requestId?: string): void {
    if (LogLevel.ERROR >= this.config.level) {
      console.error(`[ERROR] [${this.component}]`, message, error, metadata, requestId);
    }
  }

  child(additionalComponent: string): Logger {
    return new Logger(`${this.component}:${additionalComponent}`, this.config);
  }

  updateConfig(newConfig: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

export class LoggerFactory {
  private static defaultConfig: LoggerConfig = { level: LogLevel.INFO };

  static getLogger(component: string, config?: Partial<LoggerConfig>): Logger {
    return new Logger(component, { ...this.defaultConfig, ...config });
  }

  static updateDefaultConfig(config: Partial<LoggerConfig>): void {
    this.defaultConfig = { ...this.defaultConfig, ...config };
  }
}

// Default logger instance for simple log function
const defaultLogger = new Logger('Global', { level: LogLevel.INFO });

/**
 * Simple log function for compatibility with existing code
 * @param level - Log level ('DEBUG', 'INFO', 'WARN', 'ERROR')
 * @param component - Component name
 * @param message - Log message
 * @param metadata - Optional metadata object
 */
export function log(level: string, component: string, message: string, metadata?: Record<string, any>): void {
  const formattedMessage = `[${component}] ${message}`;

  switch (level.toUpperCase()) {
    case 'DEBUG':
      defaultLogger.debug(formattedMessage, metadata);
      break;
    case 'INFO':
      defaultLogger.info(formattedMessage, metadata);
      break;
    case 'WARN':
      defaultLogger.warn(formattedMessage, metadata);
      break;
    case 'ERROR':
      defaultLogger.error(formattedMessage, metadata?.error || undefined, metadata);
      break;
    default:
      defaultLogger.info(formattedMessage, metadata);
  }
}
