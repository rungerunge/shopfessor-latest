import { Button, Card, Image, InlineStack, Link, Text } from "@shopify/polaris";
import { XIcon } from "@shopify/polaris-icons";
import React from "react";

interface AdvertisementProps {
  title: string;
  description: string;
  image: string;
  buttonText: string;
  url: string;
  onClose: () => void;
  bg?: string;
}

export function Advertisement({
  title,
  description,
  image,
  buttonText,
  url,
  onClose,
  bg,
}: AdvertisementProps) {
  return (
    <Card padding="400" background={bg || "bg-fill-brand"}>
      <InlineStack gap="800" direction="row" blockAlign="center">
        <Image
          source={image}
          alt="rocket app"
          style={{ width: "40px", height: "40px" }}
        />
        <div style={{ flex: 1 }}>
          <Text as="p" tone="text-inverse" variant="headingMd">
            {title}
          </Text>
          <Text as="p" tone="text-inverse" variant="bodyLg">
            {description}
          </Text>
        </div>
        <Link url={url} removeUnderline>
          <Button size="large">{buttonText}</Button>
        </Link>
        <Button
          variant="plain"
          icon={XIcon}
          accessibilityLabel="Close"
          onClick={onClose}
        />
      </InlineStack>
    </Card>
  );
}
