import { Badge } from "@shopify/polaris";
import {
  DataTable,
  TableColumn,
  TableFilter,
  SortOption,
  TableAction,
} from "app/components/UI/DataTable/DataTable";

// Define your product type
interface Product {
  id: string;
  price: string;
  product: string;
  tone: JSX.Element;
  inventory: string;
  type: string;
  vendor: string;
}

const Products = () => {
  // Sample data
  const products: Product[] = [
    {
      id: "1020",
      price: "$200",
      product: "1ZPRESSO | J-MAX Manual Coffee Grinder",
      tone: <Badge tone="success">Active</Badge>,
      inventory: "20 in stock",
      type: "Brew Gear",
      vendor: "Espresso Shot Coffee",
    },
    {
      id: "1018",
      price: "$200",
      product: "Acaia Pearl Set",
      tone: <Badge tone="success">Active</Badge>,
      inventory: "2 in stock for 50 variants",
      type: "Brew Gear",
      vendor: "Espresso Shot Coffee",
    },
    {
      id: "1016",
      price: "$200",
      product: "AeroPress Go Brewer",
      tone: <Badge tone="info">Draft</Badge>,
      inventory: "3 in stock for 50 variants",
      type: "Brew Gear",
      vendor: "Espresso Shot Coffee",
    },
    {
      id: "1015",
      price: "$200",
      product: "Canadiano Brewer",
      tone: <Badge tone="success">Active</Badge>,
      inventory: "890 in stock for 50 variants",
      type: "Brew Merch",
      vendor: "Espresso Shot Coffee",
    },
    {
      id: "1014",
      price: "200",
      product: "Canadiano Brewer White Ash",
      tone: <Badge tone="success">Active</Badge>,
      inventory: "890 in stock for 50 variants",
      type: "Brew Gear",
      vendor: "Espresso Shot Coffee",
    },
    {
      id: "1013",
      price: "$200",
      product: "Canadiano Brewer White Ash",
      tone: <Badge tone="success">Active</Badge>,
      inventory: "890 in stock for 50 variants",
      type: "Brew Gear",
      vendor: "Espresso Shot Coffee",
    },
    {
      id: "1012",
      price: "$200",
      product: "Canadiano Brewer White Ash",
      tone: <Badge tone="success">Active</Badge>,
      inventory: "890 in stock for 50 variants",
      type: "Brew Gear",
      vendor: "Espresso Shot Coffee",
    },
    {
      id: "1011",
      price: "$200",
      product: "Canadiano Brewer White Ash",
      tone: <Badge tone="success">Active</Badge>,
      inventory: "890 in stock for 50 variants",
      type: "Brew Gear",
      vendor: "Espresso Shot Coffee",
    },
    {
      id: "1010",
      price: "$200",
      product: "Canadiano Brewer White Ash",
      tone: <Badge tone="success">Active</Badge>,
      inventory: "890 in stock for 50 variants",
      type: "Brew Gear",
      vendor: "Espresso Shot Coffee",
    },
    {
      id: "1009",
      price: "$200",
      product: "Canadiano Brewer White Ash",
      tone: <Badge tone="success">Active</Badge>,
      inventory: "890 in stock for 50 variants",
      type: "Brew Gear",
      vendor: "Espresso Shot Coffee",
    },
    {
      id: "1008",
      price: "$200",
      product: "Canadiano Brewer White Ash",
      tone: <Badge tone="success">Active</Badge>,
      inventory: "890 in stock for 50 variants",
      type: "Brew Gear",
      vendor: "Espresso Shot Coffee",
    },
    {
      id: "1007",
      price: "$200",
      product: "Canadiano Brewer White Ash",
      tone: <Badge tone="success">Active</Badge>,
      inventory: "890 in stock for 50 variants",
      type: "Brew Gear",
      vendor: "Espresso Shot Coffee",
    },
  ];

  // Define table columns
  const columns: TableColumn<Product>[] = [
    {
      key: "product",
      title: "",
      sortable: false,
      render: (_, item, index) => (
        <img
          src={`https://picsum.photos/50?random=${index}`}
          alt={`product thumbnail ${item.product}`}
        />
      ),
    },
    {
      key: "product",
      title: "Product",
      sortable: true,
    },
    {
      key: "price",
      title: "Price",
      alignment: "end",
      sortable: true,
    },
    {
      key: "tone",
      title: "Status",
      sortable: true,
    },
    {
      key: "inventory",
      title: "Inventory",
      sortable: true,
    },
    {
      key: "type",
      title: "Type",
      sortable: true,
    },
    {
      key: "vendor",
      title: "Vendor",
      sortable: true,
    },
  ];

  // Define sort options
  const sortOptions: SortOption[] = [
    {
      label: "Product",
      value: "product asc",
      directionLabel: "Ascending",
    },
    {
      label: "Product",
      value: "product desc",
      directionLabel: "Descending",
    },
    {
      label: "Status",
      value: "tone asc",
      directionLabel: "A-Z",
    },
    {
      label: "Status",
      value: "tone desc",
      directionLabel: "Z-A",
    },
    {
      label: "Type",
      value: "type asc",
      directionLabel: "A-Z",
    },
    {
      label: "Type",
      value: "type desc",
      directionLabel: "Z-A",
    },
    {
      label: "Vendor",
      value: "vendor asc",
      directionLabel: "Ascending",
    },
    {
      label: "Vendor",
      value: "vendor desc",
      directionLabel: "Descending",
    },
  ];

  // Define filters
  const filters: TableFilter[] = [
    {
      key: "tone",
      label: "Status",
      choices: [
        { label: "Active", value: "active" },
        { label: "Draft", value: "draft" },
        { label: "Archived", value: "archived" },
      ],
      allowMultiple: true,
      shortcut: true,
    },
    {
      key: "type",
      label: "Type",
      choices: [
        { label: "Brew Gear", value: "brew-gear" },
        { label: "Brew Merch", value: "brew-merch" },
      ],
      allowMultiple: true,
      shortcut: true,
    },
  ];

  // Define actions
  const primaryAction: TableAction = {
    content: "Add product",
    onAction: () => {
      alert("Add product action");
    },
  };

  const secondaryActions: TableAction[] = [
    {
      content: "Export",
      accessibilityLabel: "Export product list",
      onAction: () => alert("Export action"),
    },
    {
      content: "Import",
      accessibilityLabel: "Import product list",
      onAction: () => alert("Import action"),
    },
  ];

  // Handle events
  const handleSelectionChange = (selectedIds: string[]) => {
    console.log("Selected products:", selectedIds);
  };

  const handleSearch = (query: string) => {
    console.log("Search query:", query);
    // Implement your search logic here
  };

  const handleTabChange = (selectedTab: number) => {
    console.log("Selected tab:", selectedTab);
    // Implement your tab change logic here
  };

  return (
    <DataTable
      data={products}
      columns={columns}
      resourceName={{
        singular: "product",
        plural: "products",
      }}
      title="Products"
      primaryAction={primaryAction}
      secondaryActions={secondaryActions}
      sortOptions={sortOptions}
      filters={filters}
      hasNextPage={true}
      onNextPage={() => console.log("Next page")}
      onSelectionChange={handleSelectionChange}
      searchPlaceholder="Searching in all"
      onSearch={handleSearch}
      enableTabs={true}
      defaultTabs={["All", "Active", "Draft", "Archived"]}
      onTabChange={handleTabChange}
    />
  );
};

export default Products;
