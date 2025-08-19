/**
 * Payment Models
 * Type definitions for payment-related entities
 */

export interface PaymentMethod {
  type: "CREDIT_CARD" | "ACH" | "WIRE_TRANSFER" | "DIGITAL_WALLET";
  cardNumber?: string;
  accountNumber?: string;
  routingNumber?: string;
  walletId?: string;
}

export interface Transaction {
  id: string;
  customerId: string;
  merchantId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  status: "PENDING" | "COMPLETED" | "FAILED" | "CANCELLED";
  fraudScore?: FraudScore;
  timestamp: Date;
  gatewayTransactionId?: string;
  metadata?: Record<string, any>;
}

export interface PaymentResult {
  success: boolean;
  transactionId: string;
  gatewayTransactionId?: string;
  processingTime?: number;
  amount?: number;
  currency?: string;
  error?: string;
  requiresManualReview?: boolean;
  estimatedSettlement?: Date;
  fraudScore?: FraudScore;
  complianceFlags?: {
    pciCompliant: boolean;
    fraudChecked: boolean;
    auditLogged: boolean;
  };
}

export interface FraudScore {
  score: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  riskFactors: string[];
}
