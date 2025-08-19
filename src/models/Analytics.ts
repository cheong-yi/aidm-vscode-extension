/**
 * Analytics Models
 * Type definitions for analytics and dashboard entities
 */

export interface AnalyticsData {
  userId: string;
  timeRange: string;
  generatedAt: Date;
  widgets: DashboardWidget[];
  predictions: PredictiveInsight[];
  userMetrics: UserMetrics;
  performance: {
    cacheHit: boolean;
    generationTime: number;
  };
}

export interface DashboardWidget {
  id: string;
  type: "CHART" | "METRIC" | "LIST" | "TABLE";
  title: string;
  data: any;
  accessibility: {
    altText: string;
    keyboardNavigable: boolean;
    screenReaderDescription: string;
  };
}

export interface PredictiveInsight {
  type:
    | "CHURN_RISK"
    | "SPENDING_FORECAST"
    | "PRODUCT_RECOMMENDATIONS"
    | "RISK_ASSESSMENT";
  confidence: number;
  prediction: any;
  description: string;
  actionable: boolean;
  recommendations: string[];
}

export interface UserMetrics {
  userId: string;
  generatedAt: Date;
  activity: {
    totalSessions: number;
    averageSessionDuration: number;
    lastActiveDate: Date;
    deviceTypes: Record<string, number>;
  };
  transactions: {
    totalAmount: number;
    transactionCount: number;
    averageTransactionValue: number;
    topCategories: Record<string, number>;
  };
  engagement: {
    loginFrequency: string;
    featureUsage: Record<string, number>;
    supportTickets: number;
    satisfactionScore: number;
  };
  accessibility: {
    preferredFontSize: string;
    highContrastMode: boolean;
    screenReaderOptimized: boolean;
    keyboardNavigation: boolean;
  };
}
