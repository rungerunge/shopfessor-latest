import { useState, useEffect } from "react";
import {
  json,
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
} from "@remix-run/node";
import {
  useLoaderData,
  useSubmit,
  useNavigation,
  useFetcher,
} from "@remix-run/react";
import {
  Page,
  Layout,
  Button,
  InlineStack,
  Box,
  Grid,
  Frame,
} from "@shopify/polaris";
import { authenticate } from "../lib/shopify.server";
import { LoaderData, yearlyDiscount } from "app/utils/billing";
import { verifyCoupon } from "app/services/coupon.server";
import { createSubscription } from "app/services/billing.server";
import {
  handleActionError,
  createSuccessResponse,
} from "app/utils/error-handling.server";
import type { AppliedCouponData } from "app/types/coupon";
import prisma from "app/lib/db.server";
import { useAppBridge } from "@shopify/app-bridge-react";
import { getCurrentSubscriptions } from "app/services/billing.server";
import { PricingCard } from "app/components/Features/Billing/Reccuring/PricingCard";
import { PromoCard } from "app/components/Features/Billing/Reccuring/PromoCard";

// Loader function
export async function loader({ request }: LoaderFunctionArgs) {
  const { admin, session } = await authenticate.admin(request);

  // Get user and shop
  const shop = await prisma.shop.findUnique({
    where: { shop: session.shop },
  });

  if (!shop) {
    throw new Error("Shop not found");
  }

  const plans = await prisma.plan.findMany({
    where: { isActive: true },
    orderBy: {
      createdAt: "asc",
    },
  });

  let currentPlan = null;
  let currentSubscription = null;
  let interval: "monthly" | "yearly" | null = null;

  // Check for active subscription in database
  const activeSubscription = await prisma.subscription.findFirst({
    where: {
      shopId: shop.id,
      status: "ACTIVE",
    },
    include: {
      plan: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (activeSubscription) {
    currentSubscription = activeSubscription;
    currentPlan = activeSubscription.plan?.name || activeSubscription.name;

    // Map BillingInterval enum to our format
    switch (activeSubscription.interval) {
      case "ANNUAL":
        interval = "yearly";
        break;
      case "MONTHLY":
      case "EVERY_30_DAYS":
        interval = "monthly";
        break;
    }
  }
  // else {
  // Fallback to GraphQL check if no local subscription found
  // try {
  const { subscriptions, errors } = await getCurrentSubscriptions(request);

  if (subscriptions.length > 0) {
    const subscription = subscriptions[0];
    currentPlan = subscription.name;

    // Get the billing interval from GraphQL
    if (subscription.lineItems[0].plan.pricingDetails.interval === "ANNUAL") {
      interval = "yearly";
    } else if (
      subscription.lineItems[0].plan.pricingDetails.interval === "EVERY_30_DAYS"
    ) {
      interval = "monthly";
    }
  }
  // } catch (error) {
  //   console.error("Error fetching subscription from GraphQL:", error);
  // }
  // }

  return json<LoaderData>({
    currentPlan,
    shop: session.shop,
    plans: plans,
    currentSubscription,
    interval,
  });
}

// Action function to handle both subscriptions and coupon verification
export async function action({ request }: ActionFunctionArgs) {
  const { admin, redirect, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const actionType = formData.get("_action") as string;

  // Handle coupon verification
  if (actionType === "verify_coupon") {
    const code = formData.get("code") as string;
    const planId = formData.get("plan") as string;
    const billingCycle = formData.get("billingCycle") as "monthly" | "yearly";

    try {
      const result = await verifyCoupon(session, code, planId, {
        cycle: billingCycle,
        type: "SUBSCRIPTION",
      });

      if (!result.success) {
        return json(result, { status: 400 });
      }

      return createSuccessResponse({
        code: result.data!.code,
        planId,
        message: result.data!.message,
        discountValue: result.data!.discountValue,
        discountType: result.data!.discountType,
      });
    } catch (error) {
      return handleActionError(error, "coupon verification");
    }
  }

  // Handle subscription creation
  if (actionType === "create_subscription") {
    const planId = formData.get("planId") as string;
    const billingCycle = formData.get("billingCycle") as "monthly" | "yearly";
    const couponCode = formData.get("couponCode") as string;

    // try {
    const confirmationUrl = await createSubscription({
      request,
      session,
      planId,
      billingCycle,
      couponCode,
    });

    if (!confirmationUrl) {
      return handleActionError(
        "Subscription creation failed",
        "create_subscription",
      );
    }

    return redirect(confirmationUrl, { target: "_top" });
    // } catch (error) {
    //   return handleActionError(error, "create_subscription");
    // }
  }

  return json({ error: "Invalid action" }, { status: 400 });
}

export default function BillingPage() {
  const { currentPlan, plans, interval } = useLoaderData<typeof loader>();

  const submit = useSubmit();
  const navigation = useNavigation();
  const couponFetcher = useFetcher();
  const shopify = useAppBridge();

  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">(
    interval || "monthly",
  );
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [couponError, setCouponError] = useState("");
  const [couponMessage, setCouponMessage] = useState(null);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCouponData | null>(
    null,
  );
  const isLoading = navigation.state === "submitting";
  const isCouponLoading = couponFetcher.state === "submitting";

  // Handle coupon verification response
  useEffect(() => {
    if (couponFetcher.data && couponFetcher.state === "idle") {
      if (couponFetcher.data.success) {
        setAppliedCoupon(couponFetcher.data.data);
        setCouponMessage(couponFetcher.data.data.message);
        shopify.toast.show(couponFetcher.data.data.message);
      } else {
        setCouponError(couponFetcher.data.error);
        setAppliedCoupon(null);
        shopify.toast.show(couponFetcher.data.error);
      }
    }
  }, [couponFetcher.data, couponFetcher.state]);

  const handlePromoSubmit = ({
    code,
    plan,
  }: {
    code: string;
    plan: string;
  }) => {
    const formData = new FormData();
    formData.append("_action", "verify_coupon");
    formData.append("code", code);
    formData.append("plan", plan);
    formData.append("billingCycle", billingCycle);

    couponFetcher.submit(formData, { method: "post" });
  };

  const handleSubscribe = (planId: string) => {
    setSelectedPlan(planId);
    const formData = new FormData();
    formData.append("_action", "create_subscription");
    formData.append("planId", planId);
    formData.append("billingCycle", billingCycle);

    // Include coupon code if available
    if (appliedCoupon) {
      formData.append("couponCode", appliedCoupon.code);
    }

    submit(formData, { method: "post" });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price);
  };

  const calculateDiscountedPrice = (originalPrice: number) => {
    if (!appliedCoupon) return originalPrice;

    if (appliedCoupon.discountType === "percentage") {
      return originalPrice * (1 - appliedCoupon.discountValue / 100);
    } else if (appliedCoupon.discountType === "fixed") {
      return Math.max(0, originalPrice - appliedCoupon.discountValue);
    }

    return originalPrice;
  };

  // Calculate default yearly discount percentage
  const defaultYearlyDiscountPercent = yearlyDiscount || 20;

  return (
    <Frame>
      <Page
        title="Billing"
        backAction={{ content: "Settings", url: "/app/billing" }}
      >
        <Layout>
          <Layout.Section>
            <PromoCard
              plans={plans}
              onSubmit={handlePromoSubmit}
              isLoading={isCouponLoading}
              error={couponError}
              onErrorChange={setCouponError}
              message={couponMessage}
              onRemoveCoupon={() => {
                setCouponMessage(null);
                setAppliedCoupon(null);
              }}
            />
          </Layout.Section>

          {/* Billing Cycle Toggle */}
          <Layout.Section>
            <Box padding={"200"}>
              <InlineStack blockAlign="center" gap="400">
                <Box
                  background="bg-fill-disabled"
                  padding={"100"}
                  borderRadius="200"
                >
                  <InlineStack gap="100">
                    <Button
                      onClick={() => setBillingCycle("monthly")}
                      variant={
                        billingCycle == "monthly" ? "secondary" : "tertiary"
                      }
                    >
                      Pay Monthly
                    </Button>
                    <Button
                      onClick={() => setBillingCycle("yearly")}
                      variant={
                        billingCycle === "yearly" ? "secondary" : "tertiary"
                      }
                    >
                      {`Pay Annual (Save ${defaultYearlyDiscountPercent}%)`}
                    </Button>
                  </InlineStack>
                </Box>
              </InlineStack>
            </Box>
          </Layout.Section>

          {/* Pricing Plans */}
          <Layout.Section>
            <Grid
              columns={{ xs: 1, sm: 1, md: 3, lg: 3, xl: 3 }}
              gap={{ xs: "400" }}
            >
              {plans.map((plan) => {
                const isCurrentPlan =
                  currentPlan === plan.name && interval === billingCycle;

                // Calculate prices based on billing cycle and new schema
                const monthlyPrice = plan.monthlyPrice
                  ? Number(plan.monthlyPrice)
                  : 0;
                const yearlyPrice = plan.yearlyPrice
                  ? Number(plan.yearlyPrice)
                  : 0;
                const yearlyDiscountDecimal = plan.yearlyDiscount
                  ? Number(plan.yearlyDiscount)
                  : 0;

                // Calculate display prices
                let displayPrice: number;
                let originalPrice: number;
                let hasYearlyDiscount = false;

                if (billingCycle === "monthly") {
                  displayPrice = monthlyPrice;
                  originalPrice = monthlyPrice;
                } else {
                  // For yearly billing
                  if (yearlyPrice > 0) {
                    // Use explicit yearly price
                    displayPrice = yearlyPrice / 12; // Show as monthly equivalent
                    originalPrice = monthlyPrice;
                    hasYearlyDiscount = yearlyPrice < monthlyPrice * 12;
                  } else if (yearlyDiscountDecimal > 0) {
                    // Calculate from monthly price with discount
                    const baseYearlyPrice = monthlyPrice * 12;
                    const discountedYearlyPrice =
                      baseYearlyPrice * (1 - yearlyDiscountDecimal);
                    displayPrice = discountedYearlyPrice / 12;
                    originalPrice = monthlyPrice;
                    hasYearlyDiscount = true;
                  } else {
                    // No yearly discount
                    displayPrice = monthlyPrice;
                    originalPrice = monthlyPrice;
                  }
                }

                // Apply coupon discount if available
                const finalPrice = calculateDiscountedPrice(displayPrice);
                const hasCouponDiscount =
                  appliedCoupon && finalPrice < displayPrice;

                // Determine which badge to show (prioritize coupon over yearly discount)
                let discountBadge;
                if (hasCouponDiscount) {
                  discountBadge = appliedCoupon.message;
                } else if (hasYearlyDiscount) {
                  // Calculate discount percentage for display
                  const discountPercentage = Math.round(
                    ((originalPrice - displayPrice) / originalPrice) * 100,
                  );
                  discountBadge = `Save ${discountPercentage}% yearly`;
                }

                // Determine original price to show (for strikethrough)
                let showOriginalPrice;
                if (hasCouponDiscount) {
                  showOriginalPrice = formatPrice(displayPrice);
                } else if (hasYearlyDiscount) {
                  showOriginalPrice = formatPrice(originalPrice);
                }

                return (
                  <Grid.Cell key={plan.id}>
                    <PricingCard
                      title={plan.name}
                      description={plan.description}
                      featuredText={
                        plan.isFeatured ? "Most Popular" : undefined
                      }
                      features={plan.features}
                      price={formatPrice(finalPrice)}
                      originalPrice={showOriginalPrice}
                      frequency={billingCycle === "monthly" ? "month" : "year"}
                      discountBadge={!plan.isFree ? discountBadge : null}
                      button={{
                        content: isCurrentPlan
                          ? "Current Plan"
                          : isLoading && selectedPlan === plan.id
                            ? "Processing..."
                            : plan.isFree
                              ? "Free Plan"
                              : "Subscribe Now",
                        props: {
                          variant: plan.isFeatured ? "primary" : "secondary",
                          size: "large",
                          disabled: isCurrentPlan || isLoading || plan.isFree,
                          loading: isLoading && selectedPlan === plan.id,
                          onClick: () => {
                            if (!isCurrentPlan && !plan.isFree) {
                              handleSubscribe(plan.id);
                            }
                          },
                        },
                      }}
                    />
                  </Grid.Cell>
                );
              })}
            </Grid>
          </Layout.Section>
        </Layout>
      </Page>
    </Frame>
  );
}
