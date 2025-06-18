export interface EmailJobData {
  to: string;
  subject: string;
  body: string;
  template?: string;
}

export interface ImageProcessingJobData {
  imageUrl: string;
  userId: string;
  transformations: {
    resize?: { width: number; height: number };
    format?: "webp" | "jpeg" | "png";
  };
}

export interface JobTypes {
  "send-email": EmailJobData;
  "process-image": ImageProcessingJobData;
  "generate-report": { userId: string; reportType: string };
}
