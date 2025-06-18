export const GET_CURRENT_SUBSCRIPTIONS = `#graphql
 query GetCurrentSubscriptions {
          currentAppInstallation {
            activeSubscriptions {
              id
              name
              status
              createdAt
              currentPeriodEnd
              lineItems {
                id
                plan {
                  pricingDetails {
                    ... on AppRecurringPricing {
                      price {
                        amount
                        currencyCode
                      }
                      interval
                      discount {
                        durationLimitInIntervals
                        remainingDurationInIntervals
                        priceAfterDiscount {
                          amount
                          currencyCode
                        }
                        value {
                          __typename
                          ... on AppSubscriptionDiscountAmount {
                            amount {
                              amount
                              currencyCode
                            }
                          }
                          ... on AppSubscriptionDiscountPercentage {
                            percentage
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
    `;

// GraphQL Mutations
export const CREATE_USAGE_SUBSCRIPTION = `#graphql
  mutation CreateUsageSubscription(
    $name: String!,
    $returnUrl: URL!,
    $usageTerms: String!,
    $usageCappedAmount: Decimal!,
    $usageCurrencyCode: CurrencyCode!,
    $recurringAmount: Decimal!,
    $test: Boolean!,
    $recurringCurrencyCode: CurrencyCode!
  ) {
    appSubscriptionCreate(
      name: $name,
      returnUrl: $returnUrl,
      test: $test,
      lineItems: [
        {
          plan: {
            appUsagePricingDetails: {
              terms: $usageTerms,
              cappedAmount: {
                amount: $usageCappedAmount,
                currencyCode: $usageCurrencyCode
              }
            }
          }
        },
        {
          plan: {
            appRecurringPricingDetails: {
              price: {
                amount: $recurringAmount,
                currencyCode: $recurringCurrencyCode
              }
            }
          }
        }
      ]
    ) {
      userErrors {
        field,
        message
      },
      confirmationUrl,
      appSubscription {
        id,
        lineItems {
          id,
          plan {
            pricingDetails {
              __typename
            }
          }
        }
      }
    }
  }
`;

export const CANCEL_APP_SUBSCRIPTION = `#graphql
  mutation AppSubscriptionCancel($id: ID!) {
    appSubscriptionCancel(id: $id) {
      userErrors {
        field
        message
      }
      appSubscription {
        id
        status
      }
    }
  }
`;

export const APP_ONE_TIME_PURCHASE_CREATE = `#graphql
  mutation AppPurchaseOneTimeCreate(
    $name: String!,
    $price: MoneyInput!,
    $returnUrl: URL!
    $test: Boolean
  ) {
    appPurchaseOneTimeCreate(
      name: $name,
      returnUrl: $returnUrl,
      price: $price
      test: $test
    ) {
      userErrors {
        field
        message
      }
      appPurchaseOneTime {
        createdAt
        id
      }
      confirmationUrl
    }
  }
`;
