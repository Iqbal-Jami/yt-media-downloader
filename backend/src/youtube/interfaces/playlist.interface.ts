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
}

export interface PlaylistDownloadResponse {
  success: boolean;
  message?: string;
  totalVideos: number;
  downloadedVideos: number;
  failedVideos: string[];
  downloadUrls?: string[]; // URLs of downloaded files
  filenames?: string[]; // Filenames of downloaded files
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
