import { Injectable, Logger } from '@nestjs/common';
import ytdl from '@distube/ytdl-core';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { VideoInfo, DownloadResponse } from './interfaces/video.interface';
import { spawn } from 'child_process';

@Injectable()
export class YoutubeService {
  private readonly logger = new Logger(YoutubeService.name);
  private readonly downloadsDir = path.join(process.cwd(), 'downloads');
  private agent: ytdl.Agent;

  constructor() {
    // Create downloads directory if it doesn't exist
    if (!fs.existsSync(this.downloadsDir)) {
      fs.mkdirSync(this.downloadsDir, { recursive: true });
      this.logger.log(`Created downloads directory: ${this.downloadsDir}`);
    }

    // Initialize ytdl agent with cookies
    this.agent = ytdl.createAgent();

    // Start cleanup interval
    this.startCleanupInterval();
  }

  async getVideoInfo(videoId: string): Promise<VideoInfo> {
    try {
      const url = `https://www.youtube.com/watch?v=${videoId}`;

      if (!ytdl.validateURL(url)) {
        throw new Error('Invalid YouTube URL');
      }

      const info = await ytdl.getInfo(url, {
        agent: this.agent,
      });
      const videoDetails = info.videoDetails;

      return {
        videoId,
        title: videoDetails.title,
        author: videoDetails.author.name,
        thumbnail: videoDetails.thumbnails[videoDetails.thumbnails.length - 1].url,
        duration: parseInt(videoDetails.lengthSeconds),
        description: videoDetails.description,
        uploadDate: videoDetails.uploadDate,
      };
    } catch (error) {
      this.logger.error(`Error fetching video info: ${error.message}`);
      throw new Error(`Failed to fetch video information: ${error.message}`);
    }
  }

  // Helper method to execute yt-dlp with proper path handling for spaces
  private async executeYtdlp(url: string, args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const ytdlpPath = path.join(
        __dirname,
        '..',
        '..',
        'node_modules',
        'youtube-dl-exec',
        'bin',
        'yt-dlp.exe'
      );

      this.logger.log(`Executing yt-dlp at: ${ytdlpPath}`);
      this.logger.log(`Args: ${JSON.stringify(args)}`);

      const child = spawn(ytdlpPath, [url, ...args], {
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('error', (error) => {
        this.logger.error(`Spawn error: ${error.message}`);
        reject(error);
      });

      child.on('close', (code) => {
        if (code === 0) {
          this.logger.log('yt-dlp completed successfully');
          resolve();
        } else {
          this.logger.error(`yt-dlp exited with code ${code}`);
          this.logger.error(`stderr: ${stderr}`);
          reject(new Error(`yt-dlp failed with code ${code}: ${stderr || stdout}`));
        }
      });
    });
  }

