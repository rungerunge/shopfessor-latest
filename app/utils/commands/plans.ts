// Types for better developer experience
export type BillingType =
  | "subscription"
  | "one_time"
  | "usage_based"
  | "hybrid";
export type BillingInterval = "monthly" | "annual" | "every_30_days";

export interface PlanConfig {
  // Basic Plan Info
  name: string;
  description: string;
  features: string[];

  // Plan Settings
  isFeatured?: boolean;
  featuredText?: string;
  isFree?: boolean;
  isActive?: boolean;
  trialDays?: number;
  credits?: number;

  // Billing Configuration
  billingType: BillingType;
  currency: {
    symbol: string;
    code: string;
  };

  // Subscription Billing (for billingType: 'subscription' or 'hybrid')
  subscription?: {
    monthly?: number;
    annual?: number;
    yearlyDiscount?: number; // Percentage discount for annual billing
    intervals: BillingInterval[];
    buttonText?: string;
  };

  // One-time Billing (for billingType: 'one_time' or 'hybrid')
  oneTime?: {
    price: number;
    buttonText?: string;
    confirmationUrl?: string;
  };

  // Usage-based Billing (for billingType: 'usage_based' or 'hybrid')
  usage?: {
    basePrice?: number; // Monthly base fee
    pricePerUnit: number; // Price per API call, transaction, etc.
    cappedAmount?: number; // Maximum monthly charge
    unit: string; // 'API call', 'transaction', 'request', etc.
    terms: string;
    buttonText?: string;
  };
}

export const plansConfig: PlanConfig[] = [
  {
    name: "Free",
    description:
      "Perfect for new stores looking to kickstart their online presence",
    features: [
      "Basic API Access (limited endpoints)",
      "Up to 3 Vendors",
      "Up to 100 Products per Vendor",
      "Standard support via email",
      "Access to beginner tutorials",
    ],
    billingType: "usage_based",
    currency: {
      symbol: "$",
      code: "USD",
    },
    isFree: true,
    trialDays: 14,
    credits: 20,
    usage: {
      basePrice: 0,
      pricePerUnit: 0,
      cappedAmount: 100,
      unit: "API call",
      terms: "$0.10 per API call up to $100/month",
      buttonText: "Subscribe Now",
    },
  },
  {
    name: "Pro",
    description: "Tailored for established stores with growing needs",
    features: [
      "Extended API Access (additional endpoints)",
      "Unlimited Vendors",
      "Unlimited Products per Vendor",
      "Priority email support",
      "Advanced analytics dashboard",
    ],
    billingType: "hybrid", // Supports both subscription and usage
    currency: {
      symbol: "$",
      code: "USD",
    },
    isFeatured: true,
    featuredText: "Most Popular",
    trialDays: 14,
    credits: 200,
    subscription: {
      monthly: 99,
      annual: 950,
      yearlyDiscount: 20,
      intervals: ["monthly", "annual"],
      buttonText: "Subscribe Now",
    },
    usage: {
      basePrice: 99,
      pricePerUnit: 0.08,
      cappedAmount: 500,
      unit: "API call",
      terms: "$0.08 per API call up to $500/month",
      buttonText: "Subscribe Now",
    },
  },
  {
    name: "Ultimate",
    description:
      "The pinnacle plan for high-volume stores seeking top-tier features",
    features: [
      "Everything from Pro plan",
      "Dedicated account manager",
      "Customizable API endpoints",
      "24/7 VIP support",
      "Exclusive access to beta features",
    ],
    billingType: "hybrid",
    currency: {
      symbol: "$",
      code: "USD",
    },
    trialDays: 14,
    credits: 500,
    subscription: {
      monthly: 199,
      annual: 1900,
      yearlyDiscount: 20,
      intervals: ["monthly", "annual"],
      buttonText: "Subscribe Now",
    },
    usage: {
      basePrice: 199,
      pricePerUnit: 0.05,
      cappedAmount: 2000,
      unit: "API call",
      terms: "$0.05 per API call up to $2000/month",
      buttonText: "Subscribe Now",
    },
  },
  {
    name: "Enterprise Setup",
    description: "One-time setup fee for enterprise customers",
    features: [
      "Custom integration setup",
      "Data migration assistance",
      "Dedicated onboarding specialist",
      "Custom API endpoints setup",
      "30-day priority support",
    ],
    billingType: "one_time",
    currency: {
      symbol: "$",
      code: "USD",
    },
    oneTime: {
      price: 499,
      buttonText: "Purchase Setup",
      confirmationUrl: "/setup-complete",
    },
  },
];

