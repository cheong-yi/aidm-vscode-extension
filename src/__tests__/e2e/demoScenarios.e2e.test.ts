/**
 * End-to-End Tests for Demo Scenarios
 * Tests complete user workflows from hover to business context display
 */

import * as vscode from "vscode";
import { BusinessContextHover } from "../../providers/hoverProvider";
import { MCPClient } from "../../client/mcpClient";
import { MockDataProvider } from "../../mock/MockDataProvider";
import { ProcessManager } from "../../server/ProcessManager";
import { getNextAvailablePort } from "../utils/testPorts";

describe("Demo Scenarios E2E Tests", () => {
  let hoverProvider: BusinessContextHover;
  let mcpClient: MCPClient;
  let mockDataProvider: MockDataProvider;
  let processManager: ProcessManager;
  let testDocument: vscode.TextDocument;

  beforeAll(async () => {
    // Initialize test environment
    const testPort = getNextAvailablePort();
    processManager = new ProcessManager({
      port: testPort,
      timeout: 5000,
      retryAttempts: 3,
      maxConcurrentRequests: 10,
      mock: {
        enabled: true,
        dataSize: "medium",
        enterprisePatterns: true,
      },
    });

    // Start MCP server for testing
    await processManager.start();

    mcpClient = new MCPClient(3001, 5000);
    hoverProvider = new BusinessContextHover(mcpClient);

    // Initialize mock data provider with comprehensive enterprise scenarios
    mockDataProvider = new MockDataProvider({
      dataSize: "large",
      enterprisePatterns: true,
      scenarioComplexity: "advanced",
      includeComplianceData: true,
      industryVertical: "financial-services",
      responseDelay: 50,
      errorRate: 0,
    });
  });

  afterAll(async () => {
    if (processManager) {
      await processManager.shutdown();
    }
  });

  describe("Enterprise User Authentication Scenario", () => {
    beforeEach(async () => {
      // Create test document with authentication code
      const authServiceContent = `
/**
 * User Authentication Service
 * Implements secure multi-factor authentication
 */
export class AuthService {
  /**
   * Authenticate user with MFA support
   * Business Context: REQ-001 User Authentication System
   */
  async authenticateUser(username: string, password: string): Promise<AuthResult> {
    // Validate credentials
    const isValid = await this.validateCredentials(username, password);
    
    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    // Check MFA requirements
    const user = await this.getUserByUsername(username);
    if (user.mfaEnabled) {
      return this.initiateMFAChallenge(user);
    }

    return this.generateSessionToken(user);
  }

  private async validateCredentials(username: string, password: string): Promise<boolean> {
    // Implementation details...
    return true;
  }
}`;

      testDocument = await vscode.workspace.openTextDocument({
        content: authServiceContent,
        language: "typescript",
      });
    });

    it("should display comprehensive business context for authentication method", async () => {
      // Test hovering over the authenticateUser method
      const position = new vscode.Position(8, 15); // Position on 'authenticateUser'

      const hover = await hoverProvider.provideHover(
        testDocument,
        position,
        new vscode.CancellationToken()
      );

      expect(hover).toBeDefined();
      expect(hover?.contents).toBeDefined();

      const content = hover!.contents[0] as vscode.MarkdownString;
      expect(content.value).toContain("Enterprise Business Context");
      expect(content.value).toContain("User Authentication System");
      expect(content.value).toContain("Quick Summary");
      expect(content.value).toContain("Business Requirements");
      expect(content.value).toContain("Implementation Status");
    });

    it("should show progress bars and status indicators", async () => {
      const position = new vscode.Position(8, 15);

      const hover = await hoverProvider.provideHover(
        testDocument,
        position,
        new vscode.CancellationToken()
      );

      const content = hover!.contents[0] as vscode.MarkdownString;
      expect(content.value).toContain("progress");
      expect(content.value).toContain("%");
      expect(content.value).toContain("background-color");
      expect(content.value).toContain("border-radius");
    });

    it("should include compliance and security tags", async () => {
      const position = new vscode.Position(8, 15);

      const hover = await hoverProvider.provideHover(
        testDocument,
        position,
        new vscode.CancellationToken()
      );

      const content = hover!.contents[0] as vscode.MarkdownString;
      expect(content.value).toContain("security");
      expect(content.value).toContain("compliance");
      expect(content.value).toContain("authentication");
    });

    it("should display stakeholder information", async () => {
      const position = new vscode.Position(8, 15);

      const hover = await hoverProvider.provideHover(
        testDocument,
        position,
        new vscode.CancellationToken()
      );

      const content = hover!.contents[0] as vscode.MarkdownString;
      expect(content.value).toContain("Stakeholders");
      expect(content.value).toContain("Security Team");
    });

    it("should respond within performance threshold", async () => {
      const position = new vscode.Position(8, 15);
      const startTime = Date.now();

      const hover = await hoverProvider.provideHover(
        testDocument,
        position,
        new vscode.CancellationToken()
      );

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(200); // 200ms threshold
      expect(hover).toBeDefined();
    });
  });

  describe("Payment Processing Scenario", () => {
    beforeEach(async () => {
      const paymentProcessorContent = `
/**
 * Payment Processor
 * Handles secure payment processing with PCI DSS compliance
 */
export class PaymentProcessor {
  /**
   * Process payment with fraud detection
   * Business Context: REQ-002 Payment Processing Integration
   */
  async processPayment(paymentData: PaymentRequest): Promise<PaymentResult> {
    // Encrypt sensitive payment data
    const encryptedData = await this.encryptPaymentData(paymentData);
    
    // Run fraud detection
    const fraudScore = await this.fraudDetection.analyze(paymentData);
    
    if (fraudScore.riskLevel === 'HIGH') {
      throw new Error('Transaction blocked due to fraud detection');
    }

    // Process payment through gateway
    return this.processWithGateway(encryptedData);
  }

  private async encryptPaymentData(data: PaymentRequest): Promise<EncryptedPaymentData> {
    // PCI DSS compliant encryption
    return this.encryptionService.encrypt(data);
  }
}`;

      testDocument = await vscode.workspace.openTextDocument({
        content: paymentProcessorContent,
        language: "typescript",
      });
    });

    it("should display payment processing business context", async () => {
      const position = new vscode.Position(8, 15); // Position on 'processPayment'

      const hover = await hoverProvider.provideHover(
        testDocument,
        position,
        new vscode.CancellationToken()
      );

      expect(hover).toBeDefined();
      const content = hover!.contents[0] as vscode.MarkdownString;
      expect(content.value).toContain("Payment Processing Integration");
      expect(content.value).toContain("PCI DSS");
      expect(content.value).toContain("fraud detection");
    });

    it("should show financial services compliance tags", async () => {
      const position = new vscode.Position(8, 15);

      const hover = await hoverProvider.provideHover(
        testDocument,
        position,
        new vscode.CancellationToken()
      );

      const content = hover!.contents[0] as vscode.MarkdownString;
      expect(content.value).toContain("financial-services");
      expect(content.value).toContain("pci-dss");
      expect(content.value).toContain("sox");
    });
  });

  describe("Dashboard Analytics Scenario", () => {
    beforeEach(async () => {
      const dashboardContent = `
/**
 * Dashboard Analytics
 * Real-time analytics with ML-powered insights
 */
export class DashboardAnalytics {
  /**
   * Generate dashboard analytics with ML insights
   * Business Context: REQ-005 Customer Dashboard, REQ-010 Machine Learning Pipeline
   */
  async generateAnalytics(userId: string): Promise<AnalyticsData> {
    // Fetch user data
    const userData = await this.getUserData(userId);
    
    // Generate ML predictions
    const predictions = await this.mlService.generateInsights(userData);
    
    // Create accessible dashboard widgets
    return this.createAccessibleDashboard(userData, predictions);
  }

  private async createAccessibleDashboard(data: UserData, predictions: MLInsights): Promise<AnalyticsData> {
    // WCAG 2.1 AA compliant dashboard generation
    return this.dashboardBuilder.build(data, predictions);
  }
}`;

      testDocument = await vscode.workspace.openTextDocument({
        content: dashboardContent,
        language: "typescript",
      });
    });

    it("should display dashboard and ML pipeline requirements", async () => {
      const position = new vscode.Position(8, 15); // Position on 'generateAnalytics'

      const hover = await hoverProvider.provideHover(
        testDocument,
        position,
        new vscode.CancellationToken()
      );

      expect(hover).toBeDefined();
      const content = hover!.contents[0] as vscode.MarkdownString;
      expect(content.value).toContain("Customer Dashboard");
      expect(content.value).toContain("Machine Learning Pipeline");
      expect(content.value).toContain("analytics");
      expect(content.value).toContain("accessibility");
    });

    it("should show WCAG compliance information", async () => {
      const position = new vscode.Position(8, 15);

      const hover = await hoverProvider.provideHover(
        testDocument,
        position,
        new vscode.CancellationToken()
      );

      const content = hover!.contents[0] as vscode.MarkdownString;
      expect(content.value).toContain("WCAG 2.1 AA");
      expect(content.value).toContain("accessibility");
    });
  });

  describe("Error Handling and Fallback Scenarios", () => {
    it("should handle MCP server unavailable gracefully", async () => {
      // Temporarily stop the MCP server
      await processManager.shutdown();

      const position = new vscode.Position(5, 10);

      const hover = await hoverProvider.provideHover(
        testDocument,
        position,
        new vscode.CancellationToken()
      );

      expect(hover).toBeDefined();
      const content = hover!.contents[0] as vscode.MarkdownString;
      expect(content.value).toContain("Connection Error");
      expect(content.value).toContain("Unable to connect to the MCP server");

      // Restart server for other tests
      await processManager.start();
    });

    it("should handle timeout scenarios", async () => {
      // Create a client with very short timeout
      const shortTimeoutClient = new MCPClient(3001, 1); // 1ms timeout
      const shortTimeoutProvider = new BusinessContextHover(shortTimeoutClient);

      const position = new vscode.Position(5, 10);

      const hover = await shortTimeoutProvider.provideHover(
        testDocument,
        position,
        new vscode.CancellationToken()
      );

      expect(hover).toBeDefined();
      const content = hover!.contents[0] as vscode.MarkdownString;
      expect(content.value).toContain("Timeout Error");
    });

    it("should handle no context available gracefully", async () => {
      // Create document with no business context mappings
      const simpleContent = `
// Simple utility function with no business context
function add(a: number, b: number): number {
  return a + b;
}`;

      const simpleDocument = await vscode.workspace.openTextDocument({
        content: simpleContent,
        language: "typescript",
      });

      const position = new vscode.Position(2, 10);

      const hover = await hoverProvider.provideHover(
        simpleDocument,
        position,
        new vscode.CancellationToken()
      );

      expect(hover).toBeDefined();
      const content = hover!.contents[0] as vscode.MarkdownString;
      expect(content.value).toContain("No business context available");
      expect(content.value).toContain("utility functions");
    });
  });

  describe("Configuration-Based Scenarios", () => {
    it("should adapt to different industry verticals", async () => {
      // Test healthcare industry configuration
      const healthcareProvider = new MockDataProvider({
        industryVertical: "healthcare",
        includeComplianceData: true,
        scenarioComplexity: "advanced",
      });

      const requirements = healthcareProvider.getAllRequirements();
      const healthcareReqs = requirements.filter(
        (req) => req.tags.includes("healthcare") || req.tags.includes("hipaa")
      );

      expect(healthcareReqs.length).toBeGreaterThan(0);
      expect(healthcareReqs.some((req) => req.tags.includes("hipaa"))).toBe(
        true
      );
    });

    it("should adapt to different complexity levels", async () => {
      const basicProvider = new MockDataProvider({
        scenarioComplexity: "basic",
        dataSize: "small",
      });

      const advancedProvider = new MockDataProvider({
        scenarioComplexity: "advanced",
        dataSize: "large",
      });

      const basicReqs = basicProvider.getAllRequirements();
      const advancedReqs = advancedProvider.getAllRequirements();

      expect(advancedReqs.length).toBeGreaterThan(basicReqs.length);
      expect(
        advancedReqs.some((req) => req.tags.includes("machine-learning"))
      ).toBe(true);
    });

    it("should include compliance data when configured", async () => {
      const complianceProvider = new MockDataProvider({
        includeComplianceData: true,
        industryVertical: "financial-services",
      });

      const requirements = complianceProvider.getAllRequirements();
      const complianceReqs = requirements.filter((req) =>
        req.tags.some((tag) => ["sox", "pci-dss", "gdpr", "ccpa"].includes(tag))
      );

      expect(complianceReqs.length).toBeGreaterThan(0);
    });
  });

  describe("Performance and Scalability", () => {
    it("should handle multiple concurrent hover requests", async () => {
      const positions = [
        new vscode.Position(5, 10),
        new vscode.Position(10, 15),
        new vscode.Position(15, 20),
        new vscode.Position(20, 25),
        new vscode.Position(25, 30),
      ];

      const startTime = Date.now();

      const hoverPromises = positions.map((pos) =>
        hoverProvider.provideHover(
          testDocument,
          pos,
          new vscode.CancellationToken()
        )
      );

      const hovers = await Promise.all(hoverPromises);

      const totalTime = Date.now() - startTime;

      // All requests should complete
      expect(hovers.every((hover) => hover !== null)).toBe(true);

      // Total time should be reasonable for concurrent requests
      expect(totalTime).toBeLessThan(1000); // 1 second for 5 concurrent requests
    });

    it("should maintain performance with large datasets", async () => {
      const largeDataProvider = new MockDataProvider({
        dataSize: "large",
        scenarioComplexity: "advanced",
        enterprisePatterns: true,
      });

      const position = new vscode.Position(8, 15);
      const startTime = Date.now();

      const hover = await hoverProvider.provideHover(
        testDocument,
        position,
        new vscode.CancellationToken()
      );

      const responseTime = Date.now() - startTime;

      expect(hover).toBeDefined();
      expect(responseTime).toBeLessThan(500); // Should still be fast with large dataset
    });
  });

  describe("Accessibility and User Experience", () => {
    it("should generate accessible hover content", async () => {
      const position = new vscode.Position(8, 15);

      const hover = await hoverProvider.provideHover(
        testDocument,
        position,
        new vscode.CancellationToken()
      );

      const content = hover!.contents[0] as vscode.MarkdownString;

      // Check for accessibility features
      expect(content.value).toContain("alt="); // Alt text for images/icons
      expect(content.value).toContain("aria-"); // ARIA attributes
      expect(content.supportHtml).toBe(true); // HTML support for better formatting
    });

    it("should provide helpful navigation hints", async () => {
      const position = new vscode.Position(8, 15);

      const hover = await hoverProvider.provideHover(
        testDocument,
        position,
        new vscode.CancellationToken()
      );

      const content = hover!.contents[0] as vscode.MarkdownString;
      expect(content.value).toContain("Ctrl+Click");
      expect(content.value).toContain("navigate");
    });

    it("should format content for readability", async () => {
      const position = new vscode.Position(8, 15);

      const hover = await hoverProvider.provideHover(
        testDocument,
        position,
        new vscode.CancellationToken()
      );

      const content = hover!.contents[0] as vscode.MarkdownString;

      // Check for proper formatting
      expect(content.value).toContain("border-radius"); // Rounded corners
      expect(content.value).toContain("padding"); // Proper spacing
      expect(content.value).toContain("background-color"); // Visual separation
      expect(content.value).toContain("margin"); // Layout spacing
    });
  });
});
