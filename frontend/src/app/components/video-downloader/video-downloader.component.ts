import { Component, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { YoutubeService } from '../../services/youtube.service';
import { VideoInfo, VideoFormat } from '../../models/video.model';

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

  constructor(private youtubeService: YoutubeService) {}

  ngAfterViewInit() {
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

    const videoId = this.youtubeService.extractVideoId(this.videoUrl);
    
    if (!videoId) {
      this.showError('Invalid YouTube URL. Please enter a valid URL.');
      return;
    }

    this.isLoading = true;
    this.videoInfo = null;

    this.youtubeService.getVideoInfo(videoId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.videoInfo = response.data;
        } else {
          this.showError(response.error || 'Failed to fetch video information');
        }
        this.isLoading = false;
      },
      error: (error) => {
        this.showError(error.error?.error || 'Failed to fetch video information');
        this.isLoading = false;
      }
    });
  }

  downloadVideo(format: VideoFormat) {
    if (!this.videoInfo) return;

    const downloadKey = `${format.quality}-${format.format}`;
    this.downloadingFormats.add(downloadKey);

    this.youtubeService.downloadVideo(
      this.videoInfo.videoId,
      format.quality,
      format.format as 'mp4' | 'mp3'
    ).subscribe({
      next: (response) => {
        this.downloadingFormats.delete(downloadKey);
        
        if (response.success && response.downloadUrl) {
          // Trigger download
          const link = document.createElement('a');
          link.href = `http://localhost:3000${response.downloadUrl}`;
          link.download = response.filename || `video.${format.ext}`;
          link.click();
          
          this.showSuccess(`Download started: ${response.filename}`);
        } else {
          this.showError(response.error || 'Download failed');
        }
      },
      error: (error) => {
        this.downloadingFormats.delete(downloadKey);
        this.showError(error.error?.error || 'Download failed. Make sure the backend server is running.');
      }
    });
  }

  isDownloading(format: VideoFormat): boolean {
    const downloadKey = `${format.quality}-${format.format}`;
    return this.downloadingFormats.has(downloadKey);
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
}
