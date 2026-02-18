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
} from '@nestjs/common';
import { Response } from 'express';
import { YoutubeService } from './youtube.service';
import { VideoInfoDto, DownloadVideoDto } from './dto/video-info.dto';

@Controller('youtube')
export class YoutubeController {
  constructor(private readonly youtubeService: YoutubeService) {}

  @Post('info')
  async getVideoInfo(@Body() videoInfoDto: VideoInfoDto) {
    try {
      const info = await this.youtubeService.getVideoInfo(
        videoInfoDto.videoId,
      );
      return {
        success: true,
        data: info,
      };
    } catch (error) {
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

  @Get('health')
  healthCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'YouTube Downloader API',
    };
  }
}
