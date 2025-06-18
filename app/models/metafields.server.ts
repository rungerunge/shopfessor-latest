import { authenticate } from "app/lib/shopify.server";
import {
  GET_PRODUCT_METAFIELDS,
  SET_METAFIELDS,
  DELETE_METAFIELDS,
} from "app/graphql/metafields";
import type {
  GetProductMetafieldsQuery,
  MetafieldsSetMutation,
  MetafieldsDeleteMutation,
} from "app/types/admin.generated";

export interface Metafield {
  id: string;
  namespace: string;
  key: string;
  value: string;
  type: string;
  createdAt: string;
  updatedAt: string;
}

interface MetafieldCreateResponse {
  success: boolean;
  metafield?: Metafield;
  errors?: Array<{ message: string; field?: string[] }>;
}

interface MetafieldDeleteResponse {
  success: boolean;
  errors?: Array<{ message: string; field?: string[] }>;
}

/**
 * Fetches metafields for a specific product
 */
export async function getProductMetafields(
  request: Request,
  productId: string,
): Promise<{ metafields: Metafield[]; error: string | null }> {
  const { admin } = await authenticate.admin(request);

  try {
    const response = await admin.graphql(GET_PRODUCT_METAFIELDS, {
      variables: { id: productId },
    });

    const responseJson = (await response.json()) as {
      data?: GetProductMetafieldsQuery;
    };

    if (!responseJson.data?.product?.metafields?.edges) {
      throw new Error("Failed to fetch metafields");
    }

    const metafields = responseJson.data.product.metafields.edges.map(
      (edge) => ({
        id: edge.node.id,
        namespace: edge.node.namespace,
        key: edge.node.key,
        value: edge.node.value,
        type: edge.node.type,
        createdAt: edge.node.createdAt,
        updatedAt: edge.node.updatedAt,
      }),
    );

    return { metafields, error: null };
  } catch (error) {
    console.error("Get metafields error:", error);
    return {
      metafields: [],
      error:
        error instanceof Error ? error.message : "Failed to load metafields",
    };
  }
}

/**
 * Creates or updates metafields
 */
export async function setMetafields(
  request: Request,
  metafields: Array<{
    ownerId: string;
    namespace: string;
    key: string;
    value: string;
    type: string;
  }>,
): Promise<MetafieldCreateResponse> {
  console.log("🔥 metafield: ", metafields);

  const { admin } = await authenticate.admin(request);

  try {
    const response = await admin.graphql(SET_METAFIELDS, {
      variables: { metafields },
    });

    const result = await response.json();

    const responseJson = result as {
      data?: MetafieldsSetMutation;
    };

    if (responseJson.data?.metafieldsSet?.userErrors?.length) {
      console.log("🔵 ", responseJson.data?.metafieldsSet.userErrors);

      return {
        success: false,
        errors: responseJson.data.metafieldsSet.userErrors.map((error) => ({
          message: error.message,
          field: Array.isArray(error.field)
            ? error.field
            : error.field
              ? [error.field]
              : undefined,
        })),
      };
    }

    const metafield = responseJson.data?.metafieldsSet?.metafields?.[0];
    if (!metafield) {
      return {
        success: false,
        errors: [{ message: "No metafield was created" }],
      };
    }

    return {
      success: true,
      metafield: {
        id: metafield.id,
        namespace: metafield.namespace,
        key: metafield.key,
        value: metafield.value,
        type: metafield.type,
        createdAt: metafield.createdAt,
        updatedAt: metafield.updatedAt,
      },
    };
  } catch (error) {
    return {
      success: false,
      errors: [
        {
          message:
            error instanceof Error
              ? error.message
              : "Failed to create metafield",
        },
      ],
    };
  }
}

/**
 * Deletes metafields
 */
export async function deleteMetafields(
  request: Request,
  metafields: Array<{
    ownerId: string;
    namespace: string;
    key: string;
  }>,
): Promise<MetafieldDeleteResponse> {
  const { admin } = await authenticate.admin(request);

  try {
    const response = await admin.graphql(DELETE_METAFIELDS, {
      variables: { metafields },
    });

    const responseJson = (await response.json()) as {
      data?: MetafieldsDeleteMutation;
    };

    if (responseJson.data?.metafieldsDelete?.userErrors?.length) {
      return {
        success: false,
        errors: responseJson.data.metafieldsDelete.userErrors.map((error) => ({
          message: error.message,
          field: Array.isArray(error.field)
            ? error.field
            : error.field
              ? [error.field]
              : undefined,
        })),
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      errors: [
        {
          message:
            error instanceof Error
              ? error.message
              : "Failed to delete metafield",
        },
      ],
    };
  }
}
