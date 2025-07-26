import {
  BlockStack,
  InlineStack,
  Text,
  Card,
  Button,
  TextField,
  DropZone,
  Thumbnail,
  Banner,
  LegacyCard,
  Tabs,
  Box,
  Icon,
} from "@shopify/polaris";
import { FileIcon } from "@shopify/polaris-icons";
import { useCallback, useRef } from "react";
import { FileData } from "app/types/data-sources";

interface DataSourceFormProps {
  selectedTab: number;
  urlInput: string;
  textInput: string;
  files: FileData[];
  onTabChange: (selectedTabIndex: number) => void;
  onUrlInputChange: (value: string) => void;
  onTextInputChange: (value: string) => void;
  onFilesChange: (files: FileData[]) => void;
  onStartProcessing: () => void;
  canProcess: boolean;
}

const tabs = [
  {
    id: "documents-tab",
    content: "Documents / Files",
    accessibilityLabel: "Upload documents and files",
    panelID: "documents-panel",
  },
  {
    id: "urls-tab",
    content: "Website URLs",
    accessibilityLabel: "Add website URLs",
    panelID: "urls-panel",
  },
  {
    id: "text-tab",
    content: "Raw Text",
    accessibilityLabel: "Add raw text content",
    panelID: "text-panel",
  },
];

export function DataSourceForm({
  selectedTab,
  urlInput,
  textInput,
  files,
  onTabChange,
  onUrlInputChange,
  onTextInputChange,
  onFilesChange,
  onStartProcessing,
  canProcess,
}: DataSourceFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFilesChange = useCallback(
    (files: File[]) => {
      if (files.length > 0) {
        const file = files[0];

        // Set the file in the hidden input
        if (fileInputRef.current) {
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(file);
          fileInputRef.current.files = dataTransfer.files;
        }

        const fileData: FileData[] = [
          {
            name: file.name,
            size: file.size,
            type: file.type || "unknown",
          },
        ];
        onFilesChange(fileData);
      }
    },
    [onFilesChange],
  );

  const handleFileInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = event.target.files;
      if (selectedFiles && selectedFiles.length > 0) {
        const file = selectedFiles[0];

        const fileData: FileData[] = [
          {
            name: file.name,
            size: file.size,
            type: file.type || "unknown",
          },
        ];
        onFilesChange(fileData);
      }
    },
    [onFilesChange],
  );

  const renderTabContent = () => {
    const tabContentStyle = {
      minHeight: "240px",
      overflow: "auto" as const,
      display: "flex",
      flexDirection: "column" as const,
      gap: "14px",
    };

    switch (selectedTab) {
      case 0: // Documents
        return (
          <div style={tabContentStyle}>
            <input
              ref={fileInputRef}
              type="file"
              name="file"
              accept=".pdf,.docx,.txt,.csv,.xlsx"
              onChange={handleFileInputChange}
              style={{ display: "none" }}
            />

            <DropZone onDrop={handleFilesChange} allowMultiple={false}>
              <Box padding="600">
                {files.length > 0 ? (
                  <BlockStack gap="200">
                    {files.map((file, index) => (
                      <InlineStack key={index} gap="300" align="center">
                        <Thumbnail
                          size="small"
                          alt={file.name}
                          source={
                            file.type.startsWith("image/")
                              ? URL.createObjectURL(
                                  new File([], file.name, { type: file.type }),
                                )
                              : "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTUgMTVIMTVWMTdINVYxNVpNNSA5SDE1VjExSDVWOVpNNSAzSDE1VjVINVYzWiIgZmlsbD0iIzYzNjM2MyIvPgo8L3N2Zz4K"
                          }
                        />
                        <BlockStack gap="100">
                          <Text as="p" variant="bodyMd" fontWeight="medium">
                            {file.name}
                          </Text>
                          <Text as="p" variant="bodySm" tone="subdued">
                            {(file.size / 1024).toFixed(1)} KB •{" "}
                            {file.type || "Unknown type"}
                          </Text>
                        </BlockStack>
                      </InlineStack>
                    ))}
                  </BlockStack>
                ) : (
                  <BlockStack gap="200" inlineAlign="center">
                    <Icon source={FileIcon} />
                    <Text as="p" variant="bodyMd">
                      Drop documents here or click to upload
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      Supports PDF, DOC, DOCX, TXT, RTF, CSV, XLS, XLSX and
                      other document formats
                    </Text>
                  </BlockStack>
                )}
              </Box>
            </DropZone>

            <Banner tone="info">
              <Text as="p" variant="bodySm">
                <strong>Supported formats:</strong> PDF, Word documents, Excel
                files, Text files, RTF, and more. Maximum file size: 50MB per
                file.
              </Text>
            </Banner>
          </div>
        );

      case 1: // URLs
        return (
          <div style={tabContentStyle}>
            <TextField
              label="Website URL"
              value={urlInput}
              onChange={onUrlInputChange}
              placeholder="https://example.com"
              helpText="Enter the complete website URL you want to process"
              autoComplete="url"
            />

            <Banner tone="info">
              <Text as="p" variant="bodySm">
                <strong>Note:</strong> Processing extracts text content only.
                Media files and dynamic content may not be included.
              </Text>
            </Banner>
          </div>
        );

      case 2: // Text
        return (
          <div style={tabContentStyle}>
            <TextField
              label="Text Content"
              value={textInput}
              onChange={onTextInputChange}
              multiline={8}
              placeholder="Enter your text content here...&#10;&#10;You can paste:&#10;• Articles or blog posts&#10;• Documentation&#10;• Notes or instructions&#10;• Any other text-based content"
              helpText="Paste or type the raw text content you want to add as a data source"
              autoComplete="off"
            />

            {textInput.length > 0 && (
              <Banner
                tone={
                  textInput.length < 100
                    ? "warning"
                    : textInput.length > 10000
                      ? "critical"
                      : "success"
                }
              >
                <Text as="p" variant="bodySm">
                  <strong>Character count:</strong> {textInput.length} •
                  {textInput.length < 100
                    ? " Text is quite short - consider adding more content."
                    : textInput.length > 10000
                      ? " Very large text - consider breaking into smaller chunks."
                      : " Good text length for processing."}
                </Text>
              </Banner>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card>
      <BlockStack gap="500">
        <Text as="h2" variant="headingMd">
          Add New Data Source
        </Text>

        <LegacyCard>
          <Tabs tabs={tabs} selected={selectedTab} onSelect={onTabChange}>
            <LegacyCard.Section>
              <BlockStack gap="400">
                {renderTabContent()}

                <InlineStack align="end">
                  <Button
                    variant="primary"
                    disabled={!canProcess}
                    onClick={onStartProcessing}
                    submit
                  >
                    Start Processing
                  </Button>
                </InlineStack>
              </BlockStack>
            </LegacyCard.Section>
          </Tabs>
        </LegacyCard>
      </BlockStack>
    </Card>
  );
}
