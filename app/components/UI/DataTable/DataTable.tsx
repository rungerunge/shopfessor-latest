import {
  Card,
  ChoiceList,
  EmptySearchResult,
  Frame,
  IndexFilters,
  IndexTable,
  Page,
  useIndexResourceState,
  useSetIndexFiltersMode,
} from "@shopify/polaris";
import { useCallback, useState } from "react";
import { ReactNode } from "react";

// Generic types for the table component
export interface TableColumn<T = any> {
  key: keyof T;
  title: string;
  alignment?: "start" | "center" | "end";
  sortable?: boolean;
  render?: (value: any, item: T, index: number) => ReactNode;
}

export interface FilterChoice {
  label: string;
  value: string;
}

export interface TableFilter {
  key: string;
  label: string;
  choices: FilterChoice[];
  allowMultiple?: boolean;
  shortcut?: boolean;
}

export interface SortOption {
  label: string;
  value: string;
  directionLabel: string;
}

export interface TableAction {
  content: string;
  accessibilityLabel?: string;
  onAction: () => void;
}

export interface DataTableProps<T> {
  // Required props
  data: T[];
  columns: TableColumn<T>[];
  resourceName: {
    singular: string;
    plural: string;
  };

  // Page props
  title: string;
  primaryAction?: TableAction;
  secondaryActions?: TableAction[];

  // Table props
  sortOptions?: SortOption[];
  filters?: TableFilter[];
  emptyStateTitle?: string;
  emptyStateDescription?: string;

  // Pagination
  hasNextPage?: boolean;
  onNextPage?: () => void;
  hasPreviousPage?: boolean;
  onPreviousPage?: () => void;

  // Selection
  onSelectionChange?: (selectedIds: string[]) => void;

  // Search
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;

  // Tabs/Views
  enableTabs?: boolean;
  defaultTabs?: string[];
  onTabChange?: (selectedTab: number) => void;
}

