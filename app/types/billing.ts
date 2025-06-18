export interface SubscriptionData {
  planName: string | null;
  status: string | null;
  cappedAmount: number;
  cappedCurrency: string;
  recurringAmount: number;
  recurringCurrency: string;
  usageTerms: string | null;
  currentPeriodEnd: string | null;
}

export interface MonthlyUsage {
  totalAmount: number;
  recordCount: number;
  cappedAmount: number;
  isNearCap: boolean;
  isOverCap: boolean;
}

export interface Plan {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  credits: number | null;
  isFeatured: boolean;
  isFree: boolean;
}

export interface PaginationData {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface LoaderData {
  shop: string;
  currentSubscription: any;
  usageLineItemId: string | null;
  subscriptionData: SubscriptionData;
  monthlyUsage: MonthlyUsage;
  plans: Plan[];
  usageRecords: any[];
  pagination: PaginationData;
}

export interface UsageActivity {
  id: string;
  name: string;
  description: string;
}

export interface Purchase {
  id: string;
  name: string;
  price: number;
  credits: number;
  createdAt: string;
  status: string;
}

export interface UsageStats {
  apiCallsUsed: number;
  apiCallsRemaining: number;
  totalCredits: number;
}

export interface BillingLoaderData {
  shop: string;
  currentUsage: UsageStats;
  recentPurchases: Purchase[];
  plans: Plan[];
}
