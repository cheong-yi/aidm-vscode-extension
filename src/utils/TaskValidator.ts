/**
 * TaskValidator - Utility class for validating Task data contract compliance
 * Task 2.6.4: Validate enhanced mock response structure matches API
 * Requirements: 6.8, 6.9
 * 
 * This validator ensures that all enhanced Task fields match the design document interface exactly,
 * including FailingTest structure, STATUS_DISPLAY_NAMES mapping, and TestStatus enhanced fields.
 */

import {
  Task,
  TaskStatus,
  TaskComplexity,
  TaskPriority,
  TestStatus,
  FailingTest,
  STATUS_DISPLAY_NAMES,
  ValidationResult,
} from "../types/tasks";

export interface TaskValidationResult extends ValidationResult {
  contractCompliance: boolean;
  missingFields: string[];
  invalidFieldTypes: string[];
  validationDetails: {
    taskId?: string;
    fieldValidations: Record<string, boolean>;
    enumValidations: Record<string, boolean>;
    dateValidations: Record<string, boolean>;
  };
}

export interface FailingTestValidationResult {
  isValid: boolean;
  errors: string[];
  categoryValidation: boolean;
  requiredFieldsPresent: boolean;
}

export class TaskValidator {
  /**
   * Validates a single Task object against the enhanced interface
   */
  static validateTask(task: any): TaskValidationResult {
    const result: TaskValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      contractCompliance: true,
      missingFields: [],
      invalidFieldTypes: [],
      validationDetails: {
        fieldValidations: {},
        enumValidations: {},
        dateValidations: {},
      },
    };

    // Validate required fields
    const requiredFields = [
      "id",
      "title",
      "description",
      "status",
      "complexity",
      "dependencies",
      "requirements",
      "createdDate",
      "lastModified",
    ];

    for (const field of requiredFields) {
      if (!(field in task)) {
        result.missingFields.push(field);
        result.isValid = false;
        result.contractCompliance = false;
        result.validationDetails.fieldValidations[field] = false;
      } else {
        result.validationDetails.fieldValidations[field] = true;
      }
    }

    // Validate field types
    if (task.id && typeof task.id !== "string") {
      result.invalidFieldTypes.push(`id: expected string, got ${typeof task.id}`);
      result.isValid = false;
    }

    if (task.title && typeof task.title !== "string") {
      result.invalidFieldTypes.push(`title: expected string, got ${typeof task.title}`);
      result.isValid = false;
    }

    if (task.description && typeof task.description !== "string") {
      result.invalidFieldTypes.push(`description: expected string, got ${typeof task.description}`);
      result.isValid = false;
    }

    if (task.dependencies && !Array.isArray(task.dependencies)) {
      result.invalidFieldTypes.push(`dependencies: expected array, got ${typeof task.dependencies}`);
      result.isValid = false;
    }

    if (task.requirements && !Array.isArray(task.requirements)) {
      result.invalidFieldTypes.push(`requirements: expected array, got ${typeof task.requirements}`);
      result.isValid = false;
    }

    // Validate optional enhanced fields
    if (task.estimatedDuration !== undefined && typeof task.estimatedDuration !== "string") {
      result.invalidFieldTypes.push(`estimatedDuration: expected string, got ${typeof task.estimatedDuration}`);
      result.isValid = false;
    }

    if (task.isExecutable !== undefined && typeof task.isExecutable !== "boolean") {
      result.invalidFieldTypes.push(`isExecutable: expected boolean, got ${typeof task.isExecutable}`);
      result.isValid = false;
    }

    if (task.statusDisplayName !== undefined && typeof task.statusDisplayName !== "string") {
      result.invalidFieldTypes.push(`statusDisplayName: expected string, got ${typeof task.statusDisplayName}`);
      result.isValid = false;
    }

    // Validate enums
    const enumValidation = this.validateTaskEnums(task);
    result.validationDetails.enumValidations = enumValidation;
    if (!Object.values(enumValidation).every(Boolean)) {
      result.isValid = false;
      result.contractCompliance = false;
    }

    // Validate dates
    const dateValidation = this.validateTaskDates(task);
    result.validationDetails.dateValidations = dateValidation;
    if (Object.values(dateValidation).some(validation => validation === false)) {
      result.isValid = false;
      result.contractCompliance = false;
    }

    // Validate TestStatus if present
    if (task.testStatus) {
      const testStatusValidation = this.validateTestStatus(task.testStatus);
      if (!testStatusValidation.isValid) {
        result.errors.push(...testStatusValidation.errors);
        result.isValid = false;
        result.contractCompliance = false;
      }
    }

