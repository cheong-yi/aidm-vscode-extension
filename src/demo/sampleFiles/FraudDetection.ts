/**
 * Fraud Detection Service
 * Mock implementation for demo purposes
 */

// Model imports removed - REF-006
// import { FraudScore } from "../../models/Payment";

// Temporary type definition until demo files are removed
type FraudScore = any;

export class FraudDetection {
  async analyzeTransaction(transactionData: {
    customerId: string;
    amount: number;
    currency: string;
    paymentMethod: string;
    merchantId: string;
    timestamp: Date;
    metadata?: Record<string, any>;
  }): Promise<FraudScore> {
    // Mock fraud detection logic
    let score = 0;
    const riskFactors: string[] = [];

    // Check amount
    if (transactionData.amount > 5000) {
      score += 30;
      riskFactors.push("High transaction amount");
    }

    // Check time patterns
    const hour = transactionData.timestamp.getHours();
    if (hour < 6 || hour > 22) {
      score += 20;
      riskFactors.push("Unusual transaction time");
    }

    // Mock additional risk factors
    if (Math.random() > 0.8) {
      score += 25;
      riskFactors.push("Unusual merchant category");
    }

    const riskLevel: "LOW" | "MEDIUM" | "HIGH" =
      score > 70 ? "HIGH" : score > 40 ? "MEDIUM" : "LOW";

    return {
      score,
      riskLevel,
      riskFactors,
    };
  }
}
