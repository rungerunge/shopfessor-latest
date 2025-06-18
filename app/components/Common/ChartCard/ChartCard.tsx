import { Card, Text, Box } from "@shopify/polaris";
import { ArrowUpIcon, ArrowDownIcon } from "@shopify/polaris-icons";
import { SparkLineChart } from "@shopify/polaris-viz";
import "@shopify/polaris-viz/build/esm/styles.css";
import { ClientOnly } from "remix-utils/client-only";

interface StatBoxProps {
  title: string;
  value: string | number;
  data?: number[];
}

export const StatBoxElement = ({ title, value, data = [] }: StatBoxProps) => {
  const hasData = data && data.length > 0;
  const percentageChange = hasData
    ? getPercentageChange(Number(data[0]), Number(data.at(-1)))
    : null;

  return (
    <Card padding="0">
      <Box paddingBlock="400" paddingInlineStart="400" paddingInlineEnd="400">
        <Text as="p" variant="headingSm" tone="subdued">
          {title}
        </Text>
        <div
          style={{
            height: 70,
            position: "relative",
            width: "100%",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: "16px",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              maxWidth: 24,
              gap: "4px",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                zIndex: 20,
              }}
            ></div>

            <Text as="h2" variant="headingLg" fontWeight="bold">
              {value}
            </Text>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                marginTop: "2px",
              }}
            >
              {percentageChange !== null && (
                <>
                  {percentageChange > 0 ? (
                    <ArrowUpIcon
                      style={{ height: 12, width: 12 }}
                      fill="#008060"
                    />
                  ) : percentageChange < 0 ? (
                    <ArrowDownIcon
                      style={{ height: 12, width: 12 }}
                      fill="#D72C0D"
                    />
                  ) : null}
                  <Text as="span" variant="bodySm" tone="subdued">
                    <span
                      style={{
                        color:
                          percentageChange > 0
                            ? "#008060"
                            : percentageChange < 0
                              ? "#D72C0D"
                              : undefined,
                        fontWeight: "500",
                      }}
                    >
                      {Math.abs(percentageChange)}%
                    </span>
                  </Text>
                </>
              )}
              {percentageChange === null && (
                <Text as="span" variant="bodySm" tone="subdued">
                  -
                </Text>
              )}
            </div>
          </div>

          {hasData && (
            <div
              style={{
                flex: 1,
                minWidth: "80%",
                height: "100%",
                display: "flex",
                alignItems: "flex-end",
              }}
            >
              <SparkLineChart
                offsetLeft={4}
                offsetRight={0}
                data={formatChartData(data)}
              />
            </div>
          )}
        </div>
      </Box>
    </Card>
  );
};

export function StatBox({ title, value, data = [] }: StatBoxProps) {
  return (
    <ClientOnly fallback={<></>}>
      {() => <StatBoxElement title={title} value={value} data={data} />}
    </ClientOnly>
  );
}

// Formats number array to expected format from polaris-viz chart
const formatChartData = (values: number[] = []) => {
  return [
    {
      data: values.map((stat, idx) => ({
        key: idx,
        value: stat,
      })),
    },
  ];
};

// Gets rate of change based on first + last entry in chart data
const getPercentageChange = (start = 0, end = 0): number | null => {
  if (isNaN(start) || isNaN(end) || start === 0) return null;

  const percentage = Math.round(((end - start) / start) * 100);

  if (percentage > 999) return 999;
  if (percentage < -999) return -999;

  return percentage;
};
