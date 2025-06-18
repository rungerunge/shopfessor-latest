// models/discounts.server.ts

import { authenticate } from "app/lib/shopify.server";
import {
  CREATE_CODE_BASIC_DISCOUNT,
  CREATE_CODE_FREE_SHIPPING_DISCOUNT,
  CREATE_AUTOMATIC_BASIC_DISCOUNT,
  CREATE_AUTOMATIC_FREE_SHIPPING_DISCOUNT,
  GET_DISCOUNTS_QUERY,
} from "app/graphql/discounts";
import {
  DiscountMethod,
  DiscountType,
  DiscountClass,
  DiscountFormData,
  DiscountCreateResponse,
  DiscountCodeBasicInput,
  DiscountCodeFreeShippingInput,
  DiscountAutomaticBasicInput,
  DiscountAutomaticFreeShippingInput,
  UserError,
  BaseDiscount,
} from "app/types/discounts";

/**
 * Creates a basic code discount (percentage or fixed amount off)
 */
export async function createCodeBasicDiscount(
  request: Request,
  baseDiscount: BaseDiscount,
  code: string,
  usageLimit: number | null,
  appliesOncePerCustomer: boolean,
  discountType: DiscountType,
  value: number,
): Promise<DiscountCreateResponse> {
  const { admin } = await authenticate.admin(request);

  const customerGets =
    discountType === DiscountType.Percentage
      ? {
          value: {
            percentage: value / 100, // Convert percentage to decimal
          },
          items: {
            all: true,
          },
        }
      : {
          value: {
            discountAmount: {
              amount: value.toString(),
              appliesOnEachItem: false,
            },
          },
          items: {
            all: true,
          },
        };

  const discountData: DiscountCodeBasicInput = {
    title: baseDiscount.title,
    combinesWith: baseDiscount.combinesWith,
    startsAt: baseDiscount.startsAt,
    endsAt: baseDiscount.endsAt,
    code,
    usageLimit,
    appliesOncePerCustomer,
    customerGets,
    customerSelection: {
      all: true,
    },
  };

  try {
    const response = await admin.graphql(CREATE_CODE_BASIC_DISCOUNT, {
      variables: {
        basicCodeDiscount: discountData,
      },
    });

    const responseJson = await response.json();

    if (responseJson.data?.discountCodeBasicCreate?.userErrors?.length > 0) {
      return {
        success: false,
        errors: responseJson.data.discountCodeBasicCreate
          .userErrors as UserError[],
      };
    }

    return {
      success: true,
      discount: responseJson.data?.discountCodeBasicCreate?.codeDiscountNode,
    };
  } catch (error) {
    return {
      success: false,
      errors: [
        {
          message:
            error instanceof Error ? error.message : "Unknown error occurred",
        },
      ],
    };
  }
}

/**
 * Creates a free shipping code discount
 */
export async function createCodeFreeShippingDiscount(
  request: Request,
  baseDiscount: BaseDiscount,
  code: string,
  usageLimit: number | null,
  appliesOncePerCustomer: boolean,
  minimumSubtotal?: number,
  maximumShippingPrice?: number,
): Promise<DiscountCreateResponse> {
  const { admin } = await authenticate.admin(request);

  const discountData: DiscountCodeFreeShippingInput = {
    title: baseDiscount.title,
    combinesWith: baseDiscount.combinesWith,
    startsAt: baseDiscount.startsAt,
    endsAt: baseDiscount.endsAt,
    code,
    usageLimit,
    appliesOncePerCustomer,
    customerSelection: {
      all: true,
    },
    destination: {
      all: true,
    },
    ...(minimumSubtotal && {
      minimumRequirement: {
        subtotal: {
          greaterThanOrEqualToSubtotal: minimumSubtotal,
        },
      },
    }),
    ...(maximumShippingPrice && {
      maximumShippingPrice: {
        amount: maximumShippingPrice,
      },
    }),
  };

  try {
    const response = await admin.graphql(CREATE_CODE_FREE_SHIPPING_DISCOUNT, {
      variables: {
        freeShippingCodeDiscount: discountData,
      },
    });

    const responseJson = await response.json();

    if (
      responseJson.data?.discountCodeFreeShippingCreate?.userErrors?.length > 0
    ) {
      return {
        success: false,
        errors: responseJson.data.discountCodeFreeShippingCreate
          .userErrors as UserError[],
      };
    }

    return {
      success: true,
      discount:
        responseJson.data?.discountCodeFreeShippingCreate?.codeDiscountNode,
    };
  } catch (error) {
    return {
      success: false,
      errors: [
        {
          message:
            error instanceof Error ? error.message : "Unknown error occurred",
        },
      ],
    };
  }
}

/**
 * Creates an automatic basic discount (percentage or fixed amount off)
 */
export async function createAutomaticBasicDiscount(
  request: Request,
  baseDiscount: BaseDiscount,
  discountType: DiscountType,
  value: number,
): Promise<DiscountCreateResponse> {
  const { admin } = await authenticate.admin(request);

  const customerGets =
    discountType === DiscountType.Percentage
      ? {
          value: {
            percentage: value / 100, // Convert percentage to decimal
          },
          items: {
            all: true,
          },
        }
      : {
          value: {
            discountAmount: {
              amount: value.toString(),
              appliesOnEachItem: false,
            },
          },
          items: {
            all: true,
          },
        };

  const discountData: DiscountAutomaticBasicInput = {
    title: baseDiscount.title,
    combinesWith: baseDiscount.combinesWith,
    startsAt: baseDiscount.startsAt,
    endsAt: baseDiscount.endsAt,
    customerGets,
    customerSelection: {
      all: true,
    },
  };

  try {
    const response = await admin.graphql(CREATE_AUTOMATIC_BASIC_DISCOUNT, {
      variables: {
        automaticBasicDiscount: discountData,
      },
    });

    const responseJson = await response.json();

    if (
      responseJson.data?.discountAutomaticBasicCreate?.userErrors?.length > 0
    ) {
      return {
        success: false,
        errors: responseJson.data.discountAutomaticBasicCreate
          .userErrors as UserError[],
      };
    }

    return {
      success: true,
      discount:
        responseJson.data?.discountAutomaticBasicCreate?.automaticDiscountNode,
    };
  } catch (error) {
    return {
      success: false,
      errors: [
        {
          message:
            error instanceof Error ? error.message : "Unknown error occurred",
        },
      ],
    };
  }
}