// Generic Data Table Component
export function DataTable<T extends { id: string }>({
  data,
  columns,
  resourceName,
  title,
  primaryAction,
  secondaryActions = [],
  sortOptions = [],
  filters = [],
  emptyStateTitle = `No ${resourceName.plural} yet`,
  emptyStateDescription = "Try changing the filters or search term",
  hasNextPage = false,
  onNextPage,
  hasPreviousPage = false,
  onPreviousPage,
  onSelectionChange,
  searchPlaceholder = "Searching in all",
  onSearch,
  enableTabs = false,
  defaultTabs = ["All"],
  onTabChange,
}: DataTableProps<T>) {
  // State management
  const [itemStrings, setItemStrings] = useState(defaultTabs);
  const [selected, setSelected] = useState(0);
  const [sortSelected, setSortSelected] = useState(
    sortOptions.length > 0 ? [sortOptions[0].value] : [],
  );
  const { mode, setMode } = useSetIndexFiltersMode();
  const [queryValue, setQueryValue] = useState("");
  const [appliedFilters, setAppliedFilters] = useState<Record<string, any>>({});

  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(data);

  const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  // Filter management
  const handleFilterChange = useCallback((key: string, value: any) => {
    setAppliedFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleFilterRemove = useCallback((key: string) => {
    setAppliedFilters((prev) => {
      const newFilters = { ...prev };
      delete newFilters[key];
      return newFilters;
    });
  }, []);

  const handleFiltersQueryChange = useCallback(
    (value: string) => {
      setQueryValue(value);
      onSearch?.(value);
    },
    [onSearch],
  );

  const handleQueryValueRemove = useCallback(() => {
    setQueryValue("");
    onSearch?.("");
  }, [onSearch]);

  const handleFiltersClearAll = useCallback(() => {
    setAppliedFilters({});
    handleQueryValueRemove();
  }, [handleQueryValueRemove]);

  // Tab management
  const deleteView = (index: number) => {
    const newItemStrings = [...itemStrings];
    newItemStrings.splice(index, 1);
    setItemStrings(newItemStrings);
    setSelected(0);
  };

  const duplicateView = async (name: string) => {
    setItemStrings([...itemStrings, name]);
    setSelected(itemStrings.length);
    await sleep(1);
    return true;
  };

  const onCreateNewView = async (value: string) => {
    await sleep(500);
    setItemStrings([...itemStrings, value]);
    setSelected(itemStrings.length);
    return true;
  };

  // Helper functions
  const isEmpty = (value: any) => {
    if (Array.isArray(value)) {
      return value.length === 0;
    } else {
      return value === "" || value == null;
    }
  };

  const disambiguateLabel = (key: string, value: string[]) => {
    return value.map((val: string) => `${key}: ${val}`).join(", ");
  };

  // Build applied filters for display
  const displayAppliedFilters = Object.entries(appliedFilters)
    .filter(([_, value]) => !isEmpty(value))
    .map(([key, value]) => ({
      key,
      label: disambiguateLabel(key, Array.isArray(value) ? value : [value]),
      onRemove: () => handleFilterRemove(key),
    }));

  // Build table rows
  const rowMarkup = data.map((item, index) => (
    <IndexTable.Row
      id={item.id}
      key={item.id}
      selected={selectedResources.includes(item.id)}
      position={index}
    >
      {columns.map((column) => {
        const value = item[column.key as keyof T];
        const cellContent = column.render
          ? column.render(value, item, index)
          : String(value);

        return (
          <IndexTable.Cell
            key={String(column.key)}
            alignment={column.alignment}
          >
            {cellContent}
          </IndexTable.Cell>
        );
      })}
    </IndexTable.Row>
  ));

  // Empty state
  const emptyStateMarkup = (
    <EmptySearchResult
      title={emptyStateTitle}
      description={emptyStateDescription}
      withIllustration
    />
  );

  // Primary action for tabs
  const primaryTabAction =
    selected === 0
      ? {
          type: "save-as" as const,
          onAction: onCreateNewView,
          disabled: false,
          loading: false,
        }
      : {
          type: "save" as const,
          onAction: async () => {
            await sleep(1);
            return true;
          },
          disabled: false,
          loading: false,
        };

  // Handle selection changes
  const handleTableSelectionChange = useCallback(
    (selectionType: any, toggledItem?: any) => {
      handleSelectionChange(selectionType, toggledItem);
      if (onSelectionChange) {
        // Get updated selection after state change
        setTimeout(() => {
          onSelectionChange(selectedResources);
        }, 0);
      }
    },
    [handleSelectionChange, onSelectionChange, selectedResources],
  );

  // Handle tab selection
  const handleTabSelect = useCallback(
    (index: number) => {
      setSelected(index);
      onTabChange?.(index);
    },
    [onTabChange],
  );

  return (
    <Frame>
      <Page
        title={title}
        primaryAction={
          primaryAction
            ? {
                content: primaryAction.content,
                onAction: primaryAction.onAction,
              }
            : undefined
        }
        secondaryActions={secondaryActions.map((action) => ({
          content: action.content,
          accessibilityLabel: action.accessibilityLabel,
          onAction: action.onAction,
        }))}
        fullWidth
      >
        <Card padding="0">
          <IndexFilters
            sortOptions={sortOptions}
            sortSelected={sortSelected}
            queryValue={queryValue}
            queryPlaceholder={searchPlaceholder}
            onQueryChange={handleFiltersQueryChange}
            onQueryClear={handleQueryValueRemove}
            onSort={setSortSelected}
            primaryAction={enableTabs ? primaryTabAction : undefined}
            cancelAction={{
              onAction: () => {},
              disabled: false,
              loading: false,
            }}
            tabs={
              enableTabs
                ? itemStrings.map((item, index) => ({
                    content: item,
                    index,
                    onAction: () => {},
                    id: `${item}-${index}`,
                    isLocked: index === 0,
                    actions:
                      index === 0
                        ? []
                        : [
                            {
                              type: "rename",
                              onAction: () => {},
                              onPrimaryAction: async (value: string) => {
                                const newItemsStrings = itemStrings.map(
                                  (item, idx) => {
                                    if (idx === index) {
                                      return value;
                                    }
                                    return item;
                                  },
                                );
                                await sleep(1);
                                setItemStrings(newItemsStrings);
                                return true;
                              },
                            },
                            {
                              type: "duplicate",
                              onPrimaryAction: async (name: string) => {
                                await sleep(1);
                                duplicateView(name);
                                return true;
                              },
                            },
                            {
                              type: "edit",
                            },
                            {
                              type: "delete",
                              onPrimaryAction: async () => {
                                await sleep(1);
                                deleteView(index);
                                return true;
                              },
                            },
                          ],
                  }))
                : []
            }
            selected={selected}
            onSelect={handleTabSelect}
            canCreateNewView={enableTabs}
            onCreateNewView={enableTabs ? onCreateNewView : undefined}
            filters={filters.map((filter) => ({
              key: filter.key,
              label: filter.label,
              filter: (
                <ChoiceList
                  title={filter.label}
                  titleHidden
                  choices={filter.choices}
                  selected={appliedFilters[filter.key] || []}
                  onChange={(value) => handleFilterChange(filter.key, value)}
                  allowMultiple={filter.allowMultiple ?? false}
                />
              ),
              shortcut: filter.shortcut ?? false,
            }))}
            appliedFilters={displayAppliedFilters}
            onClearAll={handleFiltersClearAll}
            mode={mode}
            setMode={setMode}
          />
          <IndexTable
            resourceName={resourceName}
            itemCount={data.length}
            selectedItemsCount={
              allResourcesSelected ? "All" : selectedResources.length
            }
            onSelectionChange={handleTableSelectionChange}
            sortable={columns.map((col) => col.sortable ?? false)}
            headings={columns.map((col) => ({
              title: col.title,
              alignment: col.alignment,
            }))}
            emptyState={emptyStateMarkup}
            pagination={{
              hasNext: hasNextPage,
              onNext: onNextPage,
              hasPrevious: hasPreviousPage,
              onPrevious: onPreviousPage,
            }}
          >
            {rowMarkup}
          </IndexTable>
        </Card>
      </Page>
    </Frame>
  );
}