  async downloadVideo(
    videoId: string,
    quality: string,
    format: 'mp4' | 'mp3',
  ): Promise<DownloadResponse> {
    try {
      // Debug logging
      this.logger.log(`=== DOWNLOAD REQUEST ===`);
      this.logger.log(`Video ID: ${videoId}`);
      this.logger.log(`Quality: ${quality}`);
      this.logger.log(`Format: ${format}`);
      this.logger.log(`======================`);
      
      const url = `https://www.youtube.com/watch?v=${videoId}`;

      // Get video info for title
      const info = await ytdl.getInfo(url, {
        agent: this.agent,
      });
      const title = info.videoDetails.title.replace(/[^\w\s-]/gi, '_');
      
      // Use the requested format directly (FFmpeg will handle MP3 conversion)
      const filename = `${title}_${uuidv4()}.${format}`;
      const filepath = path.join(this.downloadsDir, filename);

      // Build yt-dlp command-line arguments
      const args: string[] = [
        '--output', filepath,
        '--no-check-certificates',
        '--no-warnings',
        '--add-header', 'referer:youtube.com',
        '--add-header', 'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      ];

      if (format === 'mp3') {
        // Audio only - extract and convert to MP3 using FFmpeg
        args.push('--extract-audio');
        args.push('--audio-format', 'mp3');
        args.push('--audio-quality', '0'); // Best quality (320kbps)
        args.push('--embed-thumbnail'); // Add album art if available
      } else {
        // Video - prioritize high-quality separate streams (requires FFmpeg for merging)
        const qualityMap: Record<string, string> = {
          '1080p': 'bestvideo[height<=1080]+bestaudio/best[height<=1080]/best',
          '720p': 'bestvideo[height<=720]+bestaudio/best[height<=720]/best',
          '480p': 'bestvideo[height<=480]+bestaudio/best[height<=480]/best',
          '360p': 'bestvideo[height<=360]+bestaudio/best[height<=360]/best',
          '144p': 'bestvideo[height<=144]+bestaudio/best[height<=144]/best',
        };

        args.push('--format', qualityMap[quality] || 'bestvideo+bestaudio/best');
        args.push('--merge-output-format', 'mp4');
      }

      // Download using yt-dlp
      this.logger.log(`Starting download to: ${filepath}`);
      await this.executeYtdlp(url, args);
      
      // Find the actual downloaded file (yt-dlp may add format codes)
      const baseFilename = filename.replace(/\.[^.]+$/, ''); // Remove extension
      const files = fs.readdirSync(this.downloadsDir);
      const downloadedFile = files.find(f => f.startsWith(baseFilename));
      
      if (!downloadedFile) {
        throw new Error('Downloaded file not found');
      }
      
      this.logger.log(`Downloaded: ${downloadedFile}`);
      
      return {
        success: true,
        downloadUrl: `/api/youtube/downloads/${downloadedFile}`,
        filename: downloadedFile,
      };
    } catch (error) {
      this.logger.error(`Error downloading video: ${error.message}`);
      this.logger.error(`Error stack: ${error.stack}`);
      this.logger.error(`Full error: ${JSON.stringify(error)}`);
      throw new Error(`Failed to download video: ${error.message || error.toString()}`);
    }
  }

  async streamVideo(videoId: string) {
    try {
      const url = `https://www.youtube.com/watch?v=${videoId}`;

      if (!ytdl.validateURL(url)) {
        throw new Error('Invalid YouTube URL');
      }

      return ytdl(url, { 
        quality: 'highest',
        agent: this.agent,
      });
    } catch (error) {
      this.logger.error(`Error streaming video: ${error.message}`);
      throw new Error(`Failed to stream video: ${error.message}`);
    }
  }

  async getDownloadedFile(filename: string): Promise<string> {
    const filepath = path.join(this.downloadsDir, filename);
    
    // Check if file exists
    if (!fs.existsSync(filepath)) {
      throw new Error('File not found');
    }
    
    return filepath;
  }

  private startCleanupInterval() {
    const interval = parseInt(process.env.CLEANUP_INTERVAL) || 3600000; // 1 hour default

    setInterval(() => {
      this.cleanupOldFiles();
    }, interval);

    this.logger.log(`Cleanup interval started: ${interval}ms`);
  }

  private cleanupOldFiles() {
    const now = Date.now();
    const maxAge = 60 * 60 * 1000; // 1 hour

    fs.readdir(this.downloadsDir, (err, files) => {
      if (err) {
        this.logger.error(`Error reading downloads directory: ${err.message}`);
        return;
      }

      files.forEach((file) => {
        const filepath = path.join(this.downloadsDir, file);
        fs.stat(filepath, (err, stats) => {
          if (err) return;

          if (now - stats.mtimeMs > maxAge) {
            fs.unlink(filepath, (err) => {
              if (err) {
                this.logger.error(`Error deleting file: ${err.message}`);
              } else {
                this.logger.log(`Deleted old file: ${file}`);
              }
            });
          }
        });
      });
    });
  }
}
