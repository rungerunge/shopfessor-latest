import React, { useState, useMemo } from "react";
import {
  BlockStack,
  InlineStack,
  Text,
  Card,
  Button,
  Badge,
  EmptyState,
  ButtonGroup,
  Icon,
  Tooltip,
  Box,
  Pagination,
  TextField,
  Select,
  Spinner,
  Modal,
  TextContainer,
} from "@shopify/polaris";
import {
  LinkIcon,
  FileIcon,
  TextIcon,
  DeleteIcon,
  EditIcon,
  CheckIcon,
  SearchIcon,
  FilterIcon,
  ClockIcon,
  CalendarIcon,
} from "@shopify/polaris-icons";
import { DataSource } from "app/types/data-sources";

interface DataSourceListProps {
  dataSources: DataSource[];
  onDeleteSource: (id: string) => void;
  onEditSource: (source: DataSource) => void;
  loading?: boolean;
}

const ITEMS_PER_PAGE = 10;
const MAX_TITLE_LENGTH = 50;
const MAX_CONTENT_PREVIEW_LENGTH = 120;

export function DataSourceList({
  dataSources,
  onDeleteSource,
  onEditSource,
  loading = false,
}: DataSourceListProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [deleteModalActive, setDeleteModalActive] = useState(false);
  const [sourceToDelete, setSourceToDelete] = useState<string | null>(null);

  const getSourceIcon = (type: string) => {
    if (type.includes("Documents")) return FileIcon;
    if (type.includes("URLs")) return LinkIcon;
    if (type.includes("Text")) return TextIcon;
    return FileIcon;
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  const getStatusTone = (
    status: string,
  ): "success" | "warning" | "critical" | "info" => {
    switch (status.toLowerCase()) {
      case "processed":
      case "ready":
      case "active":
        return "success";
      case "processing":
      case "pending":
        return "warning";
      case "failed":
      case "error":
        return "critical";
      default:
        return "info";
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  // Filter and search logic
  const filteredSources = useMemo(() => {
    return dataSources.filter((source) => {
      const matchesSearch =
        source.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        source.content.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "all" ||
        source.status.toLowerCase() === statusFilter.toLowerCase();

      const matchesType =
        typeFilter === "all" ||
        source.type.toLowerCase().includes(typeFilter.toLowerCase());

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [dataSources, searchQuery, statusFilter, typeFilter]);

  // Pagination logic
  const totalPages = Math.ceil(filteredSources.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedSources = filteredSources.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE,
  );

  // Reset to first page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, typeFilter]);

  const handleDeleteClick = (sourceId: string) => {
    setSourceToDelete(sourceId);
    setDeleteModalActive(true);
  };

  const handleDeleteConfirm = () => {
    if (sourceToDelete) {
      onDeleteSource(sourceToDelete);
      setDeleteModalActive(false);
      setSourceToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModalActive(false);
    setSourceToDelete(null);
  };

  // Get unique statuses and types for filter options
  const statusOptions = [
    { label: "All statuses", value: "all" },
    ...Array.from(new Set(dataSources.map((s) => s.status))).map((status) => ({
      label: status,
      value: status,
    })),
  ];

  const typeOptions = [
    { label: "All types", value: "all" },
    { label: "Documents", value: "documents" },
    { label: "URLs", value: "urls" },
    { label: "Text", value: "text" },
  ];

  if (loading) {
    return (
      <Card>
        <Box padding="800">
          <InlineStack align="center" gap="200">
            <Spinner size="small" />
            <Text as="p" variant="bodyMd">
              Loading data sources...
            </Text>
          </InlineStack>
        </Box>
      </Card>
    );
  }

  if (dataSources.length === 0) {
    return (
      <Card>
        <EmptyState
          heading="No data sources yet"
          image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
        >
          <Text as="p" variant="bodyMd" tone="subdued">
            Add your first data source using the tabs above to get started
          </Text>
        </EmptyState>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <BlockStack gap="400">
          {/* Header */}
          <InlineStack align="space-between" blockAlign="center">
            <Text as="h2" variant="headingMd">
              Data Sources
            </Text>
            <Badge tone="info">
              {filteredSources.length} of {dataSources.length} sources
            </Badge>
          </InlineStack>

          {/* Filters and Search */}
          <BlockStack gap="400">
            <InlineStack gap="400" align="start">
              <div style={{ flex: "1" }}>
                <Box>
                  <TextField
                    label=""
                    placeholder="Search by name or content..."
                    value={searchQuery}
                    onChange={setSearchQuery}
                    prefix={<Icon source={SearchIcon} />}
                    clearButton
                    onClearButtonClick={() => setSearchQuery("")}
                    autoComplete="off"
                  />
                </Box>
              </div>
              <Select
                label=""
                options={statusOptions}
                value={statusFilter}
                onChange={setStatusFilter}
              />
              <Select
                label=""
                options={typeOptions}
                value={typeFilter}
                onChange={setTypeFilter}
              />
            </InlineStack>

            {(searchQuery ||
              statusFilter !== "all" ||
              typeFilter !== "all") && (
              <InlineStack gap="200">
                <Text as="p" variant="bodySm" tone="subdued">
                  <Icon source={FilterIcon} />
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  {filteredSources.length} result
                  {filteredSources.length !== 1 ? "s" : ""} found
                </Text>
                <Button
                  size="micro"
                  variant="plain"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                    setTypeFilter("all");
                  }}
                >
                  Clear filters
                </Button>
              </InlineStack>
            )}
          </BlockStack>

          {/* Results */}
          {filteredSources.length === 0 ? (
            <Card>
              <Box padding="400">
                <InlineStack align="center">
                  <Text as="p" variant="bodyMd" tone="subdued">
                    No data sources match your current filters
                  </Text>
                </InlineStack>
              </Box>
            </Card>
          ) : (
            <BlockStack gap="200">
              {paginatedSources.map((source, index) => (
                <Card key={source.id}>
                  <InlineStack
                    align="space-between"
                    blockAlign="start"
                    gap="400"
                  >
                    <InlineStack gap="400" blockAlign="start">
                      <Box paddingBlockStart="050">
                        <Icon source={getSourceIcon(source.type)} />
                      </Box>

                      <BlockStack gap="200">
                        <Text as="p" variant="bodyMd" fontWeight="semibold">
                          {truncateText(source.name, MAX_TITLE_LENGTH)}
                        </Text>

                        <Text as="p" variant="bodySm" tone="subdued">
                          {truncateText(
                            source.content,
                            MAX_CONTENT_PREVIEW_LENGTH,
                          )}
                        </Text>

                        <InlineStack gap="300" wrap={false}>
                          <Badge
                            tone={getStatusTone(source.status)}
                            icon={
                              source.status.toLowerCase() === "processed"
                                ? CheckIcon
                                : undefined
                            }
                          >
                            {source.status}
                          </Badge>

                          <InlineStack gap="100" blockAlign="center">
                            <Icon source={CalendarIcon} />
                            <Text as="p" variant="bodySm" tone="subdued">
                              {formatDate(source.addedAt)}
                            </Text>
                          </InlineStack>

                          {source.processingTime && (
                            <InlineStack gap="100" blockAlign="center">
                              <Icon source={ClockIcon} />
                              <Text as="p" variant="bodySm" tone="subdued">
                                {source.processingTime}
                              </Text>
                            </InlineStack>
                          )}
                        </InlineStack>
                      </BlockStack>
                    </InlineStack>

                    <ButtonGroup>
                      <Tooltip content="Edit source">
                        <Button
                          size="slim"
                          variant="tertiary"
                          icon={EditIcon}
                          onClick={() => onEditSource(source)}
                          accessibilityLabel={`Edit ${source.name}`}
                        />
                      </Tooltip>
                      <Tooltip content="Delete source">
                        <Button
                          size="slim"
                          icon={DeleteIcon}
                          variant="tertiary"
                          tone="critical"
                          onClick={() => handleDeleteClick(source.id)}
                          accessibilityLabel={`Delete ${source.name}`}
                        />
                      </Tooltip>
                    </ButtonGroup>
                  </InlineStack>
                </Card>
              ))}
            </BlockStack>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <Box paddingBlockStart="400">
              <InlineStack align="center">
                <Pagination
                  hasPrevious={currentPage > 1}
                  onPrevious={() => setCurrentPage(currentPage - 1)}
                  hasNext={currentPage < totalPages}
                  onNext={() => setCurrentPage(currentPage + 1)}
                  label={`Page ${currentPage} of ${totalPages} (${filteredSources.length} items)`}
                />
              </InlineStack>
            </Box>
          )}
        </BlockStack>
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal
        open={deleteModalActive}
        onClose={handleDeleteCancel}
        title="Delete data source"
        primaryAction={{
          content: "Delete",
          onAction: handleDeleteConfirm,
          destructive: true,
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: handleDeleteCancel,
          },
        ]}
      >
        <Modal.Section>
          <TextContainer>
            <Text as="p">
              Are you sure you want to delete this data source? This action
              cannot be undone.
            </Text>
          </TextContainer>
        </Modal.Section>
      </Modal>
    </>
  );
}
