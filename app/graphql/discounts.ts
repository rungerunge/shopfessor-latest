// graphql/discount.mutations.ts

export const CREATE_CODE_BASIC_DISCOUNT = `#graphql
  mutation discountCodeBasicCreate($basicCodeDiscount: DiscountCodeBasicInput!) {
    discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
      codeDiscountNode {
        id
        codeDiscount {
          ... on DiscountCodeBasic {
            title
            startsAt
            endsAt
            status
            usageLimit
            appliesOncePerCustomer
            codes(first: 1) {
              nodes {
                code
              }
            }
            customerGets {
              value {
                ... on DiscountPercentage {
                  percentage
                }
                ... on DiscountAmount {
                  amount {
                    amount
                  }
                  appliesOnEachItem
                }
              }
            }
          }
        }
      }
      userErrors {
        field
        code
        message
      }
    }
  }
`;

export const CREATE_CODE_FREE_SHIPPING_DISCOUNT = `#graphql
  mutation discountCodeFreeShippingCreate($freeShippingCodeDiscount: DiscountCodeFreeShippingInput!) {
    discountCodeFreeShippingCreate(freeShippingCodeDiscount: $freeShippingCodeDiscount) {
      codeDiscountNode {
        id
        codeDiscount {
          ... on DiscountCodeFreeShipping {
            title
            startsAt
            endsAt
            status
            usageLimit
            appliesOncePerCustomer
            maximumShippingPrice {
              amount
            }
            customerSelection {
              ... on DiscountCustomerAll {
                allCustomers
              }
            }
            destinationSelection {
              ... on DiscountCountryAll {
                allCountries
              }
            }
            minimumRequirement {
              ... on DiscountMinimumSubtotal {
                greaterThanOrEqualToSubtotal {
                  amount
                }
              }
            }
            codes(first: 1) {
              nodes {
                code
              }
            }
          }
        }
      }
      userErrors {
        field
        code
        message
      }
    }
  }
`;

export const CREATE_AUTOMATIC_BASIC_DISCOUNT = `#graphql
  mutation discountAutomaticBasicCreate($automaticBasicDiscount: DiscountAutomaticBasicInput!) {
    discountAutomaticBasicCreate(automaticBasicDiscount: $automaticBasicDiscount) {
      automaticDiscountNode {
        id
        automaticDiscount {
          ... on DiscountAutomaticBasic {
            title
            startsAt
            endsAt
            status
            customerGets {
              value {
                ... on DiscountPercentage {
                  percentage
                }
                ... on DiscountAmount {
                  amount {
                    amount
                  }
                  appliesOnEachItem
                }
              }
            }
          }
        }
      }
      userErrors {
        field
        code
        message
      }
    }
  }
`;

export const CREATE_AUTOMATIC_FREE_SHIPPING_DISCOUNT = `#graphql
  mutation discountAutomaticFreeShippingCreate($freeShippingAutomaticDiscount: DiscountAutomaticFreeShippingInput!) {
    discountAutomaticFreeShippingCreate(freeShippingAutomaticDiscount: $freeShippingAutomaticDiscount) {
      automaticDiscountNode {
        id
        automaticDiscount {
          ... on DiscountAutomaticFreeShipping {
            title
            startsAt
            endsAt
            status
            maximumShippingPrice {
              amount
            }
            minimumRequirement {
              ... on DiscountMinimumSubtotal {
                greaterThanOrEqualToSubtotal {
                  amount
                }
              }
            }
          }
        }
      }
      userErrors {
        field
        code
        message
      }
    }
  }
`;

export const GET_DISCOUNTS_QUERY = `#graphql
  query GetDiscounts($first: Int!) {
    codeDiscountNodes(first: $first) {
      nodes {
        id
        codeDiscount {
          __typename
          ... on DiscountCodeBasic {
            title
            startsAt
            endsAt
            status
            usageLimit
            appliesOncePerCustomer
            codes(first: 1) {
              nodes {
                code
              }
            }
          }
          ... on DiscountCodeFreeShipping {
            title
            startsAt
            endsAt
            status
            usageLimit
            appliesOncePerCustomer
            codes(first: 1) {
              nodes {
                code
              }
            }
          }
        }
      }
    }
    automaticDiscountNodes(first: $first) {
      nodes {
        id
        automaticDiscount {
          __typename
          ... on DiscountAutomaticBasic {
            title
            startsAt
            endsAt
            status
          }
          ... on DiscountAutomaticFreeShipping {
            title
            startsAt
            endsAt
            status
          }
        }
      }
    }
  }
`;
