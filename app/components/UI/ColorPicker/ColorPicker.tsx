import { Box, InlineStack, Popover, TextField } from "@shopify/polaris";
import React, { useCallback, useState } from "react";
import { HexColorPicker } from "react-colorful";

export default function ColorPicker(field) {
  const [popoverActive, setPopoverActive] = useState(false);
  const togglePopoverActive = useCallback(
    () => setPopoverActive((popoverActive) => !popoverActive),
    [],
  );

  const activator = (
    <button
      style={{
        backgroundColor: field.value,
        borderRadius: "100%",
        padding: "14px",
        cursor: "pointer",
        border: "1px solid #ccc",
      }}
      type="button"
      onClick={togglePopoverActive}
    ></button>
  );

  return (
    <InlineStack gap={"100"}>
      <Popover
        active={popoverActive}
        activator={activator}
        autofocusTarget="first-node"
        onClose={togglePopoverActive}
      >
        <Box padding={"200"}>
          <HexColorPicker color={field.value} onChange={field.onChange} />
        </Box>
      </Popover>
      <div style={{ flex: "1" }}>
        <TextField {...field} />
      </div>
    </InlineStack>
  );
}
