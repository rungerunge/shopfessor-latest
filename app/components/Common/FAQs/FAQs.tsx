import { Text } from "@shopify/polaris";
import { Accordion } from "app/components/UI/Accordion/Accordion";

const accordionItems = [
  {
    header: "What is Lisa AI: Virtual Try-On?",
    content: (
      <Text as="p" variant="bodyMd">
        Lisa AI is an advanced virtual try-on solution that lets your customers
        visualize products like clothing, accessories, or makeup on themselves
        using AI and AR technology.
      </Text>
    ),
  },
  {
    header: "How does the virtual try-on work?",
    content: (
      <Text as="p" variant="bodyMd">
        The app uses generative AI to simulate how products would look on the
        shopper. Customers upload a photo, and the AI generates a realistic
        preview of them wearing or using the product.
      </Text>
    ),
  },
  {
    header: "Is Lisa AI compatible with all product types?",
    content: (
      <Text as="p" variant="bodyMd">
        Currently, Lisa AI works best with fashion, and accessories categories.
        Products like clothing, bags, and jewelry see the most accurate results.
      </Text>
    ),
  },
  {
    header: "Does this app increase conversions?",
    content: (
      <Text as="p" variant="bodyMd">
        Yes! Merchants have reported higher engagement and improved conversion
        rates because shoppers can better visualize how products look on them
        before purchasing.
      </Text>
    ),
  },
  {
    header: "Is it mobile-friendly?",
    content: (
      <Text as="p" variant="bodyMd">
        Absolutely. Lisa AI is optimized for both desktop and mobile, allowing
        seamless virtual try-on experiences across devices.
      </Text>
    ),
  },
  {
    header: "How do I install and set it up?",
    content: (
      <Text as="p" variant="bodyMd">
        After installing the app from the Shopify App Store, follow the in-app
        onboarding instructions. You’ll be guided through connecting products,
        customizing try-on options, and publishing to your storefront.
      </Text>
    ),
  },
  {
    header: "Where can I get help or support?",
    content: (
      <div>
        <Text as="p" variant="bodyMd">
          You can reach the Lisa AI team through:
        </Text>
        <ul style={{ paddingLeft: "20px", marginTop: "8px" }}>
          <li>Email: tryonlisa.ai@gmail.com </li>
          <li>Live chat inside the app dashboard</li>
        </ul>
      </div>
    ),
  },
  {
    header: "What’s the difference between the widgets?",
    content: (
      <Text as="p" variant="bodyMd">
        All widgets provide the same virtual try-on functionality. The
        difference lies in their design and placement. You can use multiple
        widgets to attract customers in different parts of your store product
        pages — giving you full flexibility on how and where to engage shoppers.
      </Text>
    ),
  },
  {
    header: "How can I customize the widget style?",
    content: (
      <Text as="p" variant="bodyMd">
        You can fully customize the widget’s look and feel through the app
        settings — adjust colors, size, button text, theme (dark / light), and
        more. For deeper integration, you can also use the Shopify theme editor
        to fine-tune its position and layout directly in your store's theme.
      </Text>
    ),
  },
];

export function Faqs() {
  return <Accordion items={accordionItems} singleOpen={true} />;
}
