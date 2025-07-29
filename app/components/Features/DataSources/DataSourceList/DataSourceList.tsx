import React, { useState, useMemo, useCallback } from "react";
import {
  IndexTable,
  Badge,
  Text,
  Tooltip,
  Box,
  BlockStack,
  Card,
  Button,
  ButtonGroup,
  Icon,
  TextField,
  Select,
  Spinner,
  Modal,
  TextContainer,
  EmptyState,
  InlineStack,
} from "@shopify/polaris";
import {
  LinkIcon,
  FileIcon,
  TextIcon,
  DeleteIcon,
  CircleDownIcon,
  CheckIcon,
  SearchIcon,
  FilterIcon,
  ClockIcon,
} from "@shopify/polaris-icons";
import { DataSource } from "app/types/data-sources";

interface DataSourceListProps {
  dataSources: DataSource[];
  loading?: boolean;
}

const ITEMS_PER_PAGE = 10;
const MAX_TITLE_LENGTH = 50;

export function DataSourceList({
  dataSources,
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

  const handleDeleteCancel = () => {
    setDeleteModalActive(false);
    setSourceToDelete(null);
  };

  const handleDownload = useCallback(
    async (documentId: string, filename: string) => {
      try {
        const res = await fetch("/app/knowledge-base", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: `_action=download-source&documentId=${encodeURIComponent(documentId)}`,
        });
        if (!res.ok) {
          // handle error (optional: show toast)
          return;
        }
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename || "file";
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } catch (e) {
        // handle error (optional: show toast)
      }
    },
    [],
  );

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

  const rowMarkup = paginatedSources.map((source, index) => {
    return (
      <IndexTable.Row id={source.id} key={source.id} position={index}>
        <IndexTable.Cell>
          <Box paddingBlockStart={"200"} paddingBlockEnd={"200"}>
            <InlineStack gap="200" blockAlign="center">
              <div>
                <Icon source={getSourceIcon(source.type)} />
              </div>
              <Text as="span" variant="bodyMd" fontWeight="semibold">
                {truncateText(source.name, MAX_TITLE_LENGTH)}
              </Text>
            </InlineStack>
          </Box>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <Text as="span" variant="bodyMd">
            {source.type}
          </Text>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <Badge
            tone={getStatusTone(source.status)}
            size="medium"
            icon={
              source.status.toLowerCase() === "processed"
                ? CheckIcon
                : undefined
            }
          >
            {source.status}
          </Badge>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <Text as="span" variant="bodyMd">
            {formatDate(source.addedAt)}
          </Text>
        </IndexTable.Cell>
        <IndexTable.Cell>
          {source.processingTime ? (
            <InlineStack gap="100" blockAlign="center">
              <div>
                <Icon source={ClockIcon} />
              </div>
              <Text as="span" variant="bodyMd">
                {source.processingTime}
              </Text>
            </InlineStack>
          ) : (
            <Text as="span" variant="bodyMd" tone="subdued">
              --
            </Text>
          )}
        </IndexTable.Cell>
        <IndexTable.Cell>
          <ButtonGroup>
            <Tooltip content="Download source">
              <Button
                size="slim"
                variant="tertiary"
                icon={CircleDownIcon}
                onClick={() => handleDownload(source.id, source.name)}
                accessibilityLabel={`Download ${source.name}`}
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
        </IndexTable.Cell>
      </IndexTable.Row>
    );
  });

  const EmptyStateTable = () => (
    <Box paddingBlockStart="800" paddingBlockEnd="800">
      <BlockStack align="center" gap="400">
        <Text as="h3" variant="headingLg" alignment="center">
          No data sources found
        </Text>
        <Text variant="bodyMd" as="span" alignment="center">
          Try changing the filters or search term
        </Text>
      </BlockStack>
    </Box>
  );

  if (loading) {
    return (
      <Card>
        <Box padding="800">
          <BlockStack align="center" gap="200">
            <Spinner size="small" />
            <Text as="p" variant="bodyMd">
              Loading data sources...
            </Text>
          </BlockStack>
        </Box>
      </Card>
    );
  }

  if (dataSources.length === 0) {
    return (
      <Card>
        <EmptyState heading="No Data Sources Yet">
          <Text as="p" variant="bodyMd" tone="subdued">
            Use the tabs above to upload files, paste text, or import from URLs.
            These will be added to your knowledge base.
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
          <Box paddingBlockEnd={"400"}>
            <BlockStack gap={"400"}>
              <InlineStack align="space-between" blockAlign="center">
                <Text as="h2" variant="headingMd">
                  Data Sources
                </Text>
                <Badge tone="info">{`${dataSources.length} sources`}</Badge>
              </InlineStack>

              {/* Filters and Search */}
              <InlineStack gap="400" align="start">
                <div style={{ flex: 1 }}>
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
                <InlineStack gap="200" blockAlign="center">
                  <Icon source={FilterIcon} />
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
          </Box>

          {/* Table Results */}
          <IndexTable
            selectable={false}
            resourceName={{ singular: "data source", plural: "data sources" }}
            itemCount={paginatedSources.length}
            headings={[
              { title: "Name" },
              { title: "Type" },
              { title: "Status" },
              { title: "Added At" },
              { title: "Processing Time" },
              { title: "Actions" },
            ]}
            emptyState={<EmptyStateTable />}
            pagination={{
              hasNext: currentPage < totalPages,
              onNext: () => setCurrentPage((prev) => prev + 1),
              hasPrevious: currentPage > 1,
              onPrevious: () => setCurrentPage((prev) => prev - 1),
            }}
          >
            {rowMarkup}
          </IndexTable>
        </BlockStack>
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal
        open={deleteModalActive}
        onClose={handleDeleteCancel}
        title="Delete data source"
        primaryAction={{
          content: "Delete",
          onAction: () => {
            if (sourceToDelete) {
              // Submit the delete form
              const form = document.createElement("form");
              form.method = "post";
              form.innerHTML = `
                <input type="hidden" name="_action" value="delete-source" />
                <input type="hidden" name="documentId" value="${sourceToDelete}" />
              `;
              document.body.appendChild(form);
              form.submit();
              document.body.removeChild(form);
            }
            setDeleteModalActive(false);
            setSourceToDelete(null);
          },
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
              cannot be undone and will remove the file from S3, delete vectors
              from Qdrant, and remove the record from the database.
            </Text>
          </TextContainer>
        </Modal.Section>
      </Modal>
    </>
  );
}
