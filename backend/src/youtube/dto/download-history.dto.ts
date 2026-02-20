export class DownloadHistoryDto {
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

export class GetHistoryDto {
  limit?: number;
  offset?: number;
}
