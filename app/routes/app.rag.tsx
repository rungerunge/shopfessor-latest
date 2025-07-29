import { ActionFunctionArgs, LoaderFunctionArgs, json } from "@remix-run/node";
import { DataSource, FileData } from "app/types/data-sources";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import { Layout, Page } from "@shopify/polaris";
import { useState, useCallback, useEffect } from "react";
import {
  DataSourceForm,
  DataSourceList,
} from "app/components/Features/DataSources";
import {
  processFileUpload,
  processTextContent,
  getRecentDataSources,
  deleteDataSource,
  downloadDataSource,
} from "app/services/knowledge-base/data-sources.server";
import { useAppBridge } from "@shopify/app-bridge-react";

export async function loader({ request }: LoaderFunctionArgs) {
  const documents = await getRecentDataSources(20);

  return json({
    documents,
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const contentType = request.headers.get("content-type") || "";

  // Handle multipart form data for file uploads
  if (contentType.includes("multipart/form-data")) {
    return await processFileUpload(request);
  }

  // Handle regular form data for text processing and other actions
  const formData = await request.formData();
  const action = formData.get("_action");

  if (action === "process-text") {
    try {
      const text = formData.get("text") as string;
      const sourceName = formData.get("sourceName") as string;

      if (!text || text.trim().length === 0) {
        return json({ error: "Text content is required" }, { status: 400 });
      }

      if (!sourceName || sourceName.trim().length === 0) {
        return json({ error: "Source name is required" }, { status: 400 });
      }

      const result = await processTextContent(text, sourceName);
      return json({ ...result });
    } catch (error) {
      console.error("Text processing error:", error);
      return json(
        {
          error:
            error instanceof Error ? error.message : "Text processing failed",
        },
        { status: 500 },
      );
    }
  }

  if (action === "delete-source") {
    try {
      const documentId = formData.get("documentId") as string;

      if (!documentId) {
        return json({ error: "Document ID is required" }, { status: 400 });
      }

      const result = await deleteDataSource(documentId);
      return json({ ...result });
    } catch (error) {
      console.error("Delete error:", error);
      return json(
        {
          error: error instanceof Error ? error.message : "Delete failed",
        },
        { status: 500 },
      );
    }
  }

  if (action === "download-source") {
    try {
      const documentId = formData.get("documentId") as string;
      if (!documentId) {
        return json({ error: "Document ID is required" }, { status: 400 });
      }
      const result = await downloadDataSource(documentId);

      // If it's a text file
      if (result.content) {
        return new Response(result.content, {
          status: 200,
          headers: {
            "Content-Type": result.contentType || "text/plain",
            "Content-Disposition": `attachment; filename=\"${result.filename || "file.txt"}\"`,
          },
        });
      }

      // If it's a file URL (S3)
      if (result.url) {
        // Fetch the file from S3 and stream it as an attachment
        const fileRes = await fetch(result.url);
        const fileBuffer = await fileRes.arrayBuffer();
        return new Response(fileBuffer, {
          status: 200,
          headers: {
            "Content-Type": result.contentType || "application/octet-stream",
            "Content-Disposition": `attachment; filename=\"${result.filename || "file"}\"`,
          },
        });
      }

      return json({ error: "No downloadable content found" }, { status: 404 });
    } catch (error) {
      console.error("Download error:", error);
      return json(
        {
          error: error instanceof Error ? error.message : "Download failed",
        },
        { status: 500 },
      );
    }
  }

  return json({ error: "Invalid action" }, { status: 400 });
}

export default function KnowledgeBase() {
  const { documents } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  const [selectedTab, setSelectedTab] = useState(0);
  const [urlInput, setUrlInput] = useState("");
  const [textInput, setTextInput] = useState("");
  const [files, setFiles] = useState<FileData[]>([]);
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const shopify = useAppBridge();

  // Show Shopify toast for action results
  useEffect(() => {
    if (!actionData) return;
    if (hasError(actionData)) {
      shopify.toast.show(actionData.error, { isError: true });
      setIsSubmitting(false);
    } else if (hasSuccess(actionData)) {
      shopify.toast.show(actionData.message);
      setIsSubmitting(false);
      // Clear form after successful submission
      clearForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionData]);

  // Convert database documents to DataSource format
  useEffect(() => {
    const convertedSources: DataSource[] = documents.map((doc: any) => ({
      id: doc.id,
      type: doc.fileType,
      name: doc.originalName,
      content: `${doc.fileType} file (${(doc.fileSize / 1024).toFixed(1)} KB)`,
      status: doc.status.toLowerCase(),
      addedAt: new Date(doc.createdAt).toLocaleString(),
      processingTime: doc.processedAt
        ? (
            (new Date(doc.processedAt).getTime() -
              new Date(doc.createdAt).getTime()) /
            1000
          ).toFixed(1) + "s"
        : undefined,
      fileType: doc.fileType,
      size: doc.fileSize,
    }));
    setDataSources(convertedSources);
  }, [documents]);

  const handleTabChange = useCallback((selectedTabIndex: number) => {
    setSelectedTab(selectedTabIndex);
    // Clear inputs when switching tabs
    setUrlInput("");
    setTextInput("");
    setFiles([]);
  }, []);

  const handleStartProcessing = useCallback(async () => {
    setIsSubmitting(true);
    // This will be handled by the Form component
    // The actual processing is done in the action function
  }, []);

  // Clear form after successful submission
  const clearForm = useCallback(() => {
    setFiles([]);
    setTextInput("");
    setUrlInput("");
    // Clear file input if it exists
    const fileInput = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }
  }, []);

  const canProcess = () => {
    switch (selectedTab) {
      case 0:
        return files.length > 0;
      case 1:
        return textInput.trim().length > 0;
      case 2:
        return urlInput.trim().length > 0;
      default:
        return false;
    }
  };

  // Type guard for action data
  const hasError = (data: any): data is { error: string } =>
    data && typeof data.error === "string";

  const hasSuccess = (
    data: any,
  ): data is {
    success: boolean;
    documentId: string;
    message: string;
    filename?: string;
  } => data && typeof data.success === "boolean";

  return (
    <Page
      title="Knowledge Base"
      subtitle="Knowledge Base Management: Create, update, or remove information sources for your AI agent."
    >
      <Layout>
        <Layout.Section>
          <Form
            method="post"
            encType={selectedTab === 1 ? undefined : "multipart/form-data"}
          >
            <input
              type="hidden"
              name="_action"
              value={selectedTab === 1 ? "process-text" : "upload"}
            />
            {selectedTab === 1 && (
              <>
                <input type="hidden" name="text" value={textInput} />
                <input
                  type="hidden"
                  name="sourceName"
                  value={`Text snippet (${textInput.length} chars)`}
                />
              </>
            )}
            <DataSourceForm
              selectedTab={selectedTab}
              urlInput={urlInput}
              textInput={textInput}
              files={files}
              onTabChange={handleTabChange}
              onUrlInputChange={setUrlInput}
              onTextInputChange={setTextInput}
              onFilesChange={setFiles}
              onStartProcessing={handleStartProcessing}
              canProcess={canProcess()}
              isLoading={isSubmitting}
            />
          </Form>
        </Layout.Section>

        {/* Data Sources List */}
        <Layout.Section>
          <DataSourceList dataSources={dataSources} />
        </Layout.Section>
      </Layout>
    </Page>
  );
}
