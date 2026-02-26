import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Res,
  HttpException,
  HttpStatus,
  StreamableFile,
  Query,
  Delete,
  Sse,
  MessageEvent,
} from '@nestjs/common';
import { Response } from 'express';
import { Observable } from 'rxjs';
import { YoutubeService } from './youtube.service';
import { VideoInfoDto, DownloadVideoDto } from './dto/video-info.dto';
import { GetHistoryDto } from './dto/download-history.dto';
import { PlaylistInfoDto, DownloadPlaylistDto } from './dto/playlist.dto';

@Controller('youtube')
export class YoutubeController {
  constructor(private readonly youtubeService: YoutubeService) {}

  @Post('info')
  async getVideoInfo(@Body() videoInfoDto: VideoInfoDto) {
    try {
      console.log('Received video info request:', videoInfoDto);
      
      if (!videoInfoDto.videoId) {
        throw new Error('Video ID is required');
      }
      
      const info = await this.youtubeService.getVideoInfo(
        videoInfoDto.videoId,
      );
      return {
        success: true,
        data: info,
      };
    } catch (error) {
      console.error('Video info error:', error.message);
      throw new HttpException(
        {
          success: false,
          error: error.message || 'Failed to fetch video information',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('download')
  async downloadVideo(@Body() downloadDto: DownloadVideoDto) {
    try {
      const result = await this.youtubeService.downloadVideo(
        downloadDto.videoId,
        downloadDto.quality,
        downloadDto.format,
      );
      return result;
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: error.message || 'Failed to download video',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Sse('download/progress/:videoId/:quality/:format')
  downloadProgress(
    @Param('videoId') videoId: string,
    @Param('quality') quality: string,
    @Param('format') format: string,
  ): Observable<MessageEvent> {
    return new Observable((observer) => {
      const downloadKey = `${videoId}_${quality}_${format}`;
      
      const progressHandler = (data: any) => {
        if (data.downloadKey === downloadKey) {
          observer.next({ data: { progress: data.progress } } as MessageEvent);
          
          if (data.progress >= 100 || data.error) {
            observer.complete();
          }
        }
      };

      this.youtubeService.on('download-progress', progressHandler);

      return () => {
        this.youtubeService.off('download-progress', progressHandler);
      };
    });
  }

  @Get('stream/:videoId')
  async streamVideo(
    @Param('videoId') videoId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const stream = await this.youtubeService.streamVideo(videoId);
      const info = await this.youtubeService.getVideoInfo(videoId);

      res.set({
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="${info.title}.mp4"`,
      });

      return new StreamableFile(stream);
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: error.message || 'Failed to stream video',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('downloads/:filename')
  async getDownloadedFile(
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    try {
      const filePath = await this.youtubeService.getDownloadedFile(filename);
      
      // Force download instead of playing in browser
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
      res.setHeader('Content-Type', 'application/octet-stream');
      
      res.sendFile(filePath);
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: error.message || 'File not found',
        },
        HttpStatus.NOT_FOUND,
      );
    }
  }

  // Playlist Endpoints
  @Post('playlist/info')
  async getPlaylistInfo(@Body() playlistInfoDto: PlaylistInfoDto) {
    try {
      console.log('Received playlist info request:', playlistInfoDto);
      
      if (!playlistInfoDto.playlistId) {
        throw new Error('Playlist ID is required');
      }
      
      const info = await this.youtubeService.getPlaylistInfo(
        playlistInfoDto.playlistId,
      );
      return {
        success: true,
        data: info,
      };
    } catch (error) {
      console.error('Playlist info error:', error.message);
      throw new HttpException(
        {
          success: false,
          error: error.message || 'Failed to fetch playlist information',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('playlist/download')
  async downloadPlaylist(@Body() downloadDto: DownloadPlaylistDto) {
    try {
      const result = await this.youtubeService.downloadPlaylist(
        downloadDto.playlistId,
        downloadDto.quality,
        downloadDto.format,
        downloadDto.selectedVideoIds,
      );
      return result;
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: error.message || 'Failed to download playlist',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Sse('playlist/progress/:playlistId')
  playlistProgress(@Param('playlistId') playlistId: string): Observable<MessageEvent> {
    return new Observable((observer) => {
      const progressHandler = (data: any) => {
        if (data.playlistId === playlistId) {
          observer.next({ data } as MessageEvent);
          
          if (data.status === 'completed' || data.status === 'failed') {
            observer.complete();
          }
        }
      };

      this.youtubeService.on('playlist-progress', progressHandler);

      return () => {
        this.youtubeService.off('playlist-progress', progressHandler);
      };
    });
  }

  // Download History Endpoints
  @Get('history')
  async getHistory(@Query() query: GetHistoryDto) {
    try {
      const limit = query.limit || 50;
      const offset = query.offset || 0;
      
      const result = await this.youtubeService.getHistory(limit, offset);
      
      return {
        success: true,
        data: result.items,
        total: result.total,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: error.message || 'Failed to fetch download history',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('history')
  async clearHistory() {
    try {
      await this.youtubeService.clearHistory();
      return {
        success: true,
        message: 'Download history cleared successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: error.message || 'Failed to clear history',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('history/:id')
  async deleteHistoryItem(@Param('id') id: string) {
    try {
      await this.youtubeService.deleteHistoryItem(id);
      return {
        success: true,
        message: 'History item deleted successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: error.message || 'Failed to delete history item',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('health')
  healthCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'YouTube Downloader API',
    };
  }
}
