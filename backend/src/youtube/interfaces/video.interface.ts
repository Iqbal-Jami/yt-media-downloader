export interface VideoInfo {
  videoId: string;
  title: string;
  author: string;
  thumbnail: string;
  duration: number;
  description?: string;
  uploadDate?: string;
}

export interface VideoFormat {
  quality: string;
  label: string;
  format: string;
  ext: string;
  size?: string;
}

export interface DownloadResponse {
  success: boolean;
  downloadUrl?: string;
  filename?: string;
  error?: string;
}
