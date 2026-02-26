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
  size: string;
}

export interface DownloadResponse {
  success: boolean;
  downloadUrl?: string;
  filename?: string;
  error?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

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

export interface HistoryResponse {
  success: boolean;
  data: DownloadHistoryItem[];
  total: number;
}

export interface PlaylistInfo {
  playlistId: string;
  title: string;
  author: string;
  thumbnail: string;
  videoCount: number;
  videos: PlaylistVideo[];
}

export interface PlaylistVideo {
  videoId: string;
  title: string;
  author: string;
  thumbnail: string;
  duration: number;
  index: number;
  selected?: boolean; // For UI selection
}

export interface PlaylistDownloadResponse {
  success: boolean;
  message?: string;
  totalVideos: number;
  downloadedVideos: number;
  failedVideos: string[];
  downloadUrls?: string[];
  filenames?: string[];
  error?: string;
}

export interface PlaylistDownloadProgress {
  playlistId: string;
  totalVideos: number;
  currentVideo: number;
  currentVideoTitle: string;
  currentVideoProgress: number;
  overallProgress: number;
  status: 'pending' | 'downloading' | 'completed' | 'failed';
}
