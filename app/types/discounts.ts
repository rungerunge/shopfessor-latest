// types/discount.types.ts

export enum DiscountMethod {
  Code = "CODE",
  Automatic = "AUTOMATIC",
}

export enum DiscountClass {
  Product = "PRODUCT",
  Order = "ORDER",
  Shipping = "SHIPPING",
}

export enum DiscountType {
  Percentage = "PERCENTAGE",
  FixedAmount = "FIXED_AMOUNT",
  FreeShipping = "FREE_SHIPPING",
}

export interface DiscountCombinesWith {
  orderDiscounts: boolean;
  productDiscounts: boolean;
  shippingDiscounts: boolean;
}

export interface DiscountCustomerSelection {
  all?: boolean;
  customerSegments?: string[];
}

export interface DiscountDestinationSelection {
  all?: boolean;
  countries?: string[];
  countryCodesOrRestOfWorld?: string[];
}

export interface DiscountMinimumRequirement {
  subtotal?: {
    greaterThanOrEqualToSubtotal: number;
  };
  quantity?: {
    greaterThanOrEqualToQuantity: number;
  };
}

export interface DiscountCustomerGets {
  value?: {
    percentage?: number;
    discountAmount?: {
      amount: string;
      appliesOnEachItem: boolean;
    };
  };
  items?: {
    all?: boolean;
    products?: string[];
    collections?: string[];
  };
}

export interface BaseDiscount {
  title: string;
  discountClasses?: DiscountClass[];
  combinesWith: DiscountCombinesWith;
  startsAt: Date;
  endsAt?: Date | null;
  customerSelection?: DiscountCustomerSelection;
}

// Code Discount Interfaces
export interface DiscountCodeBasicInput extends BaseDiscount {
  code: string;
  usageLimit?: number | null;
  appliesOncePerCustomer?: boolean;
  customerGets: DiscountCustomerGets;
}

export interface DiscountCodeFreeShippingInput extends BaseDiscount {
  code: string;
  usageLimit?: number | null;
  appliesOncePerCustomer?: boolean;
  minimumRequirement?: DiscountMinimumRequirement;
  destination?: DiscountDestinationSelection;
  maximumShippingPrice?: {
    amount: number;
  };
}

// Automatic Discount Interfaces
export interface DiscountAutomaticBasicInput extends BaseDiscount {
  customerGets: DiscountCustomerGets;
}

export interface DiscountAutomaticFreeShippingInput extends BaseDiscount {
  minimumRequirement?: DiscountMinimumRequirement;
  destination?: DiscountDestinationSelection;
  maximumShippingPrice?: {
    amount: number;
  };
}

// Union types for all discount inputs
export type CodeDiscountInput =
  | DiscountCodeBasicInput
  | DiscountCodeFreeShippingInput;
export type AutomaticDiscountInput =
  | DiscountAutomaticBasicInput
  | DiscountAutomaticFreeShippingInput;

// Form data interface
export interface DiscountFormData {
  title: string;
  method: DiscountMethod;
  type: DiscountType;
  code?: string;
  value?: string;
  usageLimit?: string;
  appliesOncePerCustomer?: boolean;
  startsAt: string;
  endsAt?: string | null;
  combinesWith: DiscountCombinesWith;
  minimumSubtotal?: string;
  maximumShippingPrice?: string;
}

// API Response interfaces
export interface UserError {
  field?: string[];
  message: string;
  code?: string;
}

export interface DiscountCreateResponse {
  success: boolean;
  errors?: UserError[];
  discount?: any;
}

// Discount node interface for display
export interface DiscountNode {
  id: string;
  discount: {
    __typename: string;
    title: string;
    discountClass: string;
    startsAt: string;
    endsAt: string | null;
    usageLimit?: number | null;
    appliesOncePerCustomer?: boolean;
    codes?: {
      nodes: Array<{ code: string }>;
    };
  };
}
