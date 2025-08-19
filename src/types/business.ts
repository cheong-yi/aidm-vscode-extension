/**
 * Business Domain Types
 * Core entities for enterprise context management
 */

export interface Requirement {
  id: string;
  title: string;
  description: string;
  type: RequirementType;
  priority: Priority;
  status: RequirementStatus;
  stakeholders: string[];
  createdDate: Date;
  lastModified: Date;
  tags: string[];
}

export enum RequirementType {
  FUNCTIONAL = "functional",
  NON_FUNCTIONAL = "non_functional",
  BUSINESS = "business",
  TECHNICAL = "technical",
}

export enum Priority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

export enum RequirementStatus {
  DRAFT = "draft",
  APPROVED = "approved",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  DEPRECATED = "deprecated",
}

export interface CodeMapping {
  requirementId: string;
  codeLocation: CodeLocation;
  mappingType: MappingType;
  confidence: number;
  lastVerified: Date;
}

export interface CodeLocation {
  filePath: string;
  startLine: number;
  endLine: number;
  symbolName?: string;
  symbolType?: SymbolType;
}

export enum MappingType {
  IMPLEMENTS = "implements",
  TESTS = "tests",
  DOCUMENTS = "documents",
  REFERENCES = "references",
}

export enum SymbolType {
  FUNCTION = "function",
  CLASS = "class",
  INTERFACE = "interface",
  VARIABLE = "variable",
  METHOD = "method",
  PROPERTY = "property",
}

export interface Change {
  id: string;
  type: ChangeType;
  description: string;
  author: string;
  timestamp: Date;
  relatedRequirements: string[];
  codeChanges: CodeLocation[];
}

export enum ChangeType {
  FEATURE = "feature",
  BUG_FIX = "bug_fix",
  REFACTOR = "refactor",
  DOCUMENTATION = "documentation",
  TEST = "test",
}

export interface BusinessContext {
  requirements: Requirement[];
  implementationStatus: ImplementationStatus;
  relatedChanges: Change[];
  lastUpdated: Date;
}

export interface ImplementationStatus {
  completionPercentage: number;
  lastVerified: Date;
  verifiedBy: string;
  notes?: string;
}
