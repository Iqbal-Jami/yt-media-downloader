import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getApiInfo() {
    return {
      name: 'YouTube Downloader API',
      version: '2.0.0',
      status: 'running',
      endpoints: {
        health: 'GET /api/youtube/health',
        videoInfo: 'POST /api/youtube/info',
        download: 'POST /api/youtube/download',
        stream: 'GET /api/youtube/stream/:videoId',
        playlistInfo: 'POST /api/youtube/playlist/info',
        playlistDownload: 'POST /api/youtube/playlist/download',
        history: 'GET /api/youtube/history',
      },
      documentation: 'https://github.com/yourusername/youtube-downloader',
      framework: 'NestJS + Angular 21',
    };
  }
}
