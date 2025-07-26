export interface EmailJobData {
  to: string;
  subject: string;
  body: string;
  template?: string;
}

export interface ImageProcessingJobData {
  imageUrl: string;
  transformations: {
    resize?: { width: number; height: number };
    format?: "webp" | "jpeg" | "png";
  };
}

export interface ProcessDocumentJobData {
  documentId: string;
  filePath: string;
  filename: string;
  contentType: string;
}

export interface JobTypes {
  "send-email": EmailJobData;
  "process-image": ImageProcessingJobData;
  "generate-report": { reportType: string };
  "process-document": ProcessDocumentJobData;
}
