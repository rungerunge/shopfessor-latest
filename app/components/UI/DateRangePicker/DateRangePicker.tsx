import {
  Box,
  Button,
  DatePicker,
  Icon,
  Popover,
  Select,
  TextField,
  useBreakpoints,
  Scrollable,
  OptionList,
  InlineGrid,
  BlockStack,
  InlineStack,
} from "@shopify/polaris";
import { useEffect, useRef, useState } from "react";
import { CalendarIcon, ArrowRightIcon } from "@shopify/polaris-icons";

type DateRange = {
  since: Date;
  until: Date;
};

type DateRangePickerProps = {
  onDateRangeChange?: (args: { range: DateRange; rangeType: string }) => void;
  initialDateRange?: DateRange;
  initialRangeType?: string;
};

export function DateRangePicker({
  onDateRangeChange,
  initialDateRange,
  initialRangeType = "today",
}: DateRangePickerProps) {
  const { mdDown, lgUp } = useBreakpoints();
  const shouldShowMultiMonth = lgUp;
  const today = new Date(new Date().setHours(0, 0, 0, 0));
  const yesterday = new Date(
    new Date(new Date().setDate(today.getDate() - 1)).setHours(0, 0, 0, 0),
  );

  const ranges = [
    {
      title: "Today",
      alias: "today",
      period: {
        since: today,
        until: today,
      },
    },
    {
      title: "Yesterday",
      alias: "yesterday",
      period: {
        since: yesterday,
        until: yesterday,
      },
    },
    {
      title: "Last 7 days",
      alias: "last7days",
      period: {
        since: new Date(
          new Date(new Date().setDate(today.getDate() - 7)).setHours(
            0,
            0,
            0,
            0,
          ),
        ),
        until: yesterday,
      },
    },
    {
      title: "Last 30 days",
      alias: "last30days",
      period: {
        since: new Date(
          new Date(new Date().setDate(today.getDate() - 30)).setHours(
            0,
            0,
            0,
            0,
          ),
        ),
        until: yesterday,
      },
    },
    {
      title: "This month",
      alias: "thismonth",
      period: {
        since: new Date(today.getFullYear(), today.getMonth(), 1),
        until: today,
      },
    },
    {
      title: "Last month",
      alias: "lastmonth",
      period: {
        since: new Date(today.getFullYear(), today.getMonth() - 1, 1),
        until: new Date(today.getFullYear(), today.getMonth(), 0),
      },
    },
    {
      title: "Custom",
      alias: "custom",
      period: {
        since: today,
        until: today,
      },
    },
  ];

  const [popoverActive, setPopoverActive] = useState(false);
  const [activeDateRange, setActiveDateRange] = useState(() => {
    if (initialDateRange) {
      return {
        title: "Custom",
        alias: "custom",
        period: {
          since: new Date(initialDateRange.since),
          until: new Date(initialDateRange.until),
        },
      };
    }
    return (
      ranges.find((range) => range.alias === initialRangeType) || ranges[0]
    );
  });
  const [inputValues, setInputValues] = useState({});
  const [{ month, year }, setDate] = useState({
    month: activeDateRange.period.since.getMonth(),
    year: activeDateRange.period.since.getFullYear(),
  });
  const datePickerRef = useRef(null);
  const VALID_YYYY_MM_DD_DATE_REGEX = /^\d{4}-\d{1,2}-\d{1,2}/;

  function isDate(date: string | Date): boolean {
    return !isNaN(new Date(date).getDate());
  }

  interface IsValidYearMonthDayDateString {
    (date: string): boolean;
  }

  const isValidYearMonthDayDateString: IsValidYearMonthDayDateString = (
    date,
  ) => {
    return VALID_YYYY_MM_DD_DATE_REGEX.test(date) && isDate(date);
  };

  interface IsValidDate {
    (date: string): boolean;
  }

  const isValidDate: IsValidDate = (date) => {
    return date.length === 10 && isValidYearMonthDayDateString(date);
  };

  interface ParseYearMonthDayDateString {
    (input: string): Date;
  }

  const parseYearMonthDayDateString: ParseYearMonthDayDateString = (input) => {
    const [year, month, day] = input.split("-");
    return new Date(Number(year), Number(month) - 1, Number(day));
  };

  interface FormatDateToYearMonthDayDateString {
    (date: Date): string;
  }

  const formatDateToYearMonthDayDateString: FormatDateToYearMonthDayDateString =
    (date) => {
      const year: string = String(date.getFullYear());
      let month: string = String(date.getMonth() + 1);
      let day: string = String(date.getDate());
      if (month.length < 2) {
        month = String(month).padStart(2, "0");
      }
      if (day.length < 2) {
        day = String(day).padStart(2, "0");
      }
      return [year, month, day].join("-");
    };

  interface FormatDate {
    (date: Date): string;
  }

  const formatDate: FormatDate = (date) => {
    return formatDateToYearMonthDayDateString(date);
  };

  interface NodeContainsDescendant {
    (rootNode: Node, descendant: Node): boolean;
  }

  const nodeContainsDescendant: NodeContainsDescendant = (
    rootNode,
    descendant,
  ) => {
    if (rootNode === descendant) {
      return true;
    }
    let parent: Node | null = descendant.parentNode;
    while (parent != null) {
      if (parent === rootNode) {
        return true;
      }
      parent = parent.parentNode;
    }
    return false;
  };

  interface IsNodeWithinPopover {
    (node: Node): boolean;
  }

  const isNodeWithinPopover: IsNodeWithinPopover = (node) => {
    return datePickerRef?.current
      ? nodeContainsDescendant(datePickerRef.current as Node, node)
      : false;
  };

  interface HandleStartInputValueChange {
    (value: string): void;
  }

  const handleStartInputValueChange: HandleStartInputValueChange = (value) => {
    setInputValues((prevState: Record<string, string>) => {
      return { ...prevState, since: value };
    });
    if (isValidDate(value)) {
      const newSince = parseYearMonthDayDateString(value);
      setActiveDateRange((prevState) => {
        const newPeriod =
          prevState.period && newSince <= prevState.period.until
            ? { since: newSince, until: prevState.period.until }
            : { since: newSince, until: newSince };
        return {
          ...prevState,
          period: newPeriod,
        };
      });
    }
  };

  interface HandleEndInputValueChange {
    (value: string): void;
  }

  const handleEndInputValueChange: HandleEndInputValueChange = (value) => {
    setInputValues((prevState: Record<string, string>) => ({
      ...prevState,
      until: value,
    }));
    if (isValidDate(value)) {
      const newUntil = parseYearMonthDayDateString(value);
      setActiveDateRange((prevState) => {
        const newPeriod =
          prevState.period && newUntil >= prevState.period.since
            ? { since: prevState.period.since, until: newUntil }
            : { since: newUntil, until: newUntil };
        return {
          ...prevState,
          period: newPeriod,
        };
      });
    }
  };

  function handleInputBlur({
    relatedTarget,
  }: React.FocusEvent<HTMLInputElement>) {
    const isRelatedTargetWithinPopover =
      relatedTarget != null &&
      isNodeWithinPopover(relatedTarget as unknown as Node);
    if (isRelatedTargetWithinPopover) {
      return;
    }
    setPopoverActive(false);
  }

  interface HandleMonthChange {
    (month: number, year: number): void;
  }

  const handleMonthChange: HandleMonthChange = (month, year) => {
    setDate({ month, year });
  };

  function handleCalendarChange({ start, end }: { start: Date; end: Date }) {
    const newDateRange = ranges.find((range) => {
      return (
        range.period.since.valueOf() === start.valueOf() &&
        range.period.until.valueOf() === end.valueOf()
      );
    }) || {
      alias: "custom",
      title: "Custom",
      period: {
        since: start,
        until: end,
      },
    };
    setActiveDateRange(newDateRange);
  }

  function apply() {
    if (onDateRangeChange) {
      onDateRangeChange({
        range: activeDateRange.period,
        rangeType: activeDateRange.alias,
      });
    }
    setPopoverActive(false);
  }

  function cancel() {
    setPopoverActive(false);
  }

  useEffect(() => {
    if (activeDateRange) {
      setInputValues({
        since: formatDate(activeDateRange.period.since),
        until: formatDate(activeDateRange.period.until),
      });

      interface MonthYear {
        month: number;
        year: number;
      }

      function monthDiff(referenceDate: MonthYear, newDate: MonthYear): number {
        return (
          newDate.month -
          referenceDate.month +
          12 * (referenceDate.year - newDate.year)
        );
      }

      const monthDifference = monthDiff(
        { year, month },
        {
          year: activeDateRange.period.until.getFullYear(),
          month: activeDateRange.period.until.getMonth(),
        },
      );

      if (monthDifference > 1 || monthDifference < 0) {
        setDate({
          month: activeDateRange.period.until.getMonth(),
          year: activeDateRange.period.until.getFullYear(),
        });
      }
    }
  }, [activeDateRange]);

  const buttonValue =
    activeDateRange.title === "Custom"
      ? activeDateRange.period.since.toDateString() +
        " - " +
        activeDateRange.period.until.toDateString()
      : activeDateRange.title;

  return (
    <Popover
      active={popoverActive}
      autofocusTarget="none"
      preferredAlignment="left"
      preferredPosition="below"
      fluidContent
      sectioned={false}
      fullHeight
      activator={
        <Button
          size="large"
          icon={CalendarIcon}
          onClick={() => setPopoverActive(!popoverActive)}
        >
          {buttonValue}
        </Button>
      }
      onClose={() => setPopoverActive(false)}
    >
      <Popover.Pane fixed>
        <div ref={datePickerRef}>
          <InlineGrid
            columns={{
              xs: "1fr",

              md: "max-content max-content",
            }}
            gap={"0"}
          >
            <Box
              maxWidth={mdDown ? "516px" : "212px"}
              width={mdDown ? "100%" : "212px"}
              padding={{ xs: "500", md: "0" }}
              paddingBlockEnd={{ xs: "100", md: "0" }}
            >
              {mdDown ? (
                <Select
                  label="dateRangeLabel"
                  labelHidden
                  onChange={(value) => {
                    const result = ranges.find(
                      ({ title, alias }) => title === value || alias === value,
                    );
                    setActiveDateRange(result);
                  }}
                  value={activeDateRange?.title || activeDateRange?.alias || ""}
                  options={ranges.map(({ alias, title }) => title || alias)}
                />
              ) : (
                <Scrollable style={{ height: "334px" }}>
                  <OptionList
                    options={ranges.map((range) => ({
                      value: range.alias,
                      label: range.title,
                    }))}
                    selected={activeDateRange.alias}
                    onChange={(value) => {
                      setActiveDateRange(
                        ranges.find((range) => range.alias === value[0]),
                      );
                    }}
                  />
                </Scrollable>
              )}
            </Box>
            <Box padding={{ xs: "500" }} maxWidth={mdDown ? "320px" : "516px"}>
              <BlockStack gap="400">
                <InlineStack gap="200">
                  <div style={{ flexGrow: 1 }}>
                    <TextField
                      role="combobox"
                      label={"Since"}
                      labelHidden
                      prefix={<Icon source={CalendarIcon} />}
                      value={inputValues.since}
                      onChange={handleStartInputValueChange}
                      onBlur={handleInputBlur}
                      autoComplete="off"
                    />
                  </div>
                  <Icon source={ArrowRightIcon} />
                  <div style={{ flexGrow: 1 }}>
                    <TextField
                      role="combobox"
                      label={"Until"}
                      labelHidden
                      prefix={<Icon source={CalendarIcon} />}
                      value={inputValues.until}
                      onChange={handleEndInputValueChange}
                      onBlur={handleInputBlur}
                      autoComplete="off"
                    />
                  </div>
                </InlineStack>
                <div>
                  <DatePicker
                    month={month}
                    year={year}
                    selected={{
                      start: activeDateRange.period.since,
                      end: activeDateRange.period.until,
                    }}
                    onMonthChange={handleMonthChange}
                    onChange={handleCalendarChange}
                    multiMonth={shouldShowMultiMonth}
                    allowRange
                  />
                </div>
              </BlockStack>
            </Box>
          </InlineGrid>
        </div>
      </Popover.Pane>
      <Popover.Pane fixed>
        <Popover.Section>
          <Box paddingBlockEnd={"200"}>
            <InlineStack align="end" gap={"200"}>
              <Button onClick={cancel}>Cancel</Button>
              <Button variant={"primary"} onClick={apply}>
                Apply
              </Button>
            </InlineStack>
          </Box>
        </Popover.Section>
      </Popover.Pane>
    </Popover>
  );
}
