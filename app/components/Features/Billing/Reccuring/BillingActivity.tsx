import { useRevalidator } from "@remix-run/react";
import { useState, useCallback, useEffect } from "react";
import {
  Card,
  DataTable,
  Box,
  EmptyState,
  Text,
  Spinner,
  InlineStack,
  Button,
} from "@shopify/polaris";
import { RefreshIcon } from "@shopify/polaris-icons";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { UserActivity } from "@prisma/client";

dayjs.extend(relativeTime);

interface BillingActivityProps {
  activities: UserActivity[];
}

export function BillingActivity({ activities }: BillingActivityProps) {
  const revalidator = useRevalidator();
  const [sortedRows, setSortedRows] = useState<string[][]>([]);

  // Transform activities into table rows whenever activities prop changes
  useEffect(() => {
    if (activities && activities.length > 0) {
      const initialRows = activities.map((activity: UserActivity) => [
        activity.title,
        dayjs(activity.createdAt).fromNow(),
        activity.activityType,
      ]);
      setSortedRows(initialRows);
    } else {
      setSortedRows([]);
    }
  }, [activities]);

  // Sort function for date columns
  function sortDate(rows: string[][], index: number, direction: string) {
    return [...rows].sort((rowA, rowB) => {
      // For the date column (index 1), we need to parse the "fromNow" format back to dates
      if (index === 1) {
        // Find the original activity for each row to get the actual date
        const activityA = activities.find((a) => a.title === rowA[0]);
        const activityB = activities.find((a) => a.title === rowB[0]);

        if (activityA && activityB) {
          const dateA = new Date(activityA.createdAt);
          const dateB = new Date(activityB.createdAt);
          return direction === "descending"
            ? dateB.getTime() - dateA.getTime()
            : dateA.getTime() - dateB.getTime();
        }
      }

      // For other columns, use string comparison
      const valueA = rowA[index].toLowerCase();
      const valueB = rowB[index].toLowerCase();

      if (direction === "descending") {
        return valueB.localeCompare(valueA);
      }
      return valueA.localeCompare(valueB);
    });
  }

  // Handle sorting
  const handleSort = useCallback(
    (index: number, direction: string) => {
      setSortedRows(sortDate(sortedRows, index, direction));
    },
    [sortedRows, activities],
  );

  // Handle refresh - this will revalidate the parent route's loader
  const handleRefresh = () => {
    revalidator.revalidate();
  };

  const isLoading = revalidator.state === "loading";

  return (
    <Card>
      <InlineStack gap="200" align="space-between">
        <Text as="p" variant="headingMd">
          Latest Billing Activity
        </Text>
        <Button
          icon={RefreshIcon}
          size="micro"
          variant="plain"
          loading={isLoading}
          onClick={handleRefresh}
          accessibilityLabel="Refresh billing activity"
        />
      </InlineStack>

      <Box paddingBlock="200" />

      <Card padding="0">
        {isLoading ? (
          <Box padding="400">
            <InlineStack align="center">
              <Spinner
                accessibilityLabel="Loading billing activity"
                size="large"
              />
            </InlineStack>
          </Box>
        ) : sortedRows.length > 0 ? (
          <DataTable
            columnContentTypes={["text", "text", "text"]}
            headings={["Activity", "Date", "Type"]}
            rows={sortedRows}
            defaultSortDirection="descending"
            initialSortColumnIndex={1} // Sort by date initially
            sortable={[true, true, true]}
            onSort={handleSort}
          />
        ) : (
          <EmptyState
            heading="No billing activity yet"
            image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
          >
            <Text as="p">
              There is no billing activity to display yet. Once you subscribe to
              a plan or make changes to your subscription, the activity will
              appear here.
            </Text>
          </EmptyState>
        )}
      </Card>
    </Card>
  );
}

// Alternative simpler version if you prefer less features
export function SimpleBillingActivity({ activities }: BillingActivityProps) {
  const revalidator = useRevalidator();

  const handleRefresh = () => {
    revalidator.revalidate();
  };

  const isLoading = revalidator.state === "loading";

  // Transform activities into simple table rows
  const rows = activities.map((activity: UserActivity) => [
    activity.title,
    dayjs(activity.createdAt).format("MMM DD, YYYY"),
    activity.activityType
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase()),
  ]);

  return (
    <Card>
      <InlineStack gap="200" align="space-between">
        <Text as="p" variant="headingMd">
          Billing Activity
        </Text>
        <Button
          icon={RefreshIcon}
          size="micro"
          variant="plain"
          loading={isLoading}
          onClick={handleRefresh}
          accessibilityLabel="Refresh billing activity"
        />
      </InlineStack>

      <Box paddingBlock="200" />

      {isLoading ? (
        <Box padding="400">
          <InlineStack align="center">
            <Spinner
              accessibilityLabel="Loading billing activity"
              size="large"
            />
          </InlineStack>
        </Box>
      ) : rows.length > 0 ? (
        <DataTable
          columnContentTypes={["text", "text", "text"]}
          headings={["Activity", "Date", "Type"]}
          rows={rows}
        />
      ) : (
        <EmptyState
          heading="No billing activity"
          image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
        >
          <Text as="p">Your billing activity will appear here.</Text>
        </EmptyState>
      )}
    </Card>
  );
}
