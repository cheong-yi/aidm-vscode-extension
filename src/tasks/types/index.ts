/**
 * Task Types - Main Export File
 * Single source of truth for all task-related types
 * Requirements: 1.1, 1.2, 2.1, 7.1
 */

// ============================================================================
// CORE TASK TYPES (Single Source of Truth)
// ============================================================================

// Export all core types from centralized location
export * from "../../types/tasks";

// ============================================================================
// CONSOLIDATED TASK-SPECIFIC TYPES
// ============================================================================

// Export all task-specific types from single consolidated file
export * from "./taskTypes";