/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable eslint-comments/no-unlimited-disable */
/* eslint-disable */
import type * as AdminTypes from "./admin.types";

export type GetCurrentSubscriptionsQueryVariables = AdminTypes.Exact<{
  [key: string]: never;
}>;

export type GetCurrentSubscriptionsQuery = {
  currentAppInstallation: {
    activeSubscriptions: Array<
      Pick<
        AdminTypes.AppSubscription,
        "id" | "name" | "status" | "createdAt" | "currentPeriodEnd"
      > & {
        lineItems: Array<
          Pick<AdminTypes.AppSubscriptionLineItem, "id"> & {
            plan: {
              pricingDetails: Pick<
                AdminTypes.AppRecurringPricing,
                "interval"
              > & {
                price: Pick<AdminTypes.MoneyV2, "amount" | "currencyCode">;
                discount?: AdminTypes.Maybe<
                  Pick<
                    AdminTypes.AppSubscriptionDiscount,
                    "durationLimitInIntervals" | "remainingDurationInIntervals"
                  > & {
                    priceAfterDiscount: Pick<
                      AdminTypes.MoneyV2,
                      "amount" | "currencyCode"
                    >;
                    value:
                      | ({ __typename: "AppSubscriptionDiscountAmount" } & {
                          amount: Pick<
                            AdminTypes.MoneyV2,
                            "amount" | "currencyCode"
                          >;
                        })
                      | ({
                          __typename: "AppSubscriptionDiscountPercentage";
                        } & Pick<
                          AdminTypes.AppSubscriptionDiscountPercentage,
                          "percentage"
                        >);
                  }
                >;
              };
            };
          }
        >;
      }
    >;
  };
};

export type CreateUsageSubscriptionMutationVariables = AdminTypes.Exact<{
  name: AdminTypes.Scalars["String"]["input"];
  returnUrl: AdminTypes.Scalars["URL"]["input"];
  usageTerms: AdminTypes.Scalars["String"]["input"];
  usageCappedAmount: AdminTypes.Scalars["Decimal"]["input"];
  usageCurrencyCode: AdminTypes.CurrencyCode;
  recurringAmount: AdminTypes.Scalars["Decimal"]["input"];
  test: AdminTypes.Scalars["Boolean"]["input"];
  recurringCurrencyCode: AdminTypes.CurrencyCode;
}>;

export type CreateUsageSubscriptionMutation = {
  appSubscriptionCreate?: AdminTypes.Maybe<
    Pick<AdminTypes.AppSubscriptionCreatePayload, "confirmationUrl"> & {
      userErrors: Array<Pick<AdminTypes.UserError, "field" | "message">>;
      appSubscription?: AdminTypes.Maybe<
        Pick<AdminTypes.AppSubscription, "id"> & {
          lineItems: Array<
            Pick<AdminTypes.AppSubscriptionLineItem, "id"> & {
              plan: {
                pricingDetails: {
                  __typename: "AppRecurringPricing" | "AppUsagePricing";
                };
              };
            }
          >;
        }
      >;
    }
  >;
};

export type AppSubscriptionCancelMutationVariables = AdminTypes.Exact<{
  id: AdminTypes.Scalars["ID"]["input"];
}>;

export type AppSubscriptionCancelMutation = {
  appSubscriptionCancel?: AdminTypes.Maybe<{
    userErrors: Array<Pick<AdminTypes.UserError, "field" | "message">>;
    appSubscription?: AdminTypes.Maybe<
      Pick<AdminTypes.AppSubscription, "id" | "status">
    >;
  }>;
};

export type AppPurchaseOneTimeCreateMutationVariables = AdminTypes.Exact<{
  name: AdminTypes.Scalars["String"]["input"];
  price: AdminTypes.MoneyInput;
  returnUrl: AdminTypes.Scalars["URL"]["input"];
  test?: AdminTypes.InputMaybe<AdminTypes.Scalars["Boolean"]["input"]>;
}>;

export type AppPurchaseOneTimeCreateMutation = {
  appPurchaseOneTimeCreate?: AdminTypes.Maybe<
    Pick<AdminTypes.AppPurchaseOneTimeCreatePayload, "confirmationUrl"> & {
      userErrors: Array<Pick<AdminTypes.UserError, "field" | "message">>;
      appPurchaseOneTime?: AdminTypes.Maybe<
        Pick<AdminTypes.AppPurchaseOneTime, "createdAt" | "id">
      >;
    }
  >;
};

export type DiscountCodeBasicCreateMutationVariables = AdminTypes.Exact<{
  basicCodeDiscount: AdminTypes.DiscountCodeBasicInput;
}>;

export type DiscountCodeBasicCreateMutation = {
  discountCodeBasicCreate?: AdminTypes.Maybe<{
    codeDiscountNode?: AdminTypes.Maybe<
      Pick<AdminTypes.DiscountCodeNode, "id"> & {
        codeDiscount: Pick<
          AdminTypes.DiscountCodeBasic,
          | "title"
          | "startsAt"
          | "endsAt"
          | "status"
          | "usageLimit"
          | "appliesOncePerCustomer"
        > & {
          codes: { nodes: Array<Pick<AdminTypes.DiscountRedeemCode, "code">> };
          customerGets: {
            value:
              | (Pick<AdminTypes.DiscountAmount, "appliesOnEachItem"> & {
                  amount: Pick<AdminTypes.MoneyV2, "amount">;
                })
              | Pick<AdminTypes.DiscountPercentage, "percentage">;
          };
        };
      }
    >;
    userErrors: Array<
      Pick<AdminTypes.DiscountUserError, "field" | "code" | "message">
    >;
  }>;
};

export type DiscountCodeFreeShippingCreateMutationVariables = AdminTypes.Exact<{
  freeShippingCodeDiscount: AdminTypes.DiscountCodeFreeShippingInput;
}>;

export type DiscountCodeFreeShippingCreateMutation = {
  discountCodeFreeShippingCreate?: AdminTypes.Maybe<{
    codeDiscountNode?: AdminTypes.Maybe<
      Pick<AdminTypes.DiscountCodeNode, "id"> & {
        codeDiscount: Pick<
          AdminTypes.DiscountCodeFreeShipping,
          | "title"
          | "startsAt"
          | "endsAt"
          | "status"
          | "usageLimit"
          | "appliesOncePerCustomer"
        > & {
          maximumShippingPrice?: AdminTypes.Maybe<
            Pick<AdminTypes.MoneyV2, "amount">
          >;
          customerSelection: Pick<
            AdminTypes.DiscountCustomerAll,
            "allCustomers"
          >;
          destinationSelection: Pick<
            AdminTypes.DiscountCountryAll,
            "allCountries"
          >;
          minimumRequirement?: AdminTypes.Maybe<{
            greaterThanOrEqualToSubtotal: Pick<AdminTypes.MoneyV2, "amount">;
          }>;
          codes: { nodes: Array<Pick<AdminTypes.DiscountRedeemCode, "code">> };
        };
      }
    >;
    userErrors: Array<
      Pick<AdminTypes.DiscountUserError, "field" | "code" | "message">
    >;
  }>;
};

export type DiscountAutomaticBasicCreateMutationVariables = AdminTypes.Exact<{
  automaticBasicDiscount: AdminTypes.DiscountAutomaticBasicInput;
}>;

export type DiscountAutomaticBasicCreateMutation = {
  discountAutomaticBasicCreate?: AdminTypes.Maybe<{
    automaticDiscountNode?: AdminTypes.Maybe<
      Pick<AdminTypes.DiscountAutomaticNode, "id"> & {
        automaticDiscount: Pick<
          AdminTypes.DiscountAutomaticBasic,
          "title" | "startsAt" | "endsAt" | "status"
        > & {
          customerGets: {
            value:
              | (Pick<AdminTypes.DiscountAmount, "appliesOnEachItem"> & {
                  amount: Pick<AdminTypes.MoneyV2, "amount">;
                })
              | Pick<AdminTypes.DiscountPercentage, "percentage">;
          };
        };
      }
    >;
    userErrors: Array<
      Pick<AdminTypes.DiscountUserError, "field" | "code" | "message">
    >;
  }>;
};

export type DiscountAutomaticFreeShippingCreateMutationVariables =
  AdminTypes.Exact<{
    freeShippingAutomaticDiscount: AdminTypes.DiscountAutomaticFreeShippingInput;
  }>;

