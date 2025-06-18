import React from "react";
import {
  Button,
  Thumbnail,
  InlineStack,
  BlockStack,
  Text,
} from "@shopify/polaris";

// Official Shopify Resource Picker Types
export type ResourceType = "product" | "variant" | "collection";
export type ResourceAction = "add" | "select";

export interface BaseResource {
  id: string;
  title: string;
  handle: string;
  [key: string]: any;
}

export interface ProductResource extends BaseResource {
  images: Array<{
    originalSrc: string;
    altText?: string;
  }>;
  variants?: VariantResource[];
}

export interface VariantResource extends BaseResource {
  product: {
    id: string;
    title: string;
    images: Array<{
      originalSrc: string;
      altText?: string;
    }>;
  };
  image?: {
    originalSrc: string;
    altText?: string;
  };
}

export interface CollectionResource extends BaseResource {
  image?: {
    originalSrc: string;
    altText?: string;
  };
}

export type ShopifyResource =
  | ProductResource
  | VariantResource
  | CollectionResource;

export interface Filters {
  /**
   * GraphQL query for filtering resources (not shown in UI)
   */
  query?: string;

  /**
   * Show hidden resources
   */
  hidden?: boolean;

  /**
   * Include variants (for products)
   */
  variants?: boolean;

  /**
   * Include draft resources
   */
  draft?: boolean;

  /**
   * Include archived resources
   */
  archived?: boolean;

  /**
   * Additional filter properties
   */
  [key: string]: any;
}

export interface ResourcePickerOptions {
  /**
   * The type of resource you want to pick
   */
  type: ResourceType;

  /**
   * The action verb appears in the title and as the primary action
   * @default 'add'
   */
  action?: ResourceAction;

  /**
   * Filters for what resources to show
   */
  filter?: Filters;

  /**
   * Whether to allow selecting multiple items or limit to a maximum number
   * @default false
   */
  multiple?: boolean | number;

  /**
   * GraphQL initial search query displayed in the search bar
   * @default ''
   */
  query?: string;

  /**
   * Resources that should be preselected when the picker is opened
   * @default []
   */
  selectionIds?: BaseResource[];
}

export interface ResourcePickerProps {
  /**
   * The type of resource to pick
   */
  resourceType: ResourceType;

  /**
   * The action verb for the picker
   * @default 'select'
   */
  action?: ResourceAction;

  /**
   * Whether multiple resources can be selected, or max number allowed
   * @default false
   */
  multiple?: boolean | number;

  /**
   * Current selected resource(s)
   */
  selectedResource?: ShopifyResource | ShopifyResource[] | null;

  /**
   * Callback when resource(s) are selected
   */
  onResourceSelect: (resources: ShopifyResource[]) => void;

  /**
   * Callback when selection is cleared
   */
  onClear?: () => void;

  /**
   * Loading state
   */
  loading?: boolean;

  /**
   * Disabled state
   */
  disabled?: boolean;

  /**
   * Custom button text for initial selection
   */
  selectButtonText?: string;

  /**
   * Custom button text for changing selection
   */
  changeButtonText?: string;

  /**
   * Show thumbnail for selected resource
   */
  showThumbnail?: boolean;

  /**
   * Thumbnail size
   */
  thumbnailSize?: "small" | "medium" | "large";

  /**
   * Filters for the resource picker
   */
  filters?: Filters;

  /**
   * Initial search query displayed in the picker's search bar
   */
  initialQuery?: string;

  /**
   * Resources that should be preselected
   */
  preselectedResources?: BaseResource[];

  /**
   * Error message to display
   */
  error?: string;
}

declare global {
  interface Window {
    shopify: {
      resourcePicker: (
        options: ResourcePickerOptions,
      ) => Promise<ShopifyResource[]>;
    };
  }
}

