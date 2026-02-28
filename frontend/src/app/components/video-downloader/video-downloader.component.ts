import { Component, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { YoutubeService } from '../../services/youtube.service';
import { SeoService } from '../../services/seo.service';
import { VideoInfo, VideoFormat, DownloadHistoryItem, PlaylistInfo, PlaylistVideo, PlaylistDownloadProgress } from '../../models/video.model';

declare const particlesJS: any;

@Component({
  selector: 'app-video-downloader',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './video-downloader.component.html',
  styleUrls: ['./video-downloader.component.scss']
})
export class VideoDownloaderComponent implements AfterViewInit {
  videoUrl = '';
  isLoading = false;
  errorMessage = '';
  videoInfo: VideoInfo | null = null;
  activeTab: 'video' | 'audio' = 'video';
  mainView: 'downloader' | 'history' = 'downloader';
  
  // History
  downloadHistory: DownloadHistoryItem[] = [];
  historyLoading = false;
  historyTotal = 0;

  // Playlist properties
  isPlaylist = false;
  playlistInfo: PlaylistInfo | null = null;
  playlistDownloading = false;
  playlistProgress: PlaylistDownloadProgress | null = null;
  selectedPlaylistVideos = new Set<string>();
  selectAllPlaylist = false;

  videoFormats: VideoFormat[] = [
    { quality: '1080p', label: 'Full HD (1080p)', format: 'mp4', ext: 'mp4', size: '~500MB' },
    { quality: '720p', label: 'HD (720p)', format: 'mp4', ext: 'mp4', size: '~200MB' },
    { quality: '480p', label: 'SD (480p)', format: 'mp4', ext: 'mp4', size: '~100MB' },
    { quality: '360p', label: 'Low (360p)', format: 'mp4', ext: 'mp4', size: '~50MB' },
    { quality: '144p', label: 'Mobile (144p)', format: 'mp4', ext: 'mp4', size: '~20MB' }
  ];

  audioFormats: VideoFormat[] = [
    { quality: '320kbps', label: 'High Quality MP3', format: 'mp3', ext: 'mp3', size: '~10MB' },
    { quality: '256kbps', label: 'Good Quality MP3', format: 'mp3', ext: 'mp3', size: '~8MB' },
    { quality: '192kbps', label: 'Standard Quality MP3', format: 'mp3', ext: 'mp3', size: '~6MB' },
    { quality: '128kbps', label: 'Low Quality MP3', format: 'mp3', ext: 'mp3', size: '~4MB' }
  ];

  downloadingFormats = new Set<string>();
  downloadProgress = new Map<string, number>();

  constructor(
    private youtubeService: YoutubeService,
    private seoService: SeoService
  ) {
    // Set SEO meta tags
    this.seoService.setDefaultTags();
    this.seoService.addWebApplicationSchema();
  }

  ngAfterViewInit() {
    // Load history on component init
    this.loadHistory();
    
    // Initialize particles.js for cyber effect
    if (typeof particlesJS !== 'undefined') {
      particlesJS('particles-js', {
        particles: {
          number: {
            value: 80,
            density: {
              enable: true,
              value_area: 800
            }
          },
          color: {
            value: '#00f3ff'
          },
          shape: {
            type: 'circle',
            stroke: {
              width: 0,
              color: '#000000'
            }
          },
          opacity: {
            value: 0.3,
            random: true,
            anim: {
              enable: true,
              speed: 1,
              opacity_min: 0.1,
              sync: false
            }
          },
          size: {
            value: 3,
            random: true,
            anim: {
              enable: true,
              speed: 2,
              size_min: 0.1,
              sync: false
            }
          },
          line_linked: {
            enable: true,
            distance: 150,
            color: '#00f3ff',
            opacity: 0.2,
            width: 1
          },
          move: {
            enable: true,
            speed: 2,
            direction: 'none',
            random: false,
            straight: false,
            out_mode: 'out',
            bounce: false,
            attract: {
              enable: false,
              rotateX: 600,
              rotateY: 1200
            }
          }
        },
        interactivity: {
          detect_on: 'canvas',
          events: {
            onhover: {
              enable: true,
              mode: 'repulse'
            },
            onclick: {
              enable: true,
              mode: 'push'
            },
            resize: true
          },
          modes: {
            grab: {
              distance: 400,
              line_linked: {
                opacity: 1
              }
            },
            bubble: {
              distance: 400,
              size: 40,
              duration: 2,
              opacity: 8,
              speed: 3
            },
            repulse: {
              distance: 100,
              duration: 0.4
            },
            push: {
              particles_nb: 4
            },
            remove: {
              particles_nb: 2
            }
          }
        },
        retina_detect: true
      });
    }
  }

  async fetchVideoInfo() {
    this.errorMessage = '';
    
    if (!this.videoUrl.trim()) {
      this.showError('Please enter a YouTube URL');
      return;
    }

    // Check if it's a playlist URL
    if (this.youtubeService.isPlaylistUrl(this.videoUrl)) {
      this.fetchPlaylistInfo();
      return;
    }

    const videoId = this.youtubeService.extractVideoId(this.videoUrl);
    
    if (!videoId) {
      this.showError('Invalid YouTube URL. Please enter a valid URL.');
      return;
    }

    console.log('Fetching video info for:', videoId);
    
    this.isLoading = true;
    this.videoInfo = null;
    this.playlistInfo = null;
    this.isPlaylist = false;

    this.youtubeService.getVideoInfo(videoId).subscribe({
      next: (response) => {
        console.log('Video info response:', response);
        if (response.success && response.data) {
          this.videoInfo = response.data;
        } else {
          this.showError(response.error || 'Failed to fetch video information');
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Video info error:', error);
        this.showError(error.error?.error || error.message || 'Failed to fetch video information');
        this.isLoading = false;
      }
    });
  }

  async fetchPlaylistInfo() {
    const playlistId = this.youtubeService.extractPlaylistId(this.videoUrl);
    
    if (!playlistId) {
      this.showError('Invalid YouTube Playlist URL.');
      return;
    }

    console.log('Extracted playlist ID:', playlistId);

    // Validate playlist type - reject Mix/Radio playlists
    if (playlistId.startsWith('RDEM') || playlistId.startsWith('RDMM') || 
        playlistId.startsWith('RDCLAK') || playlistId.startsWith('RDAO')) {
      this.showError('YouTube Mix, Radio, and auto-generated playlists are not supported. Please use a regular user-created playlist (starts with PL or UU).');
      return;
    }

    this.isLoading = true;
    this.videoInfo = null;
    this.playlistInfo = null;
    this.isPlaylist = true;
    this.selectedPlaylistVideos.clear();

    this.youtubeService.getPlaylistInfo(playlistId).subscribe({
      next: (response) => {
        console.log('Playlist info response:', response);
        if (response.success && response.data) {
          this.playlistInfo = response.data;
          // Select all videos by default
          this.playlistInfo.videos.forEach(v => this.selectedPlaylistVideos.add(v.videoId));
          this.selectAllPlaylist = true;
        } else {
          this.showError(response.error || 'Failed to fetch playlist information');
          this.isPlaylist = false;
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Playlist info error:', error);
        const errorMsg = error.error?.error || error.error?.message || error.message || 'Failed to fetch playlist information';
        this.showError(errorMsg);
        this.isLoading = false;
        this.isPlaylist = false;
      }
    });
  }

  togglePlaylistVideo(videoId: string) {
    if (this.selectedPlaylistVideos.has(videoId)) {
      this.selectedPlaylistVideos.delete(videoId);
    } else {
      this.selectedPlaylistVideos.add(videoId);
    }
    this.updateSelectAllState();
  }

  toggleSelectAll() {
    if (!this.playlistInfo) return;
    
    if (this.selectAllPlaylist) {
      this.selectedPlaylistVideos.clear();
    } else {
      this.playlistInfo.videos.forEach(v => this.selectedPlaylistVideos.add(v.videoId));
    }
    this.selectAllPlaylist = !this.selectAllPlaylist;
  }

  updateSelectAllState() {
    if (!this.playlistInfo) return;
    this.selectAllPlaylist = this.selectedPlaylistVideos.size === this.playlistInfo.videos.length;
  }

  downloadPlaylist(format: VideoFormat) {
    if (!this.playlistInfo || this.selectedPlaylistVideos.size === 0) {
      this.showError('Please select at least one video to download');
      return;
    }

    this.playlistDownloading = true;
    this.playlistProgress = null;

    const selectedIds = Array.from(this.selectedPlaylistVideos);

    // Start watching progress
    this.youtubeService.watchPlaylistProgress(this.playlistInfo.playlistId).subscribe({
      next: (progress) => {
        this.playlistProgress = progress;
      },
      error: (error) => {
        console.error('Progress error:', error);
      }
    });

    // Start download
    this.youtubeService.downloadPlaylist(
      this.playlistInfo.playlistId,
      format.quality,
      format.format as 'mp4' | 'mp3',
      selectedIds
    ).subscribe({
      next: (response) => {
        this.playlistDownloading = false;
        
        if (response.success) {
          this.showSuccess(`Playlist download completed! ${response.downloadedVideos}/${response.totalVideos} videos downloaded`);
          
          if (response.failedVideos.length > 0) {
            console.warn('Failed videos:', response.failedVideos);
          }
          
          // Trigger download for each file
          if (response.downloadUrls && response.downloadUrls.length > 0) {
            response.downloadUrls.forEach((downloadUrl, index) => {
              const filename = response.filenames && response.filenames[index] 
                ? response.filenames[index] 
                : `video-${index + 1}.${format.format}`;
              
              // Trigger download with delay to avoid browser blocking multiple downloads
              setTimeout(() => {
                const link = document.createElement('a');
                link.href = `http://localhost:3000${downloadUrl}`;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                console.log(`Triggering download ${index + 1}/${response?.downloadUrls?.length}: ${filename}`);
              }, index * 2000); // 2 second delay between each download
            });
          }
          
          // Reload history
          this.loadHistory();
        } else {
          this.showError(response.error || 'Playlist download failed');
        }
      },
      error: (error) => {
        this.playlistDownloading = false;
        this.showError(error.error?.error || 'Failed to download playlist');
      }
    });
  }

  downloadVideo(format: VideoFormat) {
    if (!this.videoInfo) return;

    const downloadKey = `${format.quality}-${format.format}`;
    this.downloadingFormats.add(downloadKey);
    this.downloadProgress.set(downloadKey, 0);

    // Start progress simulation as fallback
    const progressInterval = setInterval(() => {
      const currentProgress = this.downloadProgress.get(downloadKey) || 0;
      if (currentProgress < 90 && this.downloadingFormats.has(downloadKey)) {
        // Slow incremental progress as fallback
        this.downloadProgress.set(downloadKey, Math.min(currentProgress + Math.random() * 5, 90));
      }
    }, 2000);

    // Start watching progress via SSE
    const progressSub = this.youtubeService.watchDownloadProgress(
      this.videoInfo.videoId,
      format.quality,
      format.format as 'mp4' | 'mp3'
    ).subscribe({
      next: (progress) => {
        // Real progress from server overrides simulated progress
        this.downloadProgress.set(downloadKey, progress);
      },
      error: (error) => {
        console.error('Progress tracking error:', error);
        // Continue with simulated progress on error
      }
    });

    this.youtubeService.downloadVideo(
      this.videoInfo.videoId,
      format.quality,
      format.format as 'mp4' | 'mp3'
    ).subscribe({
      next: (response) => {
        clearInterval(progressInterval);
        progressSub.unsubscribe();
        this.downloadingFormats.delete(downloadKey);
        this.downloadProgress.delete(downloadKey);
        
        if (response.success && response.downloadUrl) {
          // Trigger download
          const link = document.createElement('a');
          link.href = `http://localhost:3000${response.downloadUrl}`;
          link.download = response.filename || `video.${format.ext}`;
          
          // Reload history to show the new download
          this.loadHistory();
          link.click();
          
          this.showSuccess(`Download started: ${response.filename}`);
        } else {
          this.showError(response.error || 'Download failed');
        }
      },
      error: (error) => {
        clearInterval(progressInterval);
        progressSub.unsubscribe();
        this.downloadingFormats.delete(downloadKey);
        this.downloadProgress.delete(downloadKey);
        this.showError(error.error?.error || 'Download failed. Make sure the backend server is running.');
      }
    });
  }

  isDownloading(format: VideoFormat): boolean {
    const downloadKey = `${format.quality}-${format.format}`;
    return this.downloadingFormats.has(downloadKey);
  }

  getDownloadProgress(format: VideoFormat): number {
    const downloadKey = `${format.quality}-${format.format}`;
    return this.downloadProgress.get(downloadKey) || 0;
  }

  setActiveTab(tab: 'video' | 'audio') {
    this.activeTab = tab;
  }

  getFormattedDuration(): string {
    if (!this.videoInfo) return '';
    return this.youtubeService.formatDuration(this.videoInfo.duration);
  }

  private showError(message: string) {
    this.errorMessage = message;
    setTimeout(() => {
      this.errorMessage = '';
    }, 5000);
  }

  private showSuccess(message: string) {
    // You could implement a toast notification service here
    console.log('Success:', message);
  }

  // History Methods
  loadHistory() {
    this.historyLoading = true;
    this.youtubeService.getHistory(50, 0).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.downloadHistory = response.data;
          this.historyTotal = response.total;
        }
        this.historyLoading = false;
      },
      error: (error) => {
        console.error('Failed to load history:', error);
        this.historyLoading = false;
      }
    });
  }

  switchView(view: 'downloader' | 'history') {
    this.mainView = view;
    if (view === 'history') {
      this.loadHistory();
    }
  }

  deleteHistoryItem(id: string) {
    if (!confirm('Are you sure you want to delete this item from history?')) {
      return;
    }

    this.youtubeService.deleteHistoryItem(id).subscribe({
      next: () => {
        this.loadHistory();
        this.showSuccess('History item deleted');
      },
      error: (error) => {
        this.showError('Failed to delete history item');
      }
    });
  }

  clearAllHistory() {
    if (!confirm('Are you sure you want to clear all download history?')) {
      return;
    }

    this.youtubeService.clearHistory().subscribe({
      next: () => {
        this.downloadHistory = [];
        this.historyTotal = 0;
        this.showSuccess('History cleared');
      },
      error: (error) => {
        this.showError('Failed to clear history');
      }
    });
  }

  redownloadFromHistory(item: DownloadHistoryItem) {
    this.mainView = 'downloader';
    this.videoUrl = `https://www.youtube.com/watch?v=${item.videoId}`;
    this.fetchVideoInfo();
  }

  getHistoryDuration(duration?: number): string {
    if (!duration) return 'N/A';
    return this.youtubeService.formatDuration(duration);
  }

  getTimeSince(date: Date): string {
    const now = new Date();
    const downloadDate = new Date(date);
    const diffMs = now.getTime() - downloadDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return downloadDate.toLocaleDateString();
  }

  formatPlaylistVideoDuration(seconds: number): string {
    return this.youtubeService.formatDuration(seconds);
  }
}
