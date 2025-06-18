import { json } from "@remix-run/node";

export class CouponError extends Error {
  constructor(
    message: string,
    public code: string = "COUPON_ERROR",
    public statusCode: number = 400,
  ) {
    super(message);
    this.name = "CouponError";
  }
}

export class BillingError extends Error {
  constructor(
    message: string,
    public code: string = "BILLING_ERROR",
    public statusCode: number = 500,
  ) {
    super(message);
    this.name = "BillingError";
  }
}

export const handleActionError = (
  error: unknown,
  context: string = "action",
) => {
  console.error(`Error in ${context}:`, error);

  if (error instanceof CouponError) {
    return json(
      {
        success: false,
        error: error.message,
        code: error.code,
      },
      { status: error.statusCode },
    );
  }

  if (error instanceof BillingError) {
    return json(
      {
        success: false,
        error: error.message,
        code: error.code,
      },
      { status: error.statusCode },
    );
  }

  // Handle generic errors
  const message =
    error instanceof Error ? error.message : "An unexpected error occurred";
  return json(
    {
      success: false,
      error: message,
      code: "UNKNOWN_ERROR",
    },
    { status: 500 },
  );
};

export const createErrorResponse = (
  message: string,
  code?: string,
  statusCode: number = 400,
) => {
  return json(
    {
      success: false,
      error: message,
      code: code || "ERROR",
    },
    { status: statusCode },
  );
};

export const createSuccessResponse = (data: any, message?: string) => {
  return json({
    success: true,
    data,
    message,
  });
};