export type DiscountAutomaticFreeShippingCreateMutation = {
  discountAutomaticFreeShippingCreate?: AdminTypes.Maybe<{
    automaticDiscountNode?: AdminTypes.Maybe<
      Pick<AdminTypes.DiscountAutomaticNode, "id"> & {
        automaticDiscount: Pick<
          AdminTypes.DiscountAutomaticFreeShipping,
          "title" | "startsAt" | "endsAt" | "status"
        > & {
          maximumShippingPrice?: AdminTypes.Maybe<
            Pick<AdminTypes.MoneyV2, "amount">
          >;
          minimumRequirement?: AdminTypes.Maybe<{
            greaterThanOrEqualToSubtotal: Pick<AdminTypes.MoneyV2, "amount">;
          }>;
        };
      }
    >;
    userErrors: Array<
      Pick<AdminTypes.DiscountUserError, "field" | "code" | "message">
    >;
  }>;
};

export type GetDiscountsQueryVariables = AdminTypes.Exact<{
  first: AdminTypes.Scalars["Int"]["input"];
}>;

export type GetDiscountsQuery = {
  codeDiscountNodes: {
    nodes: Array<
      Pick<AdminTypes.DiscountCodeNode, "id"> & {
        codeDiscount:
          | { __typename: "DiscountCodeApp" | "DiscountCodeBxgy" }
          | ({ __typename: "DiscountCodeBasic" } & Pick<
              AdminTypes.DiscountCodeBasic,
              | "title"
              | "startsAt"
              | "endsAt"
              | "status"
              | "usageLimit"
              | "appliesOncePerCustomer"
            > & {
                codes: {
                  nodes: Array<Pick<AdminTypes.DiscountRedeemCode, "code">>;
                };
              })
          | ({ __typename: "DiscountCodeFreeShipping" } & Pick<
              AdminTypes.DiscountCodeFreeShipping,
              | "title"
              | "startsAt"
              | "endsAt"
              | "status"
              | "usageLimit"
              | "appliesOncePerCustomer"
            > & {
                codes: {
                  nodes: Array<Pick<AdminTypes.DiscountRedeemCode, "code">>;
                };
              });
      }
    >;
  };
  automaticDiscountNodes: {
    nodes: Array<
      Pick<AdminTypes.DiscountAutomaticNode, "id"> & {
        automaticDiscount:
          | { __typename: "DiscountAutomaticApp" | "DiscountAutomaticBxgy" }
          | ({ __typename: "DiscountAutomaticBasic" } & Pick<
              AdminTypes.DiscountAutomaticBasic,
              "title" | "startsAt" | "endsAt" | "status"
            >)
          | ({ __typename: "DiscountAutomaticFreeShipping" } & Pick<
              AdminTypes.DiscountAutomaticFreeShipping,
              "title" | "startsAt" | "endsAt" | "status"
            >);
      }
    >;
  };
};

export type GetProductMetafieldsQueryVariables = AdminTypes.Exact<{
  id: AdminTypes.Scalars["ID"]["input"];
}>;

export type GetProductMetafieldsQuery = {
  product?: AdminTypes.Maybe<{
    metafields: {
      edges: Array<{
        node: Pick<
          AdminTypes.Metafield,
          | "id"
          | "namespace"
          | "key"
          | "value"
          | "type"
          | "createdAt"
          | "updatedAt"
        >;
      }>;
    };
  }>;
};

export type MetafieldsSetMutationVariables = AdminTypes.Exact<{
  metafields:
    | Array<AdminTypes.MetafieldsSetInput>
    | AdminTypes.MetafieldsSetInput;
}>;

export type MetafieldsSetMutation = {
  metafieldsSet?: AdminTypes.Maybe<{
    metafields?: AdminTypes.Maybe<
      Array<
        Pick<
          AdminTypes.Metafield,
          | "id"
          | "key"
          | "namespace"
          | "value"
          | "type"
          | "createdAt"
          | "updatedAt"
          | "ownerType"
        >
      >
    >;
    userErrors: Array<
      Pick<AdminTypes.MetafieldsSetUserError, "field" | "message" | "code">
    >;
  }>;
};

export type MetafieldsDeleteMutationVariables = AdminTypes.Exact<{
  metafields:
    | Array<AdminTypes.MetafieldIdentifierInput>
    | AdminTypes.MetafieldIdentifierInput;
}>;