// Helper functions for developers
export const getPlanByName = (name: string): PlanConfig | undefined => {
  return plansConfig.find((plan) => plan.name === name);
};

export const getSubscriptionPlans = (): PlanConfig[] => {
  return plansConfig.filter(
    (plan) =>
      plan.billingType === "subscription" || plan.billingType === "hybrid",
  );
};

export const getOneTimePlans = (): PlanConfig[] => {
  return plansConfig.filter(
    (plan) => plan.billingType === "one_time" || plan.billingType === "hybrid",
  );
};

export const getUsageBasedPlans = (): PlanConfig[] => {
  return plansConfig.filter(
    (plan) =>
      plan.billingType === "usage_based" || plan.billingType === "hybrid",
  );
};

export const getFeaturedPlans = (): PlanConfig[] => {
  return plansConfig.filter((plan) => plan.isFeatured);
};

// Calculate pricing helpers
export const calculateAnnualSavings = (plan: PlanConfig): number => {
  if (!plan.subscription?.monthly || !plan.subscription?.annual) return 0;
  const monthlyTotal = plan.subscription.monthly * 12;
  return monthlyTotal - plan.subscription.annual;
};

export const getAnnualMonthlyPrice = (plan: PlanConfig): number => {
  if (!plan.subscription?.annual) return 0;
  return Math.round(plan.subscription.annual / 12);
};

// Validation helper
export const validatePlanConfig = (plan: PlanConfig): string[] => {
  const errors: string[] = [];

  if (!plan.name) errors.push("Plan name is required");
  if (!plan.description) errors.push("Plan description is required");
  if (!plan.features.length) errors.push("At least one feature is required");

  // Validate billing type specific fields
  if (plan.billingType === "subscription" || plan.billingType === "hybrid") {
    if (!plan.subscription)
      errors.push("Subscription config is required for subscription billing");
    else if (!plan.subscription.monthly && !plan.subscription.annual) {
      errors.push(
        "At least one subscription price (monthly/annual) is required",
      );
    }
  }

  if (plan.billingType === "one_time" || plan.billingType === "hybrid") {
    if (!plan.oneTime)
      errors.push("One-time config is required for one-time billing");
    else if (!plan.oneTime.price) errors.push("One-time price is required");
  }

  if (plan.billingType === "usage_based" || plan.billingType === "hybrid") {
    if (!plan.usage)
      errors.push("Usage config is required for usage-based billing");
    else if (plan.usage.pricePerUnit === undefined)
      errors.push("Price per unit is required");
  }

  return errors;
};

// Export for backward compatibility
export const plansData = plansConfig.map((plan) => ({
  name: plan.name,
  description: plan.description,
  features: plan.features,
  pricing: {
    monthly: plan.subscription?.monthly || 0,
    annual: plan.subscription?.annual || 0,
    annualMonthly: getAnnualMonthlyPrice(plan),
  },
  currencySymbol: plan.currency.symbol,
  currencyCode: plan.currency.code,
  isFeatured: plan.isFeatured || false,
  featuredText: plan.featuredText,
  isFree: plan.isFree || false,
  trialDays: plan.trialDays || 0,
  buttonText:
    plan.subscription?.buttonText ||
    plan.oneTime?.buttonText ||
    plan.usage?.buttonText ||
    "Get Started",
  credits: plan.credits,
  cappedAmount: plan.usage?.cappedAmount || 0,
  terms: plan.usage?.terms || "Standard billing terms",
}));
