import { Select } from "@shopify/polaris";
import React, { useMemo } from "react";

export const LanguagePicker = (field) => {
  const languageOptions = useMemo(
    () => [
      {
        label: "English",
        value: "en",
      },
      {
        label: "Spanish",
        value: "es",
      },
      {
        label: "French",
        value: "fr",
      },
    ],
    [],
  );

  return (
    <Select
      label="Language"
      placeholder="Choose language"
      options={languageOptions}
      {...field}
    />
  );
};
