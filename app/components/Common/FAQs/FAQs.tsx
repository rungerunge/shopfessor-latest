import { Text } from "@shopify/polaris";
import { Accordion } from "app/components/UI/Accordion/Accordion";

const accordionItems = [
  {
    header: "What is ShopiFast?",
    content: (
      <Text as="p" variant="bodyMd">
        ShopiFast is a powerful Shopify app designed to enhance your store's
        functionality and improve customer experience through advanced features
        and seamless integration.
      </Text>
    ),
  },
  {
    header: "How does ShopiFast work?",
    content: (
      <Text as="p" variant="bodyMd">
        The app integrates directly with your Shopify store to provide enhanced
        functionality. Simply install the app and configure your settings
        through our intuitive dashboard to start seeing results.
      </Text>
    ),
  },
  {
    header: "Is ShopiFast compatible with all product types?",
    content: (
      <Text as="p" variant="bodyMd">
        Yes, ShopiFast is designed to work with all product categories and
        types. Whether you sell physical products, digital goods, or services,
        our app adapts to your store's needs.
      </Text>
    ),
  },
  {
    header: "Does this app increase conversions?",
    content: (
      <Text as="p" variant="bodyMd">
        Absolutely! Merchants have reported significant improvements in
        engagement, conversion rates, and overall store performance after
        implementing ShopiFast in their stores.
      </Text>
    ),
  },
  {
    header: "Is it mobile-friendly?",
    content: (
      <Text as="p" variant="bodyMd">
        Yes, ShopiFast is fully optimized for both desktop and mobile devices,
        ensuring a seamless experience for your customers regardless of how they
        access your store.
      </Text>
    ),
  },
  {
    header: "How do I install and set it up?",
    content: (
      <Text as="p" variant="bodyMd">
        After installing ShopiFast from the Shopify App Store, follow our
        step-by-step onboarding guide. You'll be walked through the initial
        setup, configuration options, and activation process.
      </Text>
    ),
  },
  {
    header: "Where can I get help or support?",
    content: (
      <div>
        <Text as="p" variant="bodyMd">
          You can reach our support team through:
        </Text>
        <ul style={{ paddingLeft: "20px", marginTop: "8px" }}>
          <li>Email: support@shopifast.com</li>
          <li>Live chat inside the app dashboard</li>
        </ul>
      </div>
    ),
  },
  {
    header: "What's the difference between the available features?",
    content: (
      <Text as="p" variant="bodyMd">
        All features are designed to complement each other and can be used
        individually or together. Each feature serves a specific purpose and can
        be customized based on your store's unique requirements and goals.
      </Text>
    ),
  },
  {
    header: "How can I customize the app settings?",
    content: (
      <Text as="p" variant="bodyMd">
        You can fully customize ShopiFast through our settings panel. Adjust
        colors, layouts, functionality options, and more. You can also use the
        Shopify theme editor for deeper customization and integration.
      </Text>
    ),
  },
];

export function Faqs() {
  return <Accordion items={accordionItems} singleOpen={true} />;
}
