import { Plan } from "@prisma/client";

export interface LoaderData {
  currentPlan: string | null;
  shop: string;
  plans: Plan[];
  currentSubscription: any | null;
  interval: string | null;
  session: any;
}

export const yearlyDiscount = 20; // 17% discount

export const getYearlyPriceFormatted = (monthlyPrice: number) => {
  return monthlyPrice * 12 * (1 - yearlyDiscount / 100);
};

export // Helper function for yearly price calculation
function getYearlyPrice(monthlyPrice: number): number {
  return monthlyPrice * 12 * (1 - yearlyDiscount / 100);
}
