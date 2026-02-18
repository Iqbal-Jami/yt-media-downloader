import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { VideoInfo, DownloadResponse, ApiResponse } from '../models/video.model';

@Injectable({
  providedIn: 'root'
})
export class YoutubeService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  getVideoInfo(videoId: string): Observable<ApiResponse<VideoInfo>> {
    return this.http.post<ApiResponse<VideoInfo>>(`${this.apiUrl}/youtube/info`, {
      videoId
    });
  }

  downloadVideo(videoId: string, quality: string, format: 'mp4' | 'mp3'): Observable<DownloadResponse> {
    return this.http.post<DownloadResponse>(`${this.apiUrl}/youtube/download`, {
      videoId,
      quality,
      format
    });
  }

  extractVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}
