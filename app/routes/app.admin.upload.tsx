import { json, redirect } from "@remix-run/node";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useActionData, useLoaderData, Form, useNavigation } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Button,
  BlockStack,
  InlineStack,
  Text,
  TextField,
  Select,
  TextArea,
  Banner,
  DropZone,
  Tag,
  FormLayout,
  Spinner,
} from "@shopify/polaris";
import { UploadIcon } from "@shopify/polaris-icons";
import { TitleBar } from "@shopify/app-bridge-react";
import { useState, useCallback } from "react";

import { authenticate } from "app/lib/shopify.server";
import { categoryService } from "app/services/category.server";
import { sectionService } from "app/services/section.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  try {
    const categories = await categoryService.getAllCategories();
    
    return json({
      categories: categories.map(cat => ({
        value: cat.id,
        label: cat.name,
      })),
    });
  } catch (error) {
    console.error("Failed to load categories:", error);
    return json({ categories: [], error: "Failed to load categories" });
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  await authenticate.admin(request);

  try {
    const formData = await request.formData();
    
    // Extract metadata
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const categoryId = formData.get("categoryId") as string;
    const tagsString = formData.get("tags") as string;
    
    // Parse tags
    const tags = tagsString
      ? tagsString.split(",").map(tag => tag.trim()).filter(Boolean)
      : [];

    // Extract files
    const liquidFile = formData.get("liquidFile") as File;
    const cssFile = formData.get("cssFile") as File;
    const jsFile = formData.get("jsFile") as File;
    const schemaFile = formData.get("schemaFile") as File;
    const previewImage = formData.get("previewImage") as File;

    // Validate required fields
    if (!title || !categoryId || !liquidFile) {
      return json({
        success: false,
        error: "Title, category, and liquid file are required",
      });
    }

    // Upload section
    const section = await sectionService.uploadSection(
      {
        liquidFile: liquidFile.size > 0 ? liquidFile : undefined,
        cssFile: cssFile.size > 0 ? cssFile : undefined,
        jsFile: jsFile.size > 0 ? jsFile : undefined,
        schemaFile: schemaFile.size > 0 ? schemaFile : undefined,
        previewImage: previewImage.size > 0 ? previewImage : undefined,
      },
      {
        title,
        description: description || undefined,
        categoryId,
        tags,
      }
    );

    return redirect(`/app/section/${section.id}?uploaded=true`);
  } catch (error) {
    console.error("Failed to upload section:", error);
    return json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to upload section",
    });
  }
};

