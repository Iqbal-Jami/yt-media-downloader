import { Injectable, resource, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

/**
 * Angular 21: Resource API
 * New declarative way to handle async data loading
 * Replaces traditional Observable patterns with Signal-based reactive loading
 */
@Injectable({
  providedIn: 'root'
})
export class VideoResourceService {
  private http = inject(HttpClient);

  // Angular 21: Signal for video URL input
  private videoUrl = signal<string>('');

  // Angular 21: Resource API - Declarative async data loading
  videoResource = resource({
    // Request parameters as a signal
    request: () => ({ url: this.videoUrl() }),
    
    // Loader function - automatically called when request changes
    loader: async ({ request }) => {
      if (!request.url) {
        return null;
      }

      try {
        // Fetch video info
        const response = await fetch(
          `${environment.apiUrl}/youtube/video-info`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: request.url })
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
      } catch (error) {
        console.error('Video fetch error:', error);
        throw error;
      }
    }
  });

  // Angular 21: Resource states are automatically available as signals
  // videoResource.value() - The loaded data
  // videoResource.isLoading() - Loading state
  // videoResource.error() - Error state
  // videoResource.status() - 'idle' | 'loading' | 'error' | 'success'

  constructor() {}

  // Update the video URL to trigger resource reload
  loadVideo(url: string) {
    this.videoUrl.set(url);
  }

  // Manually reload the resource
  reload() {
    this.videoResource.reload();
  }
}

/**
 * Usage in Component:
 * 
 * @Component({
 *   template: `
 *     <div>
 *       @if (videoResource.isLoading()) {
 *         <p>Loading video info...</p>
 *       }
 *       
 *       @if (videoResource.error()) {
 *         <p>Error: {{ videoResource.error().message }}</p>
 *       }
 *       
 *       @if (videoResource.value(); as video) {
 *         <h2>{{ video.title }}</h2>
 *         <img [src]="video.thumbnail" />
 *       }
 *     </div>
 *   `
 * })
 * export class VideoComponent {
 *   videoService = inject(VideoResourceService);
 *   videoResource = this.videoService.videoResource;
 * }
 */


// Angular 21: Another Resource API Example - For History
@Injectable({
  providedIn: 'root'
})
export class HistoryResourceService {
  private http = inject(HttpClient);
  
  // Pagination signal
  private page = signal(1);
  private limit = signal(10);

  // Angular 21: Resource with pagination
  historyResource = resource({
    request: () => ({
      page: this.page(),
      limit: this.limit()
    }),
    
    loader: async ({ request }) => {
      try {
        const response = await fetch(
          `${environment.apiUrl}/youtube/history?page=${request.page}&limit=${request.limit}`
        );
        
        if (!response.ok) {
          throw new Error('Failed to load history');
        }
        
        return await response.json();
      } catch (error) {
        console.error('History fetch error:', error);
        throw error;
      }
    }
  });

  loadPage(pageNumber: number) {
    this.page.set(pageNumber);
  }

  setLimit(limit: number) {
    this.limit.set(limit);
  }

  nextPage() {
    this.page.update(p => p + 1);
  }

  previousPage() {
    this.page.update(p => Math.max(1, p - 1));
  }
}


// Angular 21: Resource with polling (auto-refresh)
@Injectable({
  providedIn: 'root'
})
export class LiveStatsResourceService {
  private refreshTrigger = signal(0);

  statsResource = resource({
    request: () => this.refreshTrigger(),
    
    loader: async () => {
      const response = await fetch(`${environment.apiUrl}/stats`);
      return await response.json();
    }
  });

  constructor() {
    // Auto-refresh every 30 seconds
    setInterval(() => {
      this.refreshTrigger.update(v => v + 1);
    }, 30000);
  }

  manualRefresh() {
    this.refreshTrigger.update(v => v + 1);
  }
}

// Helper function for inject (Angular 21)
function inject<T>(token: any): T {
  return null as any; // This will be provided by Angular's DI
}
