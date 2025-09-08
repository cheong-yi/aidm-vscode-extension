/**
 * Audit Trail System
 * Tracks user interactions and data access for compliance
 */

import { Logger, LoggerFactory } from "./logger";

export enum AuditEventType {
  USER_INTERACTION = "user_interaction",
  DATA_ACCESS = "data_access",
  SYSTEM_EVENT = "system_event",
  ERROR_EVENT = "error_event",
  CONFIGURATION_CHANGE = "configuration_change",
}

export enum AuditAction {
  // User interactions
  HOVER_REQUEST = "hover_request",
  SEARCH_REQUEST = "search_request",
  STATUS_CHECK = "status_check",
  COMMAND_EXECUTION = "command_execution",

  // Data access
  CONTEXT_RETRIEVAL = "context_retrieval",
  REQUIREMENT_ACCESS = "requirement_access",
  CACHE_ACCESS = "cache_access",

  // System events
  SERVER_START = "server_start",
  SERVER_STOP = "server_stop",
  SERVER_RESTART = "server_restart",
  CONNECTION_ESTABLISHED = "connection_established",
  CONNECTION_LOST = "connection_lost",

  // Error events
  REQUEST_FAILED = "request_failed",
  SERVER_ERROR = "server_error",
  TIMEOUT_ERROR = "timeout_error",

  // Configuration
  CONFIG_UPDATE = "config_update",
  CACHE_INVALIDATION = "cache_invalidation",
}

export interface AuditEvent {
  id: string;
  timestamp: Date;
  type: AuditEventType;
  action: AuditAction;
  component: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  resource?: string;
  metadata?: Record<string, any>;
  success: boolean;
  duration?: number;
  errorCode?: string;
  errorMessage?: string;
}

export interface AuditFilter {
  startDate?: Date;
  endDate?: Date;
  type?: AuditEventType;
  action?: AuditAction;
  component?: string;
  userId?: string;
  success?: boolean;
}

export interface AuditStats {
  totalEvents: number;
  successRate: number;
  errorRate: number;
  averageDuration: number;
  topActions: Array<{ action: AuditAction; count: number }>;
  topErrors: Array<{ error: string; count: number }>;
}

/**
 * Audit trail manager for tracking system events and user interactions
 */
export class AuditTrail {
  private logger: Logger;
  private events: AuditEvent[] = [];
  private maxEvents: number = 10000;
  private sessionId: string;

  constructor(maxEvents: number = 10000) {
    this.logger = LoggerFactory.getLogger("AuditTrail");
    this.maxEvents = maxEvents;
    this.sessionId = this.generateSessionId();

    this.logger.info("Audit trail initialized", {
      sessionId: this.sessionId,
      maxEvents: this.maxEvents,
    });
  }

  /**
   * Record an audit event
   */
  recordEvent(
    type: AuditEventType,
    action: AuditAction,
    component: string,
    options: {
      userId?: string;
      requestId?: string;
      resource?: string;
      metadata?: Record<string, any>;
      success?: boolean;
      duration?: number;
      error?: Error;
    } = {}
  ): void {
    const event: AuditEvent = {
      id: this.generateEventId(),
      timestamp: new Date(),
      type,
      action,
      component,
      userId: options.userId,
      sessionId: this.sessionId,
      requestId: options.requestId,
      resource: options.resource,
      metadata: options.metadata,
      success: options.success ?? true,
      duration: options.duration,
      errorCode: options.error?.name,
      errorMessage: options.error?.message,
    };

    this.addEvent(event);

    // Log the audit event
    if (event.success) {
      this.logger.info(`Audit: ${action}`, {
        eventId: event.id,
        component: event.component,
        resource: event.resource,
        duration: event.duration,
        requestId: event.requestId,
      });
    } else {
      this.logger.warn(`Audit: ${action} failed`, {
        eventId: event.id,
        component: event.component,
        resource: event.resource,
        errorCode: event.errorCode,
        errorMessage: event.errorMessage,
        requestId: event.requestId,
      });
    }
  }

  /**
   * Record a user interaction event
   */
  recordUserInteraction(
    action: AuditAction,
    component: string,
    options: {
      userId?: string;
      requestId?: string;
      resource?: string;
      metadata?: Record<string, any>;
      duration?: number;
    } = {}
  ): void {
    this.recordEvent(AuditEventType.USER_INTERACTION, action, component, {
      ...options,
      success: true,
    });
  }

  /**
   * Record a data access event
   */
  recordDataAccess(
    action: AuditAction,
    component: string,
    resource: string,
    options: {
      userId?: string;
      requestId?: string;
      metadata?: Record<string, any>;
      success?: boolean;
      duration?: number;
      error?: Error;
    } = {}
  ): void {
    this.recordEvent(AuditEventType.DATA_ACCESS, action, component, {
      ...options,
      resource,
    });
  }

