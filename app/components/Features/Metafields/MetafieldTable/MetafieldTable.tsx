import { Card, DataTable, Badge, EmptyState } from "@shopify/polaris";

interface Metafield {
  id: string;
  namespace: string;
  key: string;
  value: string;
  type: string;
  createdAt: string;
  updatedAt: string;
  definition?: {
    id: string;
    name: string;
    access: {
      admin: boolean;
      customerAccount: boolean;
      storefront: boolean;
    };
  };
}

interface MetafieldTableProps {
  metafields: Metafield[];
}

export function MetafieldTable({ metafields }: MetafieldTableProps) {
  // Prepare table data
  const rows = metafields.map((metafield) => {
    const access = metafield.definition?.access;
    const accessBadges = [
      access?.admin && (
        <Badge tone="info" key="admin">
          Admin
        </Badge>
      ),
      access?.customerAccount && (
        <Badge tone="success" key="customer">
          Customer
        </Badge>
      ),
      access?.storefront && (
        <Badge tone="warning" key="storefront">
          Storefront
        </Badge>
      ),
    ].filter(Boolean);

    return [
      metafield.namespace,
      metafield.key,
      metafield.value,
      metafield.type,
      new Date(metafield.createdAt).toLocaleDateString(),
      new Date(metafield.updatedAt).toLocaleDateString(),
      <div key={`access-${metafield.id}`}>{accessBadges}</div>,
    ];
  });

  if (metafields.length === 0) {
    return (
      <Card>
        <EmptyState
          heading="No metafields found"
          image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
        >
          <p>
            Start by creating a metafield to store additional product
            information.
          </p>
        </EmptyState>
      </Card>
    );
  }

  return (
    <Card>
      <DataTable
        columnContentTypes={[
          "text", // Namespace
          "text", // Key
          "text", // Value
          "text", // Type
          "text", // Created At
          "text", // Updated At
          "text", // Access
        ]}
        headings={[
          "Namespace",
          "Key",
          "Value",
          "Type",
          "Created At",
          "Updated At",
          "Access",
        ]}
        rows={rows}
        sortable={[true, true, true, true, true, true, false]}
      />
    </Card>
  );
}
