/**
 * Comprehensive Audit Logger
 * Structured audit logging without sensitive data exposure
 */

export interface AuditEvent {
  action: string;
  userId?: string;
  timestamp?: Date;
  metadata?: Record<string, any>;
  error?: string;
  reason?: string;
  severity?: AuditSeverity;
  category?: AuditCategory;
  sessionId?: string;
  requestId?: string;
  duration?: number;
  outcome?: AuditOutcome;
}

export enum AuditSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

export enum AuditCategory {
  USER_INTERACTION = "user_interaction",
  DATA_ACCESS = "data_access",
  SYSTEM_EVENT = "system_event",
  ERROR_EVENT = "error_event",
  SECURITY_EVENT = "security_event",
  PERFORMANCE_EVENT = "performance_event",
}

export enum AuditOutcome {
  SUCCESS = "success",
  FAILURE = "failure",
  PARTIAL = "partial",
  TIMEOUT = "timeout",
  CANCELLED = "cancelled",
}

export interface AuditConfiguration {
  enabled: boolean;
  logLevel: AuditSeverity;
  maxLogSize: number;
  retentionDays: number;
  sensitiveFields: string[];
  enablePerformanceTracking: boolean;
}

export class AuditLogger {
  private config: AuditConfiguration;
  private auditBuffer: AuditEvent[] = [];
  private readonly maxBufferSize = 1000;
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(config?: Partial<AuditConfiguration>) {
    this.config = {
      enabled: true,
      logLevel: AuditSeverity.LOW,
      maxLogSize: 10 * 1024 * 1024, // 10MB
      retentionDays: 30,
      sensitiveFields: [
        "password",
        "token",
        "key",
        "secret",
        "credential",
        "auth",
        "session",
        "cookie",
      ],
      enablePerformanceTracking: true,
      ...config,
    };

    // Start periodic flush
    this.startPeriodicFlush();
  }