  /**
   * Record a system event
   */
  recordSystemEvent(
    action: AuditAction,
    component: string,
    options: {
      requestId?: string;
      metadata?: Record<string, any>;
      success?: boolean;
      error?: Error;
    } = {}
  ): void {
    this.recordEvent(AuditEventType.SYSTEM_EVENT, action, component, options);
  }

  /**
   * Record an error event
   */
  recordError(
    action: AuditAction,
    component: string,
    error: Error,
    options: {
      userId?: string;
      requestId?: string;
      resource?: string;
      metadata?: Record<string, any>;
      duration?: number;
    } = {}
  ): void {
    this.recordEvent(AuditEventType.ERROR_EVENT, action, component, {
      ...options,
      success: false,
      error,
    });
  }

  /**
   * Get audit events with optional filtering
   */
  getEvents(filter?: AuditFilter): AuditEvent[] {
    let filteredEvents = [...this.events];

    if (filter) {
      if (filter.startDate) {
        filteredEvents = filteredEvents.filter(
          (e) => e.timestamp >= filter.startDate!
        );
      }
      if (filter.endDate) {
        filteredEvents = filteredEvents.filter(
          (e) => e.timestamp <= filter.endDate!
        );
      }
      if (filter.type) {
        filteredEvents = filteredEvents.filter((e) => e.type === filter.type);
      }
      if (filter.action) {
        filteredEvents = filteredEvents.filter(
          (e) => e.action === filter.action
        );
      }
      if (filter.component) {
        filteredEvents = filteredEvents.filter(
          (e) => e.component === filter.component
        );
      }
      if (filter.userId) {
        filteredEvents = filteredEvents.filter(
          (e) => e.userId === filter.userId
        );
      }
      if (filter.success !== undefined) {
        filteredEvents = filteredEvents.filter(
          (e) => e.success === filter.success
        );
      }
    }

    return filteredEvents.sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );
  }

  /**
   * Get audit statistics
   */
  getStats(filter?: AuditFilter): AuditStats {
    const events = this.getEvents(filter);
    const totalEvents = events.length;

    if (totalEvents === 0) {
      return {
        totalEvents: 0,
        successRate: 0,
        errorRate: 0,
        averageDuration: 0,
        topActions: [],
        topErrors: [],
      };
    }

    const successfulEvents = events.filter((e) => e.success);
    const failedEvents = events.filter((e) => !e.success);
    const eventsWithDuration = events.filter((e) => e.duration !== undefined);

    const successRate = (successfulEvents.length / totalEvents) * 100;
    const errorRate = (failedEvents.length / totalEvents) * 100;

    const averageDuration =
      eventsWithDuration.length > 0
        ? eventsWithDuration.reduce((sum, e) => sum + (e.duration || 0), 0) /
          eventsWithDuration.length
        : 0;

    // Count actions
    const actionCounts = new Map<AuditAction, number>();
    events.forEach((e) => {
      actionCounts.set(e.action, (actionCounts.get(e.action) || 0) + 1);
    });

    const topActions = Array.from(actionCounts.entries())
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Count errors
    const errorCounts = new Map<string, number>();
    failedEvents.forEach((e) => {
      if (e.errorCode) {
        errorCounts.set(e.errorCode, (errorCounts.get(e.errorCode) || 0) + 1);
      }
    });

    const topErrors = Array.from(errorCounts.entries())
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalEvents,
      successRate,
      errorRate,
      averageDuration,
      topActions,
      topErrors,
    };
  }

  /**
   * Clear old events to maintain memory limits
   */
  cleanup(): void {
    if (this.events.length > this.maxEvents) {
      const eventsToRemove = this.events.length - this.maxEvents;
      this.events.splice(0, eventsToRemove);

      this.logger.info("Audit trail cleanup performed", {
        eventsRemoved: eventsToRemove,
        remainingEvents: this.events.length,
      });
    }
  }

  /**
   * Export audit events for external analysis
   */
  exportEvents(filter?: AuditFilter): string {
    const events = this.getEvents(filter);
    return JSON.stringify(events, null, 2);
  }

  /**
   * Get current session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }

  private addEvent(event: AuditEvent): void {
    this.events.push(event);

    // Cleanup if we exceed the limit
    if (this.events.length > this.maxEvents) {
      this.cleanup();
    }
  }

  private generateEventId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 11)}`;
  }
}

/**
 * Global audit trail instance
 */
export const auditTrail = new AuditTrail();
