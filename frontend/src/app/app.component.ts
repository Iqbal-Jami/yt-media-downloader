import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VideoDownloaderComponent } from './components/video-downloader/video-downloader.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, VideoDownloaderComponent],
  template: `
    <div class="app-container">
      <app-video-downloader></app-video-downloader>
    </div>
  `,
  styles: [`
    .app-container {
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
    }
  `]
})
export class AppComponent {
  title = 'YouTube Downloader';
}
