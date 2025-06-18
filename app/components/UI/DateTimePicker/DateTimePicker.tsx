import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  DatePicker,
  TextField,
  Icon,
  Popover,
  InlineStack,
  ResourceList,
} from "@shopify/polaris";
import { CalendarIcon, ClockIcon } from "@shopify/polaris-icons";

const toInt = (time) =>
    ((h, m) => h * 2 + m / 30)(...time.split(":").map(parseFloat)),
  toTime = (int) => [Math.floor(int / 2), int % 2 ? "30" : "00"].join(":"),
  range = (from, to) =>
    Array(to - from + 1)
      .fill()
      .map((_, i) => from + i),
  eachHalfHour = (t1, t2) => range(...[t1, t2].map(toInt)).map(toTime);

const timeList = eachHalfHour("00:00", "23:30");
const today = new Date();

export const DateTimePicker = ({
  initialValue = Date.now(),
  dateLabel = "Date",
  timeLabel = "Time",
  onChange = () => {},
}) => {
  const isInitialMount = useRef(true);
  const [{ month, year }, setDate] = useState({
    month: today.getMonth(),
    year: today.getFullYear(),
  });
  const [datePopoverActive, setDatePopoverActive] = useState(false);
  const [timePopoverActive, setTimePopoverActive] = useState(false);
  const [selectedDates, setSelectedDates] = useState(
    initialValue
      ? { start: new Date(initialValue), end: new Date(initialValue) }
      : { start: new Date(), end: new Date() },
  );
  const [selectedTime, setSelectedTime] = useState(
    initialValue ? new Date(initialValue).toTimeString().substring(0, 5) : "",
  );

  const dateString = selectedDates.start.toISOString().split("T")[0];

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
    } else if (selectedTime && selectedDates.start) {
      // Create a new date object with the selected date
      const year = selectedDates.start.getFullYear();
      const month = selectedDates.start.getMonth();
      const day = selectedDates.start.getDate();

      // Parse the time string
      const [hours, minutes] = selectedTime.split(":").map(Number);

      // Create a new date object with the local timezone
      const dateTime = new Date(year, month, day, hours, minutes);

      // Convert to ISO string
      onChange(dateTime.toISOString());
    }
  }, [selectedDates, selectedTime]);

  const onDateChange = useCallback((v) => {
    setSelectedDates(v);
    setDatePopoverActive(false);
  }, []);

  const onTimeSelect = useCallback((v) => {
    setSelectedTime(v);
    setTimePopoverActive(false);
  }, []);

  const toggleDatePopoverActive = useCallback(
    () => setDatePopoverActive((v) => !v),
    [],
  );

  const toggleTimePopoverActive = useCallback(
    () => setTimePopoverActive((v) => !v),
    [],
  );

  const handleMonthChange = useCallback(
    (month, year) => setDate({ month, year }),
    [],
  );

  const dateActivator = (
    <TextField
      label={dateLabel}
      value={dateString}
      prefix={<Icon source={CalendarIcon} />}
      onFocus={toggleDatePopoverActive}
    />
  );

  const timeActivator = (
    <TextField
      label={timeLabel}
      value={selectedTime}
      prefix={<Icon source={ClockIcon} />}
      onFocus={toggleTimePopoverActive}
    />
  );

  return (
    <InlineStack gap={"400"}>
      <Popover
        preferredPosition="above"
        active={datePopoverActive}
        activator={dateActivator}
        onClose={toggleDatePopoverActive}
      >
        <div style={{ padding: "16px" }}>
          <DatePicker
            month={month}
            year={year}
            onChange={onDateChange}
            onMonthChange={handleMonthChange}
            selected={selectedDates}
          />
        </div>
      </Popover>
      <Popover
        preferredPosition="above"
        active={timePopoverActive}
        activator={timeActivator}
        onClose={toggleTimePopoverActive}
      >
        <div style={{ minWidth: "120px" }}>
          <ResourceList
            items={timeList}
            renderItem={(time) => (
              <ResourceList.Item id={time} onClick={() => onTimeSelect(time)}>
                {time}
              </ResourceList.Item>
            )}
          />
        </div>
      </Popover>
    </InlineStack>
  );
};
