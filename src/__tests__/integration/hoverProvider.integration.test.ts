/**
 * Integration tests for Hover Provider
 */

import { BusinessContextHover } from "../../providers/hoverProvider";
import { MCPClient } from "../../client/mcpClient";

// Mock MCPClient for integration testing
jest.mock("../../client/mcpClient");

describe("BusinessContextHover Integration", () => {
  let hoverProvider: BusinessContextHover;
  let mockMCPClient: jest.Mocked<MCPClient>;

  beforeEach(() => {
    mockMCPClient = new MCPClient() as jest.Mocked<MCPClient>;
    hoverProvider = new BusinessContextHover(mockMCPClient);
  });

  describe("getSupportedLanguages", () => {
    it("should return TypeScript as supported language", () => {
      const languages = hoverProvider.getSupportedLanguages();
      expect(languages).toContain("typescript");
      expect(languages).toHaveLength(1);
    });
  });

  describe("basic functionality", () => {
    it("should be instantiable with MCP client", () => {
      expect(hoverProvider).toBeDefined();
      expect(hoverProvider.getSupportedLanguages).toBeDefined();
    });
  });
});