export default function UploadSection() {
  const { categories } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    categoryId: "",
    tags: "",
  });
  
  const [files, setFiles] = useState({
    liquidFile: null as File | null,
    cssFile: null as File | null,
    jsFile: null as File | null,
    schemaFile: null as File | null,
    previewImage: null as File | null,
  });

  const [tagInput, setTagInput] = useState("");

  const isLoading = navigation.state === "submitting";

  const handleFormChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleFileUpload = useCallback((acceptedFiles: File[], fileType: keyof typeof files) => {
    if (acceptedFiles.length > 0) {
      setFiles(prev => ({ ...prev, [fileType]: acceptedFiles[0] }));
    }
  }, []);

  const handleTagAdd = useCallback(() => {
    if (tagInput.trim()) {
      const currentTags = formData.tags ? formData.tags.split(",").map(t => t.trim()) : [];
      if (!currentTags.includes(tagInput.trim())) {
        const newTags = [...currentTags, tagInput.trim()].join(", ");
        handleFormChange("tags", newTags);
      }
      setTagInput("");
    }
  }, [tagInput, formData.tags, handleFormChange]);

  const handleTagRemove = useCallback((tagToRemove: string) => {
    const currentTags = formData.tags.split(",").map(t => t.trim());
    const newTags = currentTags.filter(tag => tag !== tagToRemove).join(", ");
    handleFormChange("tags", newTags);
  }, [formData.tags, handleFormChange]);

  const currentTags = formData.tags ? formData.tags.split(",").map(t => t.trim()).filter(Boolean) : [];

  return (
    <Page>
      <TitleBar title="Upload Section" />
      
      <Layout>
        <Layout.Section>
          {actionData?.error && (
            <Banner status="critical" title="Upload failed">
              <p>{actionData.error}</p>
            </Banner>
          )}

          <Form method="post" encType="multipart/form-data">
            <Card>
              <BlockStack gap="500">
                <Text variant="headingLg" as="h1">
                  Upload New Section
                </Text>

                <FormLayout>
                  {/* Basic Information */}
                  <FormLayout.Group>
                    <TextField
                      label="Section Title"
                      value={formData.title}
                      onChange={(value) => handleFormChange("title", value)}
                      placeholder="e.g., Hero Banner with Video"
                      required
                      autoComplete="off"
                      name="title"
                    />

                    <Select
                      label="Category"
                      options={[
                        { value: "", label: "Select a category" },
                        ...categories,
                      ]}
                      value={formData.categoryId}
                      onChange={(value) => handleFormChange("categoryId", value)}
                      name="categoryId"
                      required
                    />
                  </FormLayout.Group>

                  <TextArea
                    label="Description"
                    value={formData.description}
                    onChange={(value) => handleFormChange("description", value)}
                    placeholder="Describe what this section does and how to use it..."
                    autoComplete="off"
                    name="description"
                  />

                  {/* Tags */}
                  <div>
                    <Text variant="bodyMd" as="label">
                      Tags
                    </Text>
                    <BlockStack gap="200">
                      <InlineStack gap="200">
                        <TextField
                          value={tagInput}
                          onChange={setTagInput}
                          placeholder="Add a tag..."
                          onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleTagAdd())}
                          autoComplete="off"
                          label=""
                          labelHidden
                        />
                        <Button onClick={handleTagAdd}>Add Tag</Button>
                      </InlineStack>
                      
                      {currentTags.length > 0 && (
                        <InlineStack gap="100">
                          {currentTags.map((tag) => (
                            <Tag key={tag} onRemove={() => handleTagRemove(tag)}>
                              {tag}
                            </Tag>
                          ))}
                        </InlineStack>
                      )}
                      
                      <input
                        type="hidden"
                        name="tags"
                        value={formData.tags}
                      />
                    </BlockStack>
                  </div>
                </FormLayout>

                {/* File Uploads */}
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h2">
                    Section Files
                  </Text>

                  {/* Liquid File (Required) */}
                  <div>
                    <Text variant="bodyMd" as="label">
                      Liquid File (.liquid) *
                    </Text>
                    <DropZone
                      onDrop={(files) => handleFileUpload(files, "liquidFile")}
                      accept=".liquid"
                      type="file"
                    >
                      {files.liquidFile ? (
                        <Text variant="bodyMd">
                          ✅ {files.liquidFile.name}
                        </Text>
                      ) : (
                        <DropZone.FileUpload
                          actionTitle="Upload liquid file"
                          actionHint="or drag and drop"
                        />
                      )}
                    </DropZone>
                    <input
                      type="file"
                      name="liquidFile"
                      hidden
                      aria-label="Liquid file upload"
                      ref={(input) => {
                        if (input && files.liquidFile) {
                          const dt = new DataTransfer();
                          dt.items.add(files.liquidFile);
                          input.files = dt.files;
                        }
                      }}
                    />
                  </div>

                  {/* CSS File (Optional) */}
                  <div>
                    <Text variant="bodyMd" as="label">
                      CSS File (.css)
                    </Text>
                    <DropZone
                      onDrop={(files) => handleFileUpload(files, "cssFile")}
                      accept=".css"
                      type="file"
                    >
                      {files.cssFile ? (
                        <Text variant="bodyMd">
                          ✅ {files.cssFile.name}
                        </Text>
                      ) : (
                        <DropZone.FileUpload
                          actionTitle="Upload CSS file"
                          actionHint="or drag and drop (optional)"
                        />
                      )}
                    </DropZone>
                    <input
                      type="file"
                      name="cssFile"
                      hidden
                      aria-label="CSS file upload"
                      ref={(input) => {
                        if (input && files.cssFile) {
                          const dt = new DataTransfer();
                          dt.items.add(files.cssFile);
                          input.files = dt.files;
                        }
                      }}
                    />
                  </div>

                  {/* JS File (Optional) */}
                  <div>
                    <Text variant="bodyMd" as="label">
                      JavaScript File (.js)
                    </Text>
                    <DropZone
                      onDrop={(files) => handleFileUpload(files, "jsFile")}
                      accept=".js"
                      type="file"
                    >
                      {files.jsFile ? (
                        <Text variant="bodyMd">
                          ✅ {files.jsFile.name}
                        </Text>
                      ) : (
                        <DropZone.FileUpload
                          actionTitle="Upload JS file"
                          actionHint="or drag and drop (optional)"
                        />
                      )}
                    </DropZone>
                    <input
                      type="file"
                      name="jsFile"
                      hidden
                      aria-label="JavaScript file upload"
                      ref={(input) => {
                        if (input && files.jsFile) {
                          const dt = new DataTransfer();
                          dt.items.add(files.jsFile);
                          input.files = dt.files;
                        }
                      }}
                    />
                  </div>

                  {/* Schema File (Optional) */}
                  <div>
                    <Text variant="bodyMd" as="label">
                      Schema File (.json)
                    </Text>
                    <DropZone
                      onDrop={(files) => handleFileUpload(files, "schemaFile")}
                      accept=".json"
                      type="file"
                    >
                      {files.schemaFile ? (
                        <Text variant="bodyMd">
                          ✅ {files.schemaFile.name}
                        </Text>
                      ) : (
                        <DropZone.FileUpload
                          actionTitle="Upload schema file"
                          actionHint="or drag and drop (optional if schema is in liquid file)"
                        />
                      )}
                    </DropZone>
                    <input
                      type="file"
                      name="schemaFile"
                      hidden
                      aria-label="Schema file upload"
                      ref={(input) => {
                        if (input && files.schemaFile) {
                          const dt = new DataTransfer();
                          dt.items.add(files.schemaFile);
                          input.files = dt.files;
                        }
                      }}
                    />
                  </div>

                  {/* Preview Image (Optional) */}
                  <div>
                    <Text variant="bodyMd" as="label">
                      Preview Image (.jpg, .png, .webp)
                    </Text>
                    <DropZone
                      onDrop={(files) => handleFileUpload(files, "previewImage")}
                      accept="image/*"
                      type="file"
                    >
                      {files.previewImage ? (
                        <Text variant="bodyMd">
                          ✅ {files.previewImage.name}
                        </Text>
                      ) : (
                        <DropZone.FileUpload
                          actionTitle="Upload preview image"
                          actionHint="or drag and drop (optional)"
                        />
                      )}
                    </DropZone>
                    <input
                      type="file"
                      name="previewImage"
                      hidden
                      aria-label="Preview image upload"
                      ref={(input) => {
                        if (input && files.previewImage) {
                          const dt = new DataTransfer();
                          dt.items.add(files.previewImage);
                          input.files = dt.files;
                        }
                      }}
                    />
                  </div>
                </BlockStack>

                {/* Submit */}
                <InlineStack align="end" gap="200">
                  <Button
                    variant="primary"
                    submit
                    loading={isLoading}
                    disabled={!formData.title || !formData.categoryId || !files.liquidFile}
                    icon={isLoading ? undefined : UploadIcon}
                  >
                    {isLoading ? (
                      <InlineStack gap="100">
                        <Spinner size="small" />
                        <span>Uploading...</span>
                      </InlineStack>
                    ) : (
                      "Upload Section"
                    )}
                  </Button>
                </InlineStack>
              </BlockStack>
            </Card>
          </Form>
        </Layout.Section>
      </Layout>
    </Page>
  );
}