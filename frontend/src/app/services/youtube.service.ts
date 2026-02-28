import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { shareReplay, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { VideoInfo, DownloadResponse, ApiResponse, HistoryResponse, DownloadHistoryItem, PlaylistInfo, PlaylistDownloadResponse, PlaylistDownloadProgress } from '../models/video.model';

export interface DownloadProgress {
  videoId: string;
  quality: string;
  format: string;
  progress: number;
}

@Injectable({
  providedIn: 'root'
})
export class YoutubeService {
  private apiUrl = environment.apiUrl;
  private progressSubjects = new Map<string, Subject<number>>();
  private playlistProgressSubjects = new Map<string, Subject<PlaylistDownloadProgress>>();
  private videoInfoCache = new Map<string, Observable<ApiResponse<VideoInfo>>>();
  private playlistInfoCache = new Map<string, Observable<ApiResponse<PlaylistInfo>>>();

  constructor(private http: HttpClient) { }

  getVideoInfo(videoId: string): Observable<ApiResponse<VideoInfo>> {
    // Check cache first for instant response
    if (!this.videoInfoCache.has(videoId)) {
      const request$ = this.http.post<ApiResponse<VideoInfo>>(`${this.apiUrl}/youtube/info`, {
        videoId
      }).pipe(
        shareReplay({ bufferSize: 1, refCount: true })
      );
      this.videoInfoCache.set(videoId, request$);
      
      // Clear cache after 5 minutes
      setTimeout(() => this.videoInfoCache.delete(videoId), 300000);
    }
    return this.videoInfoCache.get(videoId)!;
  }

  downloadVideo(videoId: string, quality: string, format: 'mp4' | 'mp3'): Observable<DownloadResponse> {
    return this.http.post<DownloadResponse>(`${this.apiUrl}/youtube/download`, {
      videoId,
      quality,
      format
    });
  }

  watchDownloadProgress(videoId: string, quality: string, format: string): Observable<number> {
    const key = `${videoId}_${quality}_${format}`;
    
    if (!this.progressSubjects.has(key)) {
      const subject = new Subject<number>();
      this.progressSubjects.set(key, subject);

      // Encode URL parameters properly
      const encodedVideoId = encodeURIComponent(videoId);
      const encodedQuality = encodeURIComponent(quality);
      const encodedFormat = encodeURIComponent(format);
      
      // Connect to SSE endpoint
      const eventSource = new EventSource(
        `${this.apiUrl}/youtube/download/progress/${encodedVideoId}/${encodedQuality}/${encodedFormat}`
      );

      eventSource.onopen = () => {
        subject.next(0);
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.progress !== undefined) {
            subject.next(data.progress);
            
            // Complete and cleanup when download finishes
            if (data.progress >= 100) {
              setTimeout(() => {
                subject.complete();
                eventSource.close();
                this.progressSubjects.delete(key);
              }, 500);
            }
          }
        } catch (error) {
          console.error('Error parsing SSE data:', error);
        }
      };

      eventSource.onerror = () => {
        // SSE connection closed (normal when download completes)
        eventSource.close();
        // Don't complete on error immediately, keep the subject open for manual updates
        this.progressSubjects.delete(key);
      };

      // Cleanup after 5 minutes to prevent memory leaks
      setTimeout(() => {
        if (this.progressSubjects.has(key)) {
          eventSource.close();
          subject.complete();
          this.progressSubjects.delete(key);
        }
      }, 300000);
    }

    return this.progressSubjects.get(key)!.asObservable();
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

  // Playlist Methods
  extractPlaylistId(url: string): string | null {
    const patterns = [
      /[?&]list=([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]+)$/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  isPlaylistUrl(url: string): boolean {
    return url.includes('list=') || url.includes('playlist');
  }

  getPlaylistInfo(playlistId: string): Observable<ApiResponse<PlaylistInfo>> {
    // Check cache first for instant response
    if (!this.playlistInfoCache.has(playlistId)) {
      const request$ = this.http.post<ApiResponse<PlaylistInfo>>(`${this.apiUrl}/youtube/playlist/info`, {
        playlistId
      }).pipe(
        shareReplay({ bufferSize: 1, refCount: true })
      );
      this.playlistInfoCache.set(playlistId, request$);
      
      // Clear cache after 5 minutes
      setTimeout(() => this.playlistInfoCache.delete(playlistId), 300000);
    }
    return this.playlistInfoCache.get(playlistId)!;
  }

  downloadPlaylist(
    playlistId: string, 
    quality: string, 
    format: 'mp4' | 'mp3',
    selectedVideoIds?: string[]
  ): Observable<PlaylistDownloadResponse> {
    return this.http.post<PlaylistDownloadResponse>(`${this.apiUrl}/youtube/playlist/download`, {
      playlistId,
      quality,
      format,
      selectedVideoIds
    });
  }

  watchPlaylistProgress(playlistId: string): Observable<PlaylistDownloadProgress> {
    const key = playlistId;
    
    if (!this.playlistProgressSubjects.has(key)) {
      const subject = new Subject<PlaylistDownloadProgress>();
      this.playlistProgressSubjects.set(key, subject);

      const encodedPlaylistId = encodeURIComponent(playlistId);
      
      // Connect to SSE endpoint for playlist progress
      const eventSource = new EventSource(
        `${this.apiUrl}/youtube/playlist/progress/${encodedPlaylistId}`
      );

      eventSource.onopen = () => {
        // Connection opened
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          subject.next(data);
          
          // Complete and cleanup when download finishes
          if (data.status === 'completed' || data.status === 'failed') {
            setTimeout(() => {
              subject.complete();
              eventSource.close();
              this.playlistProgressSubjects.delete(key);
            }, 1000);
          }
        } catch (error) {
          console.error('Error parsing playlist SSE data:', error);
        }
      };

      eventSource.onerror = () => {
        // SSE connection closed (normal when playlist download completes)
        eventSource.close();
        this.playlistProgressSubjects.delete(key);
      };

      // Cleanup after 30 minutes to prevent memory leaks
      setTimeout(() => {
        if (this.playlistProgressSubjects.has(key)) {
          eventSource.close();
          subject.complete();
          this.playlistProgressSubjects.delete(key);
        }
      }, 1800000);
    }

    return this.playlistProgressSubjects.get(key)!.asObservable();
  }

  // Download History Methods
  getHistory(limit: number = 50, offset: number = 0): Observable<HistoryResponse> {
    return this.http.get<HistoryResponse>(`${this.apiUrl}/youtube/history`, {
      params: { limit: limit.toString(), offset: offset.toString() }
    });
  }

  clearHistory(): Observable<any> {
    return this.http.delete(`${this.apiUrl}/youtube/history`);
  }

  deleteHistoryItem(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/youtube/history/${id}`);
  }
}
