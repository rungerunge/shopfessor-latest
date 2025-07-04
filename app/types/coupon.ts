export interface Coupon {
  id: string;
  code: string;
  type: CouponType;
  discountAmount: number;
  percentage: number;
  active: boolean;
  expiry: Date | null;
  limit: number;
  shopLimit: number;
  applicablePlans: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CouponUsage {
  id: string;
  couponId: string;
  subscriptionId: string;
  usedAt: Date;
}

export interface Shop {
  id: string;
  shop: string;
  userId: string;
  user?: User;
}

export interface User {
  id: string;
  email: string;
  name: string;
}

export enum CouponType {
  FIXED = "FIXED",
  PERCENTAGE = "PERCENTAGE",
}

export interface CouponValidationResult {
  success: boolean;
  error?: string;
  message?: string;
  data?: {
    code: string;
    message: string;
    discountValue: number;
    discountType: CouponType;
  };
}

export interface AppliedCouponData {
  code: string;
  planId: string;
  message: string;
  discountValue: number;
  discountType: CouponType;
}

export interface BillingCycle {
  type: "monthly" | "yearly";
  interval: "EVERY_30_DAYS" | "ANNUAL";
}

export interface PlanConfig {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  features: string[];
  badge?: string;
  popular?: boolean;
}

export interface SubscriptionLineItem {
  plan: {
    appRecurringPricingDetails: {
      price: {
        amount: number;
        currencyCode: string;
      };
      interval: string;
    };
  };
}

export interface CreateSubscriptionParams {
  admin: any;
  session: any;
  planId: string;
  billingCycle: "monthly" | "yearly";
  couponCode?: string;
}

export interface SubscriptionResponse {
  userErrors: Array<{
    field: string;
    message: string;
  }>;
  appSubscription: {
    id: string;
    name: string;
    status: string;
    createdAt: string;
    test: boolean;
  };
  confirmationUrl: string;
}
