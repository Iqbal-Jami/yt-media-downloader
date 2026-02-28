import { Injectable, signal, computed, effect, linkedSignal } from '@angular/core';
import { VideoInfo, DownloadHistoryItem } from '../models/video.model';

/**
 * Angular 21: Signal-based State Management
 * Using Signals for reactive state without RxJS complexity
 */
@Injectable({
  providedIn: 'root'
})
export class AppStateService {
  // Angular 21: Writable Signals
  private _isLoading = signal(false);
  private _videoInfo = signal<VideoInfo | null>(null);
  private _downloadHistory = signal<DownloadHistoryItem[]>([]);
  private _errorMessage = signal<string>('');
  private _theme = signal<'light' | 'dark'>('dark');

  // Angular 21: Read-only computed signals
  readonly isLoading = this._isLoading.asReadonly();
  readonly videoInfo = this._videoInfo.asReadonly();
  readonly downloadHistory = this._downloadHistory.asReadonly();
  readonly errorMessage = this._errorMessage.asReadonly();
  readonly theme = this._theme.asReadonly();

  // Angular 21: Computed Signals (derived state)
  readonly hasVideo = computed(() => this._videoInfo() !== null);
  readonly hasError = computed(() => this._errorMessage().length > 0);
  readonly downloadCount = computed(() => this._downloadHistory().length);
  readonly recentDownloads = computed(() => 
    this._downloadHistory().slice(0, 5)
  );

  // Angular 21: LinkedSignal (signal that depends on another signal)
  // Automatically updates when videoInfo changes
  readonly videoTitle = linkedSignal(() => 
    this._videoInfo()?.title || 'No video loaded'
  );

  readonly videoDuration = linkedSignal(() => {
    const info = this._videoInfo();
    return info?.duration || '0:00';
  });

  constructor() {
    // Angular 21: Effects - Run side effects when signals change
    effect(() => {
      const error = this._errorMessage();
      if (error) {
        console.error('App Error:', error);
        // Auto-clear error after 5 seconds
        setTimeout(() => this.clearError(), 5000);
      }
    });

    // Save theme to localStorage
    effect(() => {
      const currentTheme = this._theme();
      localStorage.setItem('app-theme', currentTheme);
    });

    // Load history from localStorage on init
    this.loadHistoryFromStorage();
  }

  // State update methods
  setLoading(loading: boolean) {
    this._isLoading.set(loading);
  }

  setVideoInfo(video: VideoInfo | null) {
    this._videoInfo.set(video);
    if (video) {
      this.clearError();
    }
  }

  setError(message: string) {
    this._errorMessage.set(message);
    this._isLoading.set(false);
  }

  clearError() {
    this._errorMessage.set('');
  }

  addToHistory(item: DownloadHistoryItem) {
    // Angular 21: Signal update with immutable pattern
    this._downloadHistory.update(history => [item, ...history]);
    this.saveHistoryToStorage();
  }

  clearHistory() {
    this._downloadHistory.set([]);
    localStorage.removeItem('download-history');
  }

  toggleTheme() {
    this._theme.update(current => current === 'dark' ? 'light' : 'dark');
  }

  private loadHistoryFromStorage() {
    const stored = localStorage.getItem('download-history');
    if (stored) {
      try {
        const history = JSON.parse(stored);
        this._downloadHistory.set(history);
      } catch (e) {
        console.error('Failed to load history:', e);
      }
    }
  }

  private saveHistoryToStorage() {
    const history = this._downloadHistory();
    localStorage.setItem('download-history', JSON.stringify(history));
  }

  // Angular 21: Signal-based computed property for statistics
  readonly statistics = computed(() => {
    const history = this._downloadHistory();
    const videoDownloads = history.filter(h => h.type === 'video').length;
    const audioDownloads = history.filter(h => h.type === 'audio').length;
    
    return {
      total: history.length,
      videos: videoDownloads,
      audio: audioDownloads,
      lastDownload: history[0]?.timestamp || null
    };
  });
}