export const ResourcePicker: React.FC<ResourcePickerProps> = ({
  resourceType,
  action = "select",
  multiple = false,
  selectedResource,
  onResourceSelect,
  onClear,
  loading = false,
  disabled = false,
  selectButtonText,
  changeButtonText,
  showThumbnail = true,
  thumbnailSize = "small",
  filters,
  initialQuery = "",
  preselectedResources = [],
  error,
}) => {
  const handleResourcePicker = async () => {
    try {
      const options: ResourcePickerOptions = {
        type: resourceType,
        action,
        multiple,
        query: initialQuery,
        selectionIds: preselectedResources,
      };

      if (filters) {
        options.filter = filters;
      }

      const selected = await window.shopify.resourcePicker(options);

      if (selected?.length) {
        onResourceSelect(selected);
      } else if (onClear) {
        onClear();
      }
    } catch (err) {
      console.error("Resource picker error:", err);
    }
  };

  const getButtonText = () => {
    if (selectedResource) {
      return changeButtonText || `Change ${resourceType}`;
    }
    return selectButtonText || `Choose ${resourceType}`;
  };

  const getResourceImage = (resource: ShopifyResource): string | undefined => {
    if ("images" in resource && resource.images?.[0]) {
      return resource.images[0].originalSrc;
    }
    if ("image" in resource && resource.image) {
      return resource.image.originalSrc;
    }
    if ("product" in resource && resource.product?.images?.[0]) {
      return resource.product.images[0].originalSrc;
    }
    return undefined;
  };

  const getResourceTitle = (resource: ShopifyResource): string => {
    if ("product" in resource && resource.product) {
      return `${resource.product.title} - ${resource.title}`;
    }
    return resource.title;
  };

  const renderSelectedResource = (resource: ShopifyResource) => {
    const imageSource = getResourceImage(resource);
    const title = getResourceTitle(resource);

    return (
      <InlineStack gap="200" key={resource.id}>
        {showThumbnail && imageSource && (
          <Thumbnail source={imageSource} alt={title} size={thumbnailSize} />
        )}
        <BlockStack gap="100">
          <Text as="p" variant="bodyMd" fontWeight="semibold">
            {title}
          </Text>
          <Button
            disabled={disabled}
            onClick={handleResourcePicker}
            variant="tertiary"
            size="slim"
          >
            {changeButtonText || "Change"}
          </Button>
        </BlockStack>
      </InlineStack>
    );
  };

  const renderMultipleSelected = (resources: ShopifyResource[]) => {
    const maxCount = typeof multiple === "number" ? multiple : undefined;
    const displayText = maxCount
      ? `${resources.length}/${maxCount} ${resourceType}(s) selected`
      : `${resources.length} ${resourceType}(s) selected`;

    return (
      <BlockStack gap="200">
        <Text as="p" variant="bodyMd" fontWeight="semibold">
          {displayText}
        </Text>
        <InlineStack gap="200">
          {resources.slice(0, 3).map((resource) => {
            const imageSource = getResourceImage(resource);
            return imageSource && showThumbnail ? (
              <Thumbnail
                key={resource.id}
                source={imageSource}
                alt={getResourceTitle(resource)}
                size="small"
              />
            ) : null;
          })}
          {resources.length > 3 && (
            <Text as="p" variant="bodySm" tone="subdued">
              +{resources.length - 3} more
            </Text>
          )}
        </InlineStack>
        <Button
          disabled={disabled}
          onClick={handleResourcePicker}
          variant="tertiary"
          size="slim"
        >
          {changeButtonText || "Change Selection"}
        </Button>
      </BlockStack>
    );
  };

  if (selectedResource) {
    if (Array.isArray(selectedResource)) {
      return (
        <BlockStack gap="200">
          {renderMultipleSelected(selectedResource)}
          {error && (
            <Text as="p" tone="critical">
              {error}
            </Text>
          )}
        </BlockStack>
      );
    } else {
      return (
        <BlockStack gap="200">
          {renderSelectedResource(selectedResource)}
          {error && (
            <Text as="p" tone="critical">
              {error}
            </Text>
          )}
        </BlockStack>
      );
    }
  }

  return (
    <BlockStack gap="200">
      <Button
        loading={loading}
        disabled={disabled}
        onClick={handleResourcePicker}
        size="large"
      >
        {getButtonText()}
      </Button>
      {error && (
        <Text as="p" tone="critical">
          {error}
        </Text>
      )}
    </BlockStack>
  );
};
