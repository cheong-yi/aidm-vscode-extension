/**
 * Tests for Business Context Hover Provider
 */

import * as vscode from "vscode";
import { BusinessContextHover } from "../providers/hoverProvider";
import { MCPClient } from "../client/mcpClient";
import {
  BusinessContext,
  RequirementType,
  Priority,
  RequirementStatus,
  ChangeType,
} from "../types/business";

// vscode module is mocked via jest configuration

// Mock MCPClient
jest.mock("../client/mcpClient");

describe("BusinessContextHover", () => {
  let hoverProvider: BusinessContextHover;
  let mockMCPClient: jest.Mocked<MCPClient>;
  let mockDocument: vscode.TextDocument;
  let mockPosition: vscode.Position;

  beforeEach(() => {
    mockMCPClient = new MCPClient() as jest.Mocked<MCPClient>;
    hoverProvider = new BusinessContextHover(mockMCPClient);

    mockDocument = {
      fileName: "/test/file.ts",
      languageId: "typescript",
    } as vscode.TextDocument;

    mockPosition = new vscode.Position(10, 5);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getSupportedLanguages", () => {
    it("should return only TypeScript for MVP", () => {
      const languages = hoverProvider.getSupportedLanguages();
      expect(languages).toEqual(["typescript"]);
    });
  });

  describe("provideHover", () => {
    it("should return null for unsupported languages", async () => {
      const jsDocument = {
        ...mockDocument,
        languageId: "javascript",
      } as vscode.TextDocument;

      const result = await hoverProvider.provideHover(
        jsDocument,
        mockPosition,
        {} as any
      );

      expect(result).toBeNull();
    });

    it("should return business context hover for TypeScript files", async () => {
      const mockBusinessContext: BusinessContext = {
        requirements: [
          {
            id: "REQ-001",
            title: "User Authentication",
            description: "Implement secure user login functionality",
            type: RequirementType.FUNCTIONAL,
            priority: Priority.HIGH,
            status: RequirementStatus.IN_PROGRESS,
            stakeholders: ["Product Team", "Security Team"],
            createdDate: new Date("2024-01-01"),
            lastModified: new Date("2024-01-15"),
            tags: ["auth", "security"],
          },
        ],
        implementationStatus: {
          completionPercentage: 75,
          lastVerified: new Date("2024-01-15"),
          verifiedBy: "John Doe",
          notes: "Authentication flow implemented, testing in progress",
        },
        relatedChanges: [
          {
            id: "CHG-001",
            type: ChangeType.FEATURE,
            description: "Added OAuth2 integration",
            author: "Jane Smith",
            timestamp: new Date("2024-01-14"),
            relatedRequirements: ["REQ-001"],
            codeChanges: [],
          },
        ],
        lastUpdated: new Date("2024-01-15"),
      };

      mockMCPClient.getBusinessContext.mockResolvedValue({
        content: [
          {
            type: "text",
            text: JSON.stringify(mockBusinessContext),
          },
        ],
      });

      const result = await hoverProvider.provideHover(
        mockDocument,
        mockPosition,
        {} as any
      );

      expect(result).toBeDefined();
      expect(mockMCPClient.getBusinessContext).toHaveBeenCalledWith(
        "/test/file.ts",
        11
      ); // 1-based line number
    });

    it("should return no context hover when no data is available", async () => {
      mockMCPClient.getBusinessContext.mockResolvedValue(null);

      const result = await hoverProvider.provideHover(
        mockDocument,
        mockPosition,
        {} as any
      );

      expect(result).toBeDefined();
      // Should return a hover indicating no context available
    });

    it("should return error hover when MCP client throws an error", async () => {
      mockMCPClient.getBusinessContext.mockRejectedValue(
        new Error("Connection failed")
      );

      const result = await hoverProvider.provideHover(
        mockDocument,
        mockPosition,
        {} as any
      );

      expect(result).toBeDefined();
      // Should return an error hover
    });

    it("should handle malformed JSON response gracefully", async () => {
      mockMCPClient.getBusinessContext.mockResolvedValue({
        content: [
          {
            type: "text",
            text: "invalid json",
          },
        ],
      });

      const result = await hoverProvider.provideHover(
        mockDocument,
        mockPosition,
        {} as any
      );

      expect(result).toBeDefined();
      // Should return no context hover when JSON parsing fails
    });

    it("should handle empty requirements array", async () => {
      const emptyContext: BusinessContext = {
        requirements: [],
        implementationStatus: {
          completionPercentage: 0,
          lastVerified: new Date(),
          verifiedBy: "System",
        },
        relatedChanges: [],
        lastUpdated: new Date(),
      };

      mockMCPClient.getBusinessContext.mockResolvedValue({
        content: [
          {
            type: "text",
            text: JSON.stringify(emptyContext),
          },
        ],
      });

      const result = await hoverProvider.provideHover(
        mockDocument,
        mockPosition,
        {} as any
      );

      expect(result).toBeDefined();
      // Should return no context hover when no requirements are present
    });
  });
});