  /**
   * Log an audit event with comprehensive validation and sanitization
   */
  async logEvent(event: AuditEvent): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    try {
      // Sanitize event data
      const sanitizedEvent = this.sanitizeEvent(event);

      // Add default values
      const enrichedEvent: AuditEvent = {
        timestamp: new Date(),
        severity: AuditSeverity.LOW,
        category: AuditCategory.SYSTEM_EVENT,
        outcome: AuditOutcome.SUCCESS,
        sessionId: this.generateSessionId(),
        ...sanitizedEvent,
      };

      // Check severity filter
      if (!this.shouldLogEvent(enrichedEvent)) {
        return;
      }

      // Add to buffer
      this.auditBuffer.push(enrichedEvent);

      // Flush if buffer is full
      if (this.auditBuffer.length >= this.maxBufferSize) {
        await this.flushBuffer();
      }

      // Immediate flush for critical events
      if (enrichedEvent.severity === AuditSeverity.CRITICAL) {
        await this.flushBuffer();
      }
    } catch (error) {
      // Fallback logging - never let audit logging break the main flow
      console.error("Audit logging failed:", error);
      this.logFallback(event, error);
    }
  }

  /**
   * Log user interaction events
   */
  async logUserInteraction(
    action: string,
    metadata?: Record<string, any>,
    outcome: AuditOutcome = AuditOutcome.SUCCESS
  ): Promise<void> {
    await this.logEvent({
      action,
      category: AuditCategory.USER_INTERACTION,
      severity: AuditSeverity.LOW,
      metadata,
      outcome,
    });
  }

  /**
   * Log data access events
   */
  async logDataAccess(
    action: string,
    resourceId: string,
    metadata?: Record<string, any>,
    outcome: AuditOutcome = AuditOutcome.SUCCESS
  ): Promise<void> {
    await this.logEvent({
      action,
      category: AuditCategory.DATA_ACCESS,
      severity: AuditSeverity.MEDIUM,
      metadata: {
        resourceId,
        ...metadata,
      },
      outcome,
    });
  }

  /**
   * Log error events with structured error information
   */
  async logError(
    action: string,
    error: Error | string,
    metadata?: Record<string, any>,
    severity: AuditSeverity = AuditSeverity.HIGH
  ): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : error;
    const errorStack = error instanceof Error ? error.stack : undefined;

    await this.logEvent({
      action,
      category: AuditCategory.ERROR_EVENT,
      severity,
      error: errorMessage,
      metadata: {
        errorStack: errorStack
          ? this.sanitizeStackTrace(errorStack)
          : undefined,
        ...metadata,
      },
      outcome: AuditOutcome.FAILURE,
    });
  }

  /**
   * Log security events
   */
  async logSecurityEvent(
    action: string,
    metadata?: Record<string, any>,
    severity: AuditSeverity = AuditSeverity.HIGH
  ): Promise<void> {
    await this.logEvent({
      action,
      category: AuditCategory.SECURITY_EVENT,
      severity,
      metadata,
      outcome: AuditOutcome.SUCCESS,
    });
  }

  /**
   * Log performance events
   */
  async logPerformanceEvent(
    action: string,
    duration: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    if (!this.config.enablePerformanceTracking) {
      return;
    }

    const severity =
      duration > 5000
        ? AuditSeverity.HIGH
        : duration > 1000
        ? AuditSeverity.MEDIUM
        : AuditSeverity.LOW;

    await this.logEvent({
      action,
      category: AuditCategory.PERFORMANCE_EVENT,
      severity,
      duration,
      metadata,
      outcome: AuditOutcome.SUCCESS,
    });
  }

  /**
   * Create a performance tracker for measuring operation duration
   */
  createPerformanceTracker(action: string, metadata?: Record<string, any>) {
    const startTime = Date.now();
    return {
      finish: async (outcome: AuditOutcome = AuditOutcome.SUCCESS) => {
        const duration = Date.now() - startTime;
        await this.logPerformanceEvent(action, duration, {
          ...metadata,
          outcome,
        });
      },
    };
  }

  /**
   * Flush audit buffer to persistent storage
   */
  async flushBuffer(): Promise<void> {
    if (this.auditBuffer.length === 0) {
      return;
    }

    const eventsToFlush = [...this.auditBuffer];
    this.auditBuffer = [];

    try {
      // In a real implementation, this would write to a secure audit store
      // For demo purposes, we'll use structured console logging
      eventsToFlush.forEach((event) => {
        const logEntry = {
          timestamp: (event.timestamp || new Date()).toISOString(),
          level: "AUDIT",
          severity: event.severity,
          category: event.category,
          action: event.action,
          outcome: event.outcome,
          duration: event.duration,
          sessionId: event.sessionId,
          requestId: event.requestId,
          userId: event.userId,
          metadata: event.metadata,
          error: event.error,
          reason: event.reason,
        };

        // Use appropriate console method based on severity
        switch (event.severity) {
          case AuditSeverity.CRITICAL:
            console.error("AUDIT [CRITICAL]:", JSON.stringify(logEntry));
            break;
          case AuditSeverity.HIGH:
            console.warn("AUDIT [HIGH]:", JSON.stringify(logEntry));
            break;
          case AuditSeverity.MEDIUM:
            console.info("AUDIT [MEDIUM]:", JSON.stringify(logEntry));
            break;
          default:
            console.log("AUDIT [LOW]:", JSON.stringify(logEntry));
        }
      });
    } catch (error) {
      console.error("Failed to flush audit buffer:", error);
      // Re-add events to buffer for retry
      this.auditBuffer.unshift(...eventsToFlush);
    }
  }

  /**
   * Update audit configuration
   */
  updateConfiguration(newConfig: Partial<AuditConfiguration>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get audit statistics
   */
  getAuditStats(): {
    bufferSize: number;
    totalEventsLogged: number;
    configEnabled: boolean;
    logLevel: AuditSeverity;
  } {
    return {
      bufferSize: this.auditBuffer.length,
      totalEventsLogged: 0, // Would track this in real implementation
      configEnabled: this.config.enabled,
      logLevel: this.config.logLevel,
    };
  }

  /**
   * Graceful shutdown - flush remaining events
   */
  async shutdown(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    await this.flushBuffer();
  }

  /**
   * Sanitize event data to remove sensitive information
   */
  private sanitizeEvent(event: AuditEvent): AuditEvent {
    const sanitized = { ...event };

    // Sanitize metadata
    if (sanitized.metadata) {
      sanitized.metadata = this.sanitizeObject(sanitized.metadata);
    }

    // Sanitize error messages
    if (sanitized.error) {
      sanitized.error = this.sanitizeString(sanitized.error);
    }

    return sanitized;
  }

  /**
   * Recursively sanitize object properties
   */
  private sanitizeObject(obj: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();

      // Check if key contains sensitive information
      if (
        this.config.sensitiveFields.some((field) => lowerKey.includes(field))
      ) {
        sanitized[key] = "[REDACTED]";
      } else if (typeof value === "object" && value !== null) {
        sanitized[key] = this.sanitizeObject(value);
      } else if (typeof value === "string") {
        sanitized[key] = this.sanitizeString(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Sanitize string values to remove potential sensitive data
   */
  private sanitizeString(str: string): string {
    // Remove potential tokens, keys, or credentials from strings
    return str.replace(
      /(?:token|key|secret|password|credential|auth)[\s=:]+[^\s\n]+/gi,
      "$1=[REDACTED]"
    );
  }

  /**
   * Sanitize stack traces to remove sensitive paths
   */
  private sanitizeStackTrace(stack: string): string {
    // Remove absolute paths and replace with relative paths
    return stack.replace(/\/[^\s]+\//g, ".../");
  }

  /**
   * Check if event should be logged based on severity filter
   */
  private shouldLogEvent(event: AuditEvent): boolean {
    const severityLevels = {
      [AuditSeverity.LOW]: 0,
      [AuditSeverity.MEDIUM]: 1,
      [AuditSeverity.HIGH]: 2,
      [AuditSeverity.CRITICAL]: 3,
    };

    const eventLevel = severityLevels[event.severity || AuditSeverity.LOW];
    const configLevel = severityLevels[this.config.logLevel];

    return eventLevel >= configLevel;
  }

  /**
   * Generate session ID for tracking related events
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Start periodic buffer flush
   */
  private startPeriodicFlush(): void {
    this.flushTimer = setInterval(async () => {
      await this.flushBuffer();
    }, 5000); // Flush every 5 seconds
  }

  /**
   * Fallback logging when main audit logging fails
   */
  private logFallback(event: AuditEvent, error: any): void {
    try {
      console.error("AUDIT_FALLBACK:", {
        originalAction: event.action,
        auditError: error instanceof Error ? error.message : error,
        timestamp: new Date().toISOString(),
      });
    } catch (fallbackError) {
      // Last resort - basic console log
      console.error("AUDIT_CRITICAL_FAILURE:", fallbackError);
    }
  }
}