export type MetafieldsDeleteMutation = {
  metafieldsDelete?: AdminTypes.Maybe<{
    deletedMetafields?: AdminTypes.Maybe<
      Array<
        AdminTypes.Maybe<
          Pick<AdminTypes.MetafieldIdentifier, "key" | "namespace" | "ownerId">
        >
      >
    >;
    userErrors: Array<Pick<AdminTypes.UserError, "field" | "message">>;
  }>;
};

export type MetafieldDefinitionUpdateMutationVariables = AdminTypes.Exact<{
  definition: AdminTypes.MetafieldDefinitionUpdateInput;
}>;

export type MetafieldDefinitionUpdateMutation = {
  metafieldDefinitionUpdate?: AdminTypes.Maybe<{
    updatedDefinition?: AdminTypes.Maybe<
      Pick<AdminTypes.MetafieldDefinition, "id" | "name">
    >;
    userErrors: Array<
      Pick<
        AdminTypes.MetafieldDefinitionUpdateUserError,
        "field" | "message" | "code"
      >
    >;
  }>;
};

export type PopulateProductMutationVariables = AdminTypes.Exact<{
  product: AdminTypes.ProductCreateInput;
}>;

export type PopulateProductMutation = {
  productCreate?: AdminTypes.Maybe<{
    product?: AdminTypes.Maybe<
      Pick<AdminTypes.Product, "id" | "title" | "handle" | "status"> & {
        variants: {
          edges: Array<{
            node: Pick<
              AdminTypes.ProductVariant,
              "id" | "price" | "barcode" | "createdAt"
            >;
          }>;
        };
      }
    >;
  }>;
};

export type ShopifyRemixTemplateUpdateVariantMutationVariables =
  AdminTypes.Exact<{
    productId: AdminTypes.Scalars["ID"]["input"];
    variants:
      | Array<AdminTypes.ProductVariantsBulkInput>
      | AdminTypes.ProductVariantsBulkInput;
  }>;

export type ShopifyRemixTemplateUpdateVariantMutation = {
  productVariantsBulkUpdate?: AdminTypes.Maybe<{
    productVariants?: AdminTypes.Maybe<
      Array<
        Pick<
          AdminTypes.ProductVariant,
          "id" | "price" | "barcode" | "createdAt"
        >
      >
    >;
  }>;
};

export type AppUsageRecordCreateMutationVariables = AdminTypes.Exact<{
  description: AdminTypes.Scalars["String"]["input"];
  price: AdminTypes.MoneyInput;
  subscriptionLineItemId: AdminTypes.Scalars["ID"]["input"];
}>;

export type AppUsageRecordCreateMutation = {
  appUsageRecordCreate?: AdminTypes.Maybe<{
    userErrors: Array<Pick<AdminTypes.UserError, "field" | "message">>;
    appUsageRecord?: AdminTypes.Maybe<
      Pick<AdminTypes.AppUsageRecord, "id" | "description" | "createdAt"> & {
        price: Pick<AdminTypes.MoneyV2, "amount" | "currencyCode">;
      }
    >;
  }>;
};

export type GetCurrentSubscriptionQueryVariables = AdminTypes.Exact<{
  [key: string]: never;
}>;

export type GetCurrentSubscriptionQuery = {
  currentAppInstallation: {
    activeSubscriptions: Array<
      Pick<
        AdminTypes.AppSubscription,
        "id" | "name" | "status" | "createdAt" | "currentPeriodEnd"
      > & {
        lineItems: Array<
          Pick<AdminTypes.AppSubscriptionLineItem, "id"> & {
            plan: {
              pricingDetails:
                | ({ __typename: "AppRecurringPricing" } & {
                    price: Pick<AdminTypes.MoneyV2, "amount" | "currencyCode">;
                  })
                | ({ __typename: "AppUsagePricing" } & Pick<
                    AdminTypes.AppUsagePricing,
                    "terms"
                  > & {
                      cappedAmount: Pick<
                        AdminTypes.MoneyV2,
                        "amount" | "currencyCode"
                      >;
                    });
            };
          }
        >;
      }
    >;
  };
};

