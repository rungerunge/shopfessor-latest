import { useState } from "react";
import { Collapsible, Text, Icon, Card } from "@shopify/polaris";
import { MinusIcon, PlusIcon } from "@shopify/polaris-icons";
import styles from "./accordion.module.css";

type AccordionItemProps = {
  index: number;
  header: React.ReactNode;
  content: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
};

export const AccordionItem = ({
  index,
  header,
  content,
  isOpen,
  onToggle,
}: AccordionItemProps) => {
  return (
    <div
      className={`${styles.accordion} ${isOpen ? styles.accordionActive : ""}`}
      onClick={onToggle}
    >
      <div className={styles.accordionHeader}>
        <Text as="p" variant="headingMd" fontWeight="bold">
          {header}
        </Text>
        <div className={styles.iconWrapper}>
          <Icon source={isOpen ? MinusIcon : PlusIcon} />
        </div>
      </div>
      <Collapsible
        open={isOpen}
        id={`accordion-item-${index}`}
        transition={{
          duration: "200ms",
          timingFunction: "ease-in-out",
        }}
        expandOnPrint
      >
        <div className={styles.accordionContent}>{content}</div>
      </Collapsible>
    </div>
  );
};

type AccordionProps = {
  items: { header: React.ReactNode; content: React.ReactNode }[];
  singleOpen?: boolean;
};

export const Accordion = ({ items, singleOpen = false }: AccordionProps) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [itemStates, setItemStates] = useState<boolean[]>(
    items.map(() => false),
  );

  if (!items || !items.length) {
    return null;
  }

  interface HandleToggle {
    (index: number): void;
  }

  const handleToggle: HandleToggle = (index) => {
    if (singleOpen) {
      setOpenIndex(openIndex === index ? null : index);
    } else {
      setItemStates((prevStates: boolean[]) => {
        const newStates = [...prevStates];
        newStates[index] = !newStates[index];
        return newStates;
      });
    }
  };

  return (
    <Card padding={"0"}>
      {items.map((item, index) => (
        <AccordionItem
          key={`accordion-${index}`}
          header={item.header}
          content={item.content}
          isOpen={singleOpen ? openIndex === index : itemStates[index]}
          onToggle={() => handleToggle(index)}
          index={index}
        />
      ))}
    </Card>
  );
};
