import {
  TextField,
  Popover,
  Listbox,
  Text,
  AutoSelection,
  Scrollable,
  Button,
} from "@shopify/polaris";
import { useState } from "react";
import { countryDialInfo } from "./data";

export const InputPhone = () => {
  const [email, setEmail] = useState("");
  const handleEmailChange = (value) => setEmail(value);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedSegmentIndex, setSelectedSegmentIndex] = useState(0);

  const handleOpenPicker = () => {
    setPickerOpen(true);
  };

  const handleClosePicker = () => {
    setPickerOpen(false);
  };

  const handleSegmentSelect = (segmentIndex) => {
    setSelectedSegmentIndex(Number(segmentIndex));
    handleClosePicker();
  };

  const activator = (
    <Button
      size="large"
      onClick={() => {
        handleOpenPicker();
      }}
    >
      +123
    </Button>
  );

  const segmentList = countryDialInfo.map(({ name, flag, code, dial_code }) => {
    const selected =
      countryDialInfo[selectedSegmentIndex]?.dial_code === dial_code;

    return (
      <Listbox.Option key={dial_code} dial_code={dial_code} selected={selected}>
        <Listbox.TextOption selected={selected}>
          <Text variant="bodyLg">
            {flag} {name} {dial_code}
          </Text>
        </Listbox.TextOption>
      </Listbox.Option>
    );
  });

  const listboxMarkup = (
    <Listbox
      enableKeyboardControl
      autoSelection={AutoSelection.FirstSelected}
      accessibilityLabel="Select a customer segment"
      onSelect={handleSegmentSelect}
    >
      {segmentList}
    </Listbox>
  );

  return (
    <div
      style={{
        display: "flex",
        alignItems: "end",
        gap: "2px",
      }}
    >
      <Popover
        active={pickerOpen}
        activator={activator}
        ariaHaspopup="listbox"
        preferredAlignment="left"
        autofocusTarget="first-node"
        onClose={handleClosePicker}
      >
        <Popover.Pane fixed>
          <div
            style={{
              alignItems: "stretch",
              borderTop: "1px solid #DFE3E8",
              display: "flex",
              flexDirection: "column",
              justifyContent: "stretch",
              position: "relative",
              width: "100%",
              height: "100%",
              overflow: "hidden",
            }}
          >
            <Scrollable
              style={{
                position: "relative",
                width: "310px",
                height: "292px",
                padding: "var(--p-space-100) 0",
                borderBottomLeftRadius: "var(--p-border-radius-100)",
                borderBottomRightRadius: "var(--p-border-radius-100)",
              }}
            >
              {listboxMarkup}
            </Scrollable>
          </div>
        </Popover.Pane>
      </Popover>
      <TextField
        value={email}
        onChange={handleEmailChange}
        label="Email"
        type="email"
        autoComplete="email"
      />
    </div>
  );
};