interface GeneratedQueryTypes {
  "#graphql\n query GetCurrentSubscriptions {\n          currentAppInstallation {\n            activeSubscriptions {\n              id\n              name\n              status\n              createdAt\n              currentPeriodEnd\n              lineItems {\n                id\n                plan {\n                  pricingDetails {\n                    ... on AppRecurringPricing {\n                      price {\n                        amount\n                        currencyCode\n                      }\n                      interval\n                      discount {\n                        durationLimitInIntervals\n                        remainingDurationInIntervals\n                        priceAfterDiscount {\n                          amount\n                          currencyCode\n                        }\n                        value {\n                          __typename\n                          ... on AppSubscriptionDiscountAmount {\n                            amount {\n                              amount\n                              currencyCode\n                            }\n                          }\n                          ... on AppSubscriptionDiscountPercentage {\n                            percentage\n                          }\n                        }\n                      }\n                    }\n                  }\n                }\n              }\n            }\n          }\n        }\n    ": {
    return: GetCurrentSubscriptionsQuery;
    variables: GetCurrentSubscriptionsQueryVariables;
  };
  "#graphql\n  query GetDiscounts($first: Int!) {\n    codeDiscountNodes(first: $first) {\n      nodes {\n        id\n        codeDiscount {\n          __typename\n          ... on DiscountCodeBasic {\n            title\n            startsAt\n            endsAt\n            status\n            usageLimit\n            appliesOncePerCustomer\n            codes(first: 1) {\n              nodes {\n                code\n              }\n            }\n          }\n          ... on DiscountCodeFreeShipping {\n            title\n            startsAt\n            endsAt\n            status\n            usageLimit\n            appliesOncePerCustomer\n            codes(first: 1) {\n              nodes {\n                code\n              }\n            }\n          }\n        }\n      }\n    }\n    automaticDiscountNodes(first: $first) {\n      nodes {\n        id\n        automaticDiscount {\n          __typename\n          ... on DiscountAutomaticBasic {\n            title\n            startsAt\n            endsAt\n            status\n          }\n          ... on DiscountAutomaticFreeShipping {\n            title\n            startsAt\n            endsAt\n            status\n          }\n        }\n      }\n    }\n  }\n": {
    return: GetDiscountsQuery;
    variables: GetDiscountsQueryVariables;
  };
  "#graphql\n  query getProductMetafields($id: ID!) {\n    product(id: $id) {\n      metafields(first: 10) {\n        edges {\n          node {\n            id\n            namespace\n            key\n            value\n            type\n            createdAt\n            updatedAt\n\n          }\n        }\n      }\n    }\n  }\n": {
    return: GetProductMetafieldsQuery;
    variables: GetProductMetafieldsQueryVariables;
  };
  "#graphql\n  query GetCurrentSubscription {\n    currentAppInstallation {\n      activeSubscriptions {\n        id\n        name\n        status\n        createdAt\n        currentPeriodEnd\n        lineItems {\n          id\n          plan {\n            pricingDetails {\n              __typename\n              ... on AppUsagePricing {\n                terms\n                cappedAmount {\n                  amount\n                  currencyCode\n                }\n              }\n              ... on AppRecurringPricing {\n                price {\n                  amount\n                  currencyCode\n                }\n              }\n            }\n          }\n        }\n      }\n    }\n  }\n": {
    return: GetCurrentSubscriptionQuery;
    variables: GetCurrentSubscriptionQueryVariables;
  };
}

