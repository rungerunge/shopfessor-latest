export interface DataSource {
  id: string;
  type: string;
  name: string;
  content: string;
  status: string;
  addedAt: string;
  processingTime?: string;
  fileType?: string;
  size?: number;
  url?: string;
  fullText?: string;
  charCount?: number;
}

export interface ProcessingItem {
  id: string;
  jobId?: string;
  type: string;
  name: string;
  content: string;
  progress: number;
  stage: string;
  startTime: number;
  status: 'waiting' | 'processing' | 'completed' | 'failed';
  error?: string;
}

export interface FileData {
  name: string;
  size: number;
  type: string;
}

export type DataSourceType = "Documents / Files" | "Website URLs" | "Raw Text";

export interface TabConfig {
  id: string;
  content: string;
  accessibilityLabel: string;
  panelID: string;
}
