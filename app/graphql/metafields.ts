export const GET_PRODUCT_METAFIELDS = `#graphql
  query getProductMetafields($id: ID!) {
    product(id: $id) {
      metafields(first: 10) {
        edges {
          node {
            id
            namespace
            key
            value
            type
            createdAt
            updatedAt

          }
        }
      }
    }
  }
`;

export const SET_METAFIELDS = `#graphql
  mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields {
        id
        key
        namespace
        value
        type

      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;

export const DELETE_METAFIELDS = `#graphql
  mutation MetafieldsDelete($metafields: [MetafieldIdentifierInput!]!) {
    metafieldsDelete(metafields: $metafields) {
      deletedMetafields {
        key
        namespace
        ownerId
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const UPDATE_METAFIELD_DEFINITION = `#graphql
  mutation metafieldDefinitionUpdate($definition: MetafieldDefinitionUpdateInput!) {
    metafieldDefinitionUpdate(definition: $definition) {
      updatedDefinition {
        id
        name
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;