interface GeneratedMutationTypes {
  "#graphql\n  mutation CreateUsageSubscription(\n    $name: String!,\n    $returnUrl: URL!,\n    $usageTerms: String!,\n    $usageCappedAmount: Decimal!,\n    $usageCurrencyCode: CurrencyCode!,\n    $recurringAmount: Decimal!,\n    $test: Boolean!,\n    $recurringCurrencyCode: CurrencyCode!\n  ) {\n    appSubscriptionCreate(\n      name: $name,\n      returnUrl: $returnUrl,\n      test: $test,\n      lineItems: [\n        {\n          plan: {\n            appUsagePricingDetails: {\n              terms: $usageTerms,\n              cappedAmount: {\n                amount: $usageCappedAmount,\n                currencyCode: $usageCurrencyCode\n              }\n            }\n          }\n        },\n        {\n          plan: {\n            appRecurringPricingDetails: {\n              price: {\n                amount: $recurringAmount,\n                currencyCode: $recurringCurrencyCode\n              }\n            }\n          }\n        }\n      ]\n    ) {\n      userErrors {\n        field,\n        message\n      },\n      confirmationUrl,\n      appSubscription {\n        id,\n        lineItems {\n          id,\n          plan {\n            pricingDetails {\n              __typename\n            }\n          }\n        }\n      }\n    }\n  }\n": {
    return: CreateUsageSubscriptionMutation;
    variables: CreateUsageSubscriptionMutationVariables;
  };
  "#graphql\n  mutation AppSubscriptionCancel($id: ID!) {\n    appSubscriptionCancel(id: $id) {\n      userErrors {\n        field\n        message\n      }\n      appSubscription {\n        id\n        status\n      }\n    }\n  }\n": {
    return: AppSubscriptionCancelMutation;
    variables: AppSubscriptionCancelMutationVariables;
  };
  "#graphql\n  mutation AppPurchaseOneTimeCreate(\n    $name: String!,\n    $price: MoneyInput!,\n    $returnUrl: URL!\n    $test: Boolean\n  ) {\n    appPurchaseOneTimeCreate(\n      name: $name,\n      returnUrl: $returnUrl,\n      price: $price\n      test: $test\n    ) {\n      userErrors {\n        field\n        message\n      }\n      appPurchaseOneTime {\n        createdAt\n        id\n      }\n      confirmationUrl\n    }\n  }\n": {
    return: AppPurchaseOneTimeCreateMutation;
    variables: AppPurchaseOneTimeCreateMutationVariables;
  };
  "#graphql\n  mutation discountCodeBasicCreate($basicCodeDiscount: DiscountCodeBasicInput!) {\n    discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {\n      codeDiscountNode {\n        id\n        codeDiscount {\n          ... on DiscountCodeBasic {\n            title\n            startsAt\n            endsAt\n            status\n            usageLimit\n            appliesOncePerCustomer\n            codes(first: 1) {\n              nodes {\n                code\n              }\n            }\n            customerGets {\n              value {\n                ... on DiscountPercentage {\n                  percentage\n                }\n                ... on DiscountAmount {\n                  amount {\n                    amount\n                  }\n                  appliesOnEachItem\n                }\n              }\n            }\n          }\n        }\n      }\n      userErrors {\n        field\n        code\n        message\n      }\n    }\n  }\n": {
    return: DiscountCodeBasicCreateMutation;
    variables: DiscountCodeBasicCreateMutationVariables;
  };
  "#graphql\n  mutation discountCodeFreeShippingCreate($freeShippingCodeDiscount: DiscountCodeFreeShippingInput!) {\n    discountCodeFreeShippingCreate(freeShippingCodeDiscount: $freeShippingCodeDiscount) {\n      codeDiscountNode {\n        id\n        codeDiscount {\n          ... on DiscountCodeFreeShipping {\n            title\n            startsAt\n            endsAt\n            status\n            usageLimit\n            appliesOncePerCustomer\n            maximumShippingPrice {\n              amount\n            }\n            customerSelection {\n              ... on DiscountCustomerAll {\n                allCustomers\n              }\n            }\n            destinationSelection {\n              ... on DiscountCountryAll {\n                allCountries\n              }\n            }\n            minimumRequirement {\n              ... on DiscountMinimumSubtotal {\n                greaterThanOrEqualToSubtotal {\n                  amount\n                }\n              }\n            }\n            codes(first: 1) {\n              nodes {\n                code\n              }\n            }\n          }\n        }\n      }\n      userErrors {\n        field\n        code\n        message\n      }\n    }\n  }\n": {
    return: DiscountCodeFreeShippingCreateMutation;
    variables: DiscountCodeFreeShippingCreateMutationVariables;
  };
  "#graphql\n  mutation discountAutomaticBasicCreate($automaticBasicDiscount: DiscountAutomaticBasicInput!) {\n    discountAutomaticBasicCreate(automaticBasicDiscount: $automaticBasicDiscount) {\n      automaticDiscountNode {\n        id\n        automaticDiscount {\n          ... on DiscountAutomaticBasic {\n            title\n            startsAt\n            endsAt\n            status\n            customerGets {\n              value {\n                ... on DiscountPercentage {\n                  percentage\n                }\n                ... on DiscountAmount {\n                  amount {\n                    amount\n                  }\n                  appliesOnEachItem\n                }\n              }\n            }\n          }\n        }\n      }\n      userErrors {\n        field\n        code\n        message\n      }\n    }\n  }\n": {
    return: DiscountAutomaticBasicCreateMutation;
    variables: DiscountAutomaticBasicCreateMutationVariables;
  };
  "#graphql\n  mutation discountAutomaticFreeShippingCreate($freeShippingAutomaticDiscount: DiscountAutomaticFreeShippingInput!) {\n    discountAutomaticFreeShippingCreate(freeShippingAutomaticDiscount: $freeShippingAutomaticDiscount) {\n      automaticDiscountNode {\n        id\n        automaticDiscount {\n          ... on DiscountAutomaticFreeShipping {\n            title\n            startsAt\n            endsAt\n            status\n            maximumShippingPrice {\n              amount\n            }\n            minimumRequirement {\n              ... on DiscountMinimumSubtotal {\n                greaterThanOrEqualToSubtotal {\n                  amount\n                }\n              }\n            }\n          }\n        }\n      }\n      userErrors {\n        field\n        code\n        message\n      }\n    }\n  }\n": {
    return: DiscountAutomaticFreeShippingCreateMutation;
    variables: DiscountAutomaticFreeShippingCreateMutationVariables;
  };
  "#graphql\n  mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {\n    metafieldsSet(metafields: $metafields) {\n      metafields {\n        id\n        key\n        namespace\n        value\n        type\n        createdAt\n        updatedAt\n        ownerType\n\n      }\n      userErrors {\n        field\n        message\n        code\n      }\n    }\n  }\n": {
    return: MetafieldsSetMutation;
    variables: MetafieldsSetMutationVariables;
  };
  "#graphql\n  mutation MetafieldsDelete($metafields: [MetafieldIdentifierInput!]!) {\n    metafieldsDelete(metafields: $metafields) {\n      deletedMetafields {\n        key\n        namespace\n        ownerId\n      }\n      userErrors {\n        field\n        message\n      }\n    }\n  }\n": {
    return: MetafieldsDeleteMutation;
    variables: MetafieldsDeleteMutationVariables;
  };
  "#graphql\n  mutation metafieldDefinitionUpdate($definition: MetafieldDefinitionUpdateInput!) {\n    metafieldDefinitionUpdate(definition: $definition) {\n      updatedDefinition {\n        id\n        name\n      }\n      userErrors {\n        field\n        message\n        code\n      }\n    }\n  }\n": {
    return: MetafieldDefinitionUpdateMutation;
    variables: MetafieldDefinitionUpdateMutationVariables;
  };
  "#graphql\n      mutation populateProduct($product: ProductCreateInput!) {\n        productCreate(product: $product) {\n          product {\n            id\n            title\n            handle\n            status\n            variants(first: 10) {\n              edges {\n                node {\n                  id\n                  price\n                  barcode\n                  createdAt\n                }\n              }\n            }\n          }\n        }\n      }": {
    return: PopulateProductMutation;
    variables: PopulateProductMutationVariables;
  };
  "#graphql\n    mutation shopifyRemixTemplateUpdateVariant($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {\n      productVariantsBulkUpdate(productId: $productId, variants: $variants) {\n        productVariants {\n          id\n          price\n          barcode\n          createdAt\n        }\n      }\n    }": {
    return: ShopifyRemixTemplateUpdateVariantMutation;
    variables: ShopifyRemixTemplateUpdateVariantMutationVariables;
  };
  "#graphql\n  mutation appUsageRecordCreate(\n    $description: String!,\n    $price: MoneyInput!,\n    $subscriptionLineItemId: ID!\n  ) {\n    appUsageRecordCreate(\n      description: $description,\n      price: $price,\n      subscriptionLineItemId: $subscriptionLineItemId\n    ) {\n      userErrors {\n        field\n        message\n      }\n      appUsageRecord {\n        id\n        description\n        price {\n          amount\n          currencyCode\n        }\n        createdAt\n      }\n    }\n  }\n": {
    return: AppUsageRecordCreateMutation;
    variables: AppUsageRecordCreateMutationVariables;
  };
}
declare module "@shopify/admin-api-client" {
  type InputMaybe<T> = AdminTypes.InputMaybe<T>;
  interface AdminQueries extends GeneratedQueryTypes {}
  interface AdminMutations extends GeneratedMutationTypes {}
}