    // Validate isExecutable logic for not_started tasks
    if (task.status === TaskStatus.NOT_STARTED && task.isExecutable === false) {
      result.warnings.push("not_started tasks should typically have isExecutable: true for Cursor integration");
    }

    // Compile errors
    if (result.missingFields.length > 0) {
      result.errors.push(`Missing required fields: ${result.missingFields.join(", ")}`);
    }

    if (result.invalidFieldTypes.length > 0) {
      result.errors.push(`Invalid field types: ${result.invalidFieldTypes.join("; ")}`);
    }

    return result;
  }

  /**
   * Validates Task enum values against the defined enums
   */
  private static validateTaskEnums(task: any): Record<string, boolean> {
    const validations: Record<string, boolean> = {};

    // Validate TaskStatus
    if (task.status) {
      validations.status = Object.values(TaskStatus).includes(task.status);
    }

    // Validate TaskComplexity
    if (task.complexity) {
      validations.complexity = Object.values(TaskComplexity).includes(task.complexity);
    }

    // Validate TaskPriority if present
    if (task.priority) {
      validations.priority = Object.values(TaskPriority).includes(task.priority);
    }

    return validations;
  }

  /**
   * Validates Task date fields for ISO 8601 format
   */
  private static validateTaskDates(task: any): Record<string, boolean> {
    const validations: Record<string, boolean> = {};

    // Validate createdDate - always validate if present
    if (task.createdDate !== undefined) {
      validations.createdDate = this.isValidISODateString(task.createdDate);
    }

    // Validate lastModified - always validate if present
    if (task.lastModified !== undefined) {
      validations.lastModified = this.isValidISODateString(task.lastModified);
    }

    return validations;
  }

  /**
   * Validates TestStatus object structure
   */
  static validateTestStatus(testStatus: any): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    // Validate required fields
    if (typeof testStatus.totalTests !== "number") {
      result.errors.push("totalTests must be a number");
      result.isValid = false;
    }

    if (typeof testStatus.passedTests !== "number") {
      result.errors.push("passedTests must be a number");
      result.isValid = false;
    }

    if (typeof testStatus.failedTests !== "number") {
      result.errors.push("failedTests must be a number");
      result.isValid = false;
    }

    // Validate optional fields
    if (testStatus.lastRunDate && !this.isValidISODateString(testStatus.lastRunDate)) {
      result.errors.push("lastRunDate must be a valid ISO 8601 date string");
      result.isValid = false;
    }

    if (testStatus.coverage !== undefined && typeof testStatus.coverage !== "number") {
      result.errors.push("coverage must be a number if present");
      result.isValid = false;
    }

    // Validate FailingTest array if present
    if (testStatus.failingTestsList) {
      if (!Array.isArray(testStatus.failingTestsList)) {
        result.errors.push("failingTestsList must be an array");
        result.isValid = false;
      } else {
        for (let i = 0; i < testStatus.failingTestsList.length; i++) {
          const failingTestValidation = this.validateFailingTest(testStatus.failingTestsList[i]);
          if (!failingTestValidation.isValid) {
            result.errors.push(`failingTestsList[${i}]: ${failingTestValidation.errors.join(", ")}`);
            result.isValid = false;
          }
        }
      }
    }

    return result;
  }

  /**
   * Validates FailingTest object structure
   */
  static validateFailingTest(failingTest: any): FailingTestValidationResult {
    const result: FailingTestValidationResult = {
      isValid: true,
      errors: [],
      categoryValidation: true,
      requiredFieldsPresent: true,
    };

    // Validate required fields
    if (typeof failingTest.name !== "string") {
      result.errors.push("name must be a string");
      result.requiredFieldsPresent = false;
      result.isValid = false;
    }

    if (typeof failingTest.message !== "string") {
      result.errors.push("message must be a string");
      result.requiredFieldsPresent = false;
      result.isValid = false;
    }

    // Validate category enum
    const validCategories = ["assertion", "type", "filesystem", "timeout", "network"];
    if (!validCategories.includes(failingTest.category)) {
      result.errors.push(`category must be one of: ${validCategories.join(", ")}`);
      result.categoryValidation = false;
      result.isValid = false;
    }

    // Validate optional fields
    if (failingTest.stackTrace !== undefined && typeof failingTest.stackTrace !== "string") {
      result.errors.push("stackTrace must be a string if present");
      result.isValid = false;
    }

    return result;
  }

  /**
   * Validates STATUS_DISPLAY_NAMES mapping completeness
   */
  static validateStatusDisplayNamesMapping(): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    // Check if all TaskStatus enum values have corresponding display names
    for (const status of Object.values(TaskStatus)) {
      if (!STATUS_DISPLAY_NAMES[status]) {
        result.errors.push(`Missing STATUS_DISPLAY_NAMES mapping for status: ${status}`);
        result.isValid = false;
      }
    }

    // Check for extra mappings that don't correspond to enum values
    for (const status in STATUS_DISPLAY_NAMES) {
      if (!Object.values(TaskStatus).includes(status as TaskStatus)) {
        result.warnings.push(`Extra STATUS_DISPLAY_NAMES mapping for unknown status: ${status}`);
      }
    }

    return result;
  }

  /**
   * Validates JSON-RPC response format for tasks
   */
  static validateJSONRPCResponse(response: any): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    // Validate basic JSON-RPC structure
    if (response.jsonrpc !== "2.0") {
      result.errors.push("Response must have jsonrpc: '2.0'");
      result.isValid = false;
    }

    if (typeof response.id !== "number" && typeof response.id !== "string") {
      result.errors.push("Response must have a valid id field");
      result.isValid = false;
    }

    // Check for error response
    if (response.error) {
      if (typeof response.error.code !== "number") {
        result.errors.push("Error response must have numeric error code");
        result.isValid = false;
      }
      if (typeof response.error.message !== "string") {
        result.errors.push("Error response must have error message");
        result.isValid = false;
      }
      // For error responses, don't validate result structure - they're valid JSON-RPC
      return result;
    }

    // Validate successful response structure
    if (!response.result) {
      result.errors.push("Successful response must have result field");
      result.isValid = false;
      // Don't return early - continue to collect all validation errors
    }

    // Check for content array structure (MCP format) - only if result exists
    if (response.result && response.result.content && Array.isArray(response.result.content)) {
      if (response.result.content.length === 0) {
        result.warnings.push("Content array is empty");
      } else {
        // Validate first content item has text field
        const firstContent = response.result.content[0];
        if (typeof firstContent.text !== "string") {
          result.errors.push("Content items must have text field");
          result.isValid = false;
        } else {
          // Try to parse the JSON text content
          try {
            const parsedContent = JSON.parse(firstContent.text);
            if (parsedContent.tasks && Array.isArray(parsedContent.tasks)) {
              // Check if tasks array is empty
              if (parsedContent.tasks.length === 0) {
                result.warnings.push("Content array is empty");
              }
              // Validate each task in the array
              for (let i = 0; i < parsedContent.tasks.length; i++) {
                const taskValidation = this.validateTask(parsedContent.tasks[i]);
                if (!taskValidation.isValid) {
                  result.errors.push(`Task[${i}] validation failed: ${taskValidation.errors.join(", ")}`);
                  result.isValid = false;
                }
              }
            }
          } catch (parseError) {
            result.errors.push(`Failed to parse content text as JSON: ${parseError}`);
            result.isValid = false;
          }
        }
      }
    }

    return result;
  }

  /**
   * Validates ISO 8601 date string format
   */
  private static isValidISODateString(dateString: string): boolean {
    if (typeof dateString !== "string") {
      return false;
    }

    // Basic ISO 8601 format validation
    const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
    if (!isoDateRegex.test(dateString)) {
      return false;
    }

    // Additional validation for invalid date components
    const parts = dateString.split('T')[0].split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;
    
    // Basic month/day validation (simplified)
    if (month === 2 && day > 29) return false;
    if ([4, 6, 9, 11].includes(month) && day > 30) return false;

    // Try to create a Date object to validate it's actually a valid date
    try {
      const date = new Date(dateString);
      return !isNaN(date.getTime());
    } catch {
      return false;
    }
  }

  /**
   * Comprehensive validation of mock data structure
   */
  static validateMockDataStructure(mockData: any): TaskValidationResult {
    const result: TaskValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      contractCompliance: true,
      missingFields: [],
      invalidFieldTypes: [],
      validationDetails: {
        fieldValidations: {},
        enumValidations: {},
        dateValidations: {},
      },
    };

    // Validate STATUS_DISPLAY_NAMES mapping
    const mappingValidation = this.validateStatusDisplayNamesMapping();
    if (!mappingValidation.isValid) {
      result.errors.push(...mappingValidation.errors);
      result.isValid = false;
      result.contractCompliance = false;
    }

    // If mockData has tasks array, validate each task
    if (mockData.tasks && Array.isArray(mockData.tasks)) {
      for (let i = 0; i < mockData.tasks.length; i++) {
        const taskValidation = this.validateTask(mockData.tasks[i]);
        if (!taskValidation.isValid) {
          result.errors.push(`MockData.tasks[${i}] validation failed: ${taskValidation.errors.join(", ")}`);
          result.isValid = false;
          result.contractCompliance = false;
        }
      }
    }

    return result;
  }
}
