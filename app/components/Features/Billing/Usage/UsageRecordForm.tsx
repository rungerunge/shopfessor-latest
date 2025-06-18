import {
  Card,
  Text,
  BlockStack,
  InlineStack,
  Button,
  TextField,
  Select,
  FormLayout,
} from "@shopify/polaris";
import { UsageActivity } from "app/types/billing";

interface UsageRecordFormProps {
  activities: UsageActivity[];
  selectedActivity: string;
  onActivityChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  amount: string;
  onAmountChange: (value: string) => void;
  onSubmit: () => void;
  onGenerate: () => void;
  isLoading: boolean;
  isDisabled: boolean;
}

export function UsageRecordForm({
  activities,
  selectedActivity,
  onActivityChange,
  description,
  onDescriptionChange,
  amount,
  onAmountChange,
  onSubmit,
  onGenerate,
  isLoading,
  isDisabled,
}: UsageRecordFormProps) {
  return (
    <Card>
      <BlockStack gap="400">
        <InlineStack align="space-between">
          <Text variant="headingMd" as="h2">
            Create Test Usage Record
          </Text>
          <Button onClick={onGenerate}>Generate</Button>
        </InlineStack>

        <FormLayout>
          <FormLayout.Group>
            <Select
              label="Activity Type"
              options={activities.map((a) => ({
                label: a.name,
                value: a.id,
              }))}
              onChange={onActivityChange}
              value={selectedActivity}
            />
          </FormLayout.Group>
          <TextField
            label="Usage Description"
            value={description}
            onChange={onDescriptionChange}
            autoComplete="off"
            placeholder="e.g. API Call - Product Sync"
          />
          <TextField
            label="Amount (USD)"
            type="number"
            value={amount}
            onChange={onAmountChange}
            autoComplete="off"
            prefix="$"
          />
          <Button
            variant="primary"
            onClick={onSubmit}
            loading={isLoading}
            disabled={isDisabled}
          >
            Create Record
          </Button>
        </FormLayout>
      </BlockStack>
    </Card>
  );
}