/**
 * Creates an automatic free shipping discount
 */
export async function createAutomaticFreeShippingDiscount(
  request: Request,
  baseDiscount: BaseDiscount,
  minimumSubtotal?: number,
  maximumShippingPrice?: number,
): Promise<DiscountCreateResponse> {
  const { admin } = await authenticate.admin(request);

  const discountData: DiscountAutomaticFreeShippingInput = {
    title: baseDiscount.title,
    combinesWith: baseDiscount.combinesWith,
    startsAt: baseDiscount.startsAt,
    endsAt: baseDiscount.endsAt,
    ...(minimumSubtotal && {
      minimumRequirement: {
        subtotal: {
          greaterThanOrEqualToSubtotal: minimumSubtotal,
        },
      },
    }),
    ...(maximumShippingPrice && {
      maximumShippingPrice: {
        amount: maximumShippingPrice,
      },
    }),
  };

  try {
    const response = await admin.graphql(
      CREATE_AUTOMATIC_FREE_SHIPPING_DISCOUNT,
      {
        variables: {
          freeShippingAutomaticDiscount: discountData,
        },
      },
    );

    const responseJson = await response.json();

    if (
      responseJson.data?.discountAutomaticFreeShippingCreate?.userErrors
        ?.length > 0
    ) {
      return {
        success: false,
        errors: responseJson.data.discountAutomaticFreeShippingCreate
          .userErrors as UserError[],
      };
    }

    return {
      success: true,
      discount:
        responseJson.data?.discountAutomaticFreeShippingCreate
          ?.automaticDiscountNode,
    };
  } catch (error) {
    return {
      success: false,
      errors: [
        {
          message:
            error instanceof Error ? error.message : "Unknown error occurred",
        },
      ],
    };
  }
}

/**
 * Main function to create any type of discount based on form data
 */
export async function createDiscount(
  request: Request,
  formData: DiscountFormData,
): Promise<DiscountCreateResponse> {
  const baseDiscount: BaseDiscount = {
    title: formData.title,
    combinesWith: formData.combinesWith,
    startsAt: new Date(formData.startsAt),
    endsAt: formData.endsAt ? new Date(formData.endsAt) : null,
    discountClasses: [DiscountClass.Product], // Default to product discounts
  };

  const value = parseFloat(formData.value || "0");
  const usageLimit = formData.usageLimit ? parseInt(formData.usageLimit) : null;
  const minimumSubtotal = formData.minimumSubtotal
    ? parseFloat(formData.minimumSubtotal)
    : undefined;
  const maximumShippingPrice = formData.maximumShippingPrice
    ? parseFloat(formData.maximumShippingPrice)
    : undefined;

  // Route to appropriate creation function based on method and type
  if (formData.method === DiscountMethod.Code) {
    if (!formData.code) {
      return {
        success: false,
        errors: [
          {
            message: "Discount code is required for code discounts",
            field: ["code"],
          },
        ],
      };
    }

    if (formData.type === DiscountType.FreeShipping) {
      return createCodeFreeShippingDiscount(
        request,
        baseDiscount,
        formData.code,
        usageLimit,
        formData.appliesOncePerCustomer || false,
        minimumSubtotal,
        maximumShippingPrice,
      );
    } else {
      return createCodeBasicDiscount(
        request,
        baseDiscount,
        formData.code,
        usageLimit,
        formData.appliesOncePerCustomer || false,
        formData.type,
        value,
      );
    }
  } else {
    // Automatic discounts
    if (formData.type === DiscountType.FreeShipping) {
      return createAutomaticFreeShippingDiscount(
        request,
        baseDiscount,
        minimumSubtotal,
        maximumShippingPrice,
      );
    } else {
      return createAutomaticBasicDiscount(
        request,
        baseDiscount,
        formData.type,
        value,
      );
    }
  }
}

/**
 * Fetches all discounts (both code and automatic)
 */
export async function getDiscounts(request: Request) {
  const { admin } = await authenticate.admin(request);

  try {
    const response = await admin.graphql(GET_DISCOUNTS_QUERY, {
      variables: { first: 50 },
    });

    const responseJson = await response.json();

    if (responseJson.data?.errors) {
      throw new Error(
        responseJson.data.errors[0]?.message || "Failed to fetch discounts",
      );
    }

    // Combine code and automatic discounts
    const codeDiscounts = responseJson.data?.codeDiscountNodes?.nodes || [];
    const automaticDiscounts =
      responseJson.data?.automaticDiscountNodes?.nodes || [];

    const allDiscounts = [
      ...codeDiscounts.map((node: any) => ({
        id: node.id,
        discount: {
          ...node.codeDiscount,
          method: "Code",
        },
      })),
      ...automaticDiscounts.map((node: any) => ({
        id: node.id,
        discount: {
          ...node.automaticDiscount,
          method: "Automatic",
        },
      })),
    ];

    return {
      discounts: allDiscounts,
      error: null,
    };
  } catch (error) {
    console.error("Get discounts error:", error);
    return {
      discounts: [],
      error:
        error instanceof Error ? error.message : "Failed to load discounts",
    };
  }
}
