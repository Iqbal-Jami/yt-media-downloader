export interface DownloadHistoryItem {
  id: string;
  videoId: string;
  title: string;
  author: string;
  thumbnail: string;
  quality: string;
  format: string;
  downloadDate: Date;
  fileSize?: string;
  duration?: number;
}

export interface DownloadHistoryResponse {
  success: boolean;
  data: DownloadHistoryItem[];
  total: number;
}
