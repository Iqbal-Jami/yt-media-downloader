import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter } from 'events';
import ytdl from '@distube/ytdl-core';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { VideoInfo, DownloadResponse } from './interfaces/video.interface';
import { spawn } from 'child_process';
import { DownloadHistoryItem } from './interfaces/download-history.interface';
import { PlaylistInfo, PlaylistVideo, PlaylistDownloadResponse, PlaylistDownloadProgress } from './interfaces/playlist.interface';

@Injectable()
export class YoutubeService extends EventEmitter {
  private readonly logger = new Logger(YoutubeService.name);
  private readonly downloadsDir = path.join(process.cwd(), 'downloads');
  private readonly historyFile = path.join(process.cwd(), 'download-history.json');
  // Agent removed - it was blocking server startup
  // private agent: ytdl.Agent;

  constructor() {
    super();
    // Create downloads directory if it doesn't exist
    if (!fs.existsSync(this.downloadsDir)) {
      fs.mkdirSync(this.downloadsDir, { recursive: true });
      this.logger.log(`Created downloads directory: ${this.downloadsDir}`);
    }

    // Initialize history file if it doesn't exist
    if (!fs.existsSync(this.historyFile)) {
      fs.writeFileSync(this.historyFile, JSON.stringify([], null, 2));
      this.logger.log(`Created history file: ${this.historyFile}`);
    }

    // Removed agent initialization - it was blocking server startup
    // this.agent = ytdl.createAgent();

    // Start cleanup interval
    this.startCleanupInterval();
  }

  async getVideoInfo(videoId: string): Promise<VideoInfo> {
    try {
      const url = `https://www.youtube.com/watch?v=${videoId}`;

      if (!ytdl.validateURL(url)) {
        throw new Error('Invalid YouTube URL');
      }

      // Try ytdl-core first with agent and headers
      try {
        const agent = ytdl.createAgent();
        const info = await ytdl.getInfo(url, {
          agent,
          requestOptions: {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
              'Accept-Language': 'en-US,en;q=0.9',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            }
          }
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
      } catch (ytdlError) {
        // If ytdl-core fails (bot detection), fallback to yt-dlp
        this.logger.warn(`ytdl-core failed, using yt-dlp fallback: ${ytdlError.message}`);
        return await this.getVideoInfoViaYtDlp(url);
      }
    } catch (error) {
      this.logger.error(`Error fetching video info: ${error.message}`);
      throw new Error(`Failed to fetch video information: ${error.message}`);
    }
  }

  // Fallback method using yt-dlp to get video info
  private async getVideoInfoViaYtDlp(url: string): Promise<VideoInfo> {
    return new Promise((resolve, reject) => {
      const ytdlpPath = path.join(process.cwd(), 'yt-dlp.exe');
      
      if (!fs.existsSync(ytdlpPath)) {
        reject(new Error('yt-dlp.exe not found. Please download it to the backend directory.'));
        return;
      }

      // Try with browser cookies first (Chrome), fallback to no cookies
      const args = [
        '--dump-json', 
        '--no-playlist',
        '--cookies-from-browser', 'chrome', // Extract cookies from Chrome
        url
      ];
      
      this.logger.log(`Executing yt-dlp with browser cookies...`);
      const child = spawn(ytdlpPath, args, { shell: false });

      let jsonOutput = '';
      let errorOutput = '';

      child.stdout.on('data', (data) => {
        jsonOutput += data.toString();
      });

      child.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0 && jsonOutput) {
          try {
            const videoData = JSON.parse(jsonOutput);
            const videoId = videoData.id || url.split('v=')[1]?.split('&')[0];
            
            resolve({
              videoId,
              title: videoData.title || 'Unknown Title',
              author: videoData.uploader || videoData.channel || 'Unknown Author',
              thumbnail: videoData.thumbnail || videoData.thumbnails?.[0]?.url || '',
              duration: videoData.duration || 0,
              description: videoData.description || '',
              uploadDate: videoData.upload_date || new Date().toISOString().split('T')[0],
            });
          } catch (parseError) {
            reject(new Error(`Failed to parse yt-dlp output: ${parseError.message}`));
          }
        } else {
          // If Chrome cookies fail, try without cookies as last resort
          this.logger.warn(`yt-dlp with cookies failed, trying without cookies...`);
          this.getVideoInfoViaYtDlpNoCookies(url).then(resolve).catch(reject);
        }
      });

      child.on('error', (error) => {
        reject(new Error(`Failed to execute yt-dlp: ${error.message}`));
      });
    });
  }

  // Last resort: yt-dlp without cookies (likely to fail on some videos)
  private async getVideoInfoViaYtDlpNoCookies(url: string): Promise<VideoInfo> {
    return new Promise((resolve, reject) => {
      const ytdlpPath = path.join(process.cwd(), 'yt-dlp.exe');
      const args = ['--dump-json', '--no-playlist', url];
      
      const child = spawn(ytdlpPath, args, { shell: false });

      let jsonOutput = '';
      let errorOutput = '';

      child.stdout.on('data', (data) => {
        jsonOutput += data.toString();
      });

      child.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0 && jsonOutput) {
          try {
            const videoData = JSON.parse(jsonOutput);
            const videoId = videoData.id || url.split('v=')[1]?.split('&')[0];
            
            resolve({
              videoId,
              title: videoData.title || 'Unknown Title',
              author: videoData.uploader || videoData.channel || 'Unknown Author',
              thumbnail: videoData.thumbnail || videoData.thumbnails?.[0]?.url || '',
              duration: videoData.duration || 0,
              description: videoData.description || '',
              uploadDate: videoData.upload_date || new Date().toISOString().split('T')[0],
            });
          } catch (parseError) {
            reject(new Error(`Failed to parse yt-dlp output: ${parseError.message}`));
          }
        } else {
          reject(new Error(`yt-dlp failed with code ${code}: ${errorOutput}`));
        }
      });

      child.on('error', (error) => {
        reject(new Error(`Failed to execute yt-dlp: ${error.message}`));
      });
    });
  }

  // Helper method to execute yt-dlp with proper path handling for spaces
  private async executeYtdlp(url: string, args: string[], downloadKey?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Use yt-dlp.exe from project root
      const ytdlpPath = path.join(process.cwd(), 'yt-dlp.exe');

      if (!fs.existsSync(ytdlpPath)) {
        reject(new Error('yt-dlp.exe not found in project root'));
        return;
      }

      // Add browser cookies support to args
      const argsWithCookies = ['--cookies-from-browser', 'chrome', ...args];

      this.logger.log(`Executing yt-dlp at: ${ytdlpPath}`);
      this.logger.log(`Args: ${JSON.stringify(argsWithCookies)}`);

      const child = spawn(ytdlpPath, [url, ...argsWithCookies], {
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      });

      let stdout = '';
      let stderr = '';
      let lastProgress = 0;

      child.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        
        // Parse progress from yt-dlp output
        if (downloadKey) {
          // Look for download progress patterns
          // yt-dlp outputs: [download]  45.2% of 10.5MiB at 1.2MiB/s ETA 00:05
          const downloadMatch = output.match(/\[download\]\s+(\d+\.?\d*)%/);
          if (downloadMatch) {
            const progress = Math.min(parseFloat(downloadMatch[1]), 99);
            if (progress > lastProgress) {
              lastProgress = progress;
              this.emit('download-progress', {
                downloadKey,
                progress
              });
              this.logger.log(`Download progress: ${progress}%`);
            }
          }
        }
      });

      child.stderr.on('data', (data) => {
        const output = data.toString();
        stderr += output;
        
        // yt-dlp outputs progress to stderr
        if (downloadKey) {
          const downloadMatch = output.match(/\[download\]\s+(\d+\.?\d*)%/);
          if (downloadMatch) {
            const progress = Math.min(parseFloat(downloadMatch[1]), 99);
            if (progress > lastProgress) {
              lastProgress = progress;
              this.emit('download-progress', {
                downloadKey,
                progress
              });
              this.logger.log(`Download progress: ${progress}%`);
            }
          }
        }
      });

      child.on('error', (error) => {
        this.logger.error(`Spawn error: ${error.message}`);
        if (downloadKey) {
          this.emit('download-progress', {
            downloadKey,
            progress: 0,
            error: error.message
          });
        }
        reject(error);
      });

      child.on('close', (code) => {
        if (code === 0) {
          this.logger.log('yt-dlp completed successfully');
          if (downloadKey) {
            this.emit('download-progress', {
              downloadKey,
              progress: 100
            });
          }
          resolve();
        } else {
          this.logger.error(`yt-dlp exited with code ${code}`);
          this.logger.error(`stderr: ${stderr}`);
          if (downloadKey) {
            this.emit('download-progress', {
              downloadKey,
              progress: 0,
              error: `yt-dlp failed with code ${code}`
            });
          }
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
      
      const downloadKey = `${videoId}_${quality}_${format}`;
      const url = `https://www.youtube.com/watch?v=${videoId}`;

      // Emit initial progress
      this.emit('download-progress', {
        downloadKey,
        progress: 0
      });

      // Get video info for title with agent
      const agent = ytdl.createAgent();
      const info = await ytdl.getInfo(url, {
        agent,
        requestOptions: {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
          }
        }
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

      // Download using yt-dlp with progress tracking
      this.logger.log(`Starting download to: ${filepath}`);
      await this.executeYtdlp(url, args, downloadKey);
      
      // Find the actual downloaded file (yt-dlp may add format codes)
      const baseFilename = filename.replace(/\.[^.]+$/, ''); // Remove extension
      const files = fs.readdirSync(this.downloadsDir);
      const downloadedFile = files.find(f => f.startsWith(baseFilename));
      
      if (!downloadedFile) {
        throw new Error('Downloaded file not found');
      }
      
      this.logger.log(`Downloaded: ${downloadedFile}`);
      
      // Add to download history
      await this.addToHistory(
        videoId,
        info.videoDetails.title,
        info.videoDetails.author.name,
        info.videoDetails.thumbnails[info.videoDetails.thumbnails.length - 1].url,
        quality,
        format,
        undefined, // fileSize (we can calculate this if needed)
        parseInt(info.videoDetails.lengthSeconds),
      );
      
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

      const agent = ytdl.createAgent();
      return ytdl(url, { 
        quality: 'highestvideo',
        agent,
        requestOptions: {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
          }
        }
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

  // Download History Methods
  private loadHistory(): DownloadHistoryItem[] {
    try {
      const data = fs.readFileSync(this.historyFile, 'utf-8');
      return JSON.parse(data) || [];
    } catch (error) {
      this.logger.error(`Error loading history: ${error.message}`);
      return [];
    }
  }

  private saveHistory(history: DownloadHistoryItem[]): void {
    try {
      fs.writeFileSync(this.historyFile, JSON.stringify(history, null, 2), 'utf-8');
    } catch (error) {
      this.logger.error(`Error saving history: ${error.message}`);
    }
  }

  async addToHistory(
    videoId: string,
    title: string,
    author: string,
    thumbnail: string,
    quality: string,
    format: string,
    fileSize?: string,
    duration?: number,
  ): Promise<void> {
    const history = this.loadHistory();
    
    const historyItem: DownloadHistoryItem = {
      id: uuidv4(),
      videoId,
      title,
      author,
      thumbnail,
      quality,
      format,
      downloadDate: new Date(),
      fileSize,
      duration,
    };

    history.unshift(historyItem); // Add to beginning
    
    // Keep only last 100 items
    if (history.length > 100) {
      history.splice(100);
    }

    this.saveHistory(history);
    this.logger.log(`Added to history: ${title}`);
  }

  async getHistory(limit: number = 50, offset: number = 0): Promise<{
    items: DownloadHistoryItem[];
    total: number;
  }> {
    const history = this.loadHistory();
    const items = history.slice(offset, offset + limit);
    
    return {
      items,
      total: history.length,
    };
  }

  async clearHistory(): Promise<void> {
    this.saveHistory([]);
    this.logger.log('Download history cleared');
  }

  async deleteHistoryItem(id: string): Promise<void> {
    let history = this.loadHistory();
    history = history.filter(item => item.id !== id);
    this.saveHistory(history);
    this.logger.log(`Deleted history item: ${id}`);
  }

  // Playlist Methods
  async getPlaylistInfo(playlistId: string): Promise<PlaylistInfo> {
    try {
      this.logger.log(`Fetching playlist info for: ${playlistId}`);
      
      // Validate playlist type - reject Mix/Radio playlists
      if (playlistId.startsWith('RDEM') || playlistId.startsWith('RDMM') || 
          playlistId.startsWith('RDCLAK') || playlistId.startsWith('RDAO')) {
        throw new Error('YouTube Mix, Radio, and auto-generated playlists cannot be downloaded. Please use a regular user-created playlist.');
      }
      
      const url = `https://www.youtube.com/playlist?list=${playlistId}`;
      
      // Use full path to yt-dlp.exe
      const ytdlpPath = path.join(process.cwd(), 'yt-dlp.exe');
      
      return new Promise<PlaylistInfo>((resolve, reject) => {
        const ytdlp = spawn(ytdlpPath, [
          '--flat-playlist',
          '--dump-json',
          url
        ]);

        let output = '';
        let errorOutput = '';

        ytdlp.stdout.on('data', (data) => {
          output += data.toString();
        });

        ytdlp.stderr.on('data', (data) => {
          errorOutput += data.toString();
          this.logger.debug(`yt-dlp stderr: ${data.toString()}`);
        });

        ytdlp.on('close', (code) => {
          if (code !== 0) {
            this.logger.error(`yt-dlp process exited with code ${code}`);
            this.logger.error(`Error output: ${errorOutput}`);
            
            // Provide user-friendly error messages
            let errorMessage = 'Failed to fetch playlist information';
            
            if (errorOutput.includes('unviewable') || errorOutput.includes('This playlist type is unviewable')) {
              errorMessage = 'This playlist type is not supported. Please use a regular public or unlisted playlist, not YouTube Mix, Radio, or auto-generated playlists.';
            } else if (errorOutput.includes('Private video') || errorOutput.includes('private')) {
              errorMessage = 'This playlist is private and cannot be accessed.';
            } else if (errorOutput.includes('not available') || errorOutput.includes('removed')) {
              errorMessage = 'This playlist is not available or has been removed.';
            } else if (errorOutput.includes('Invalid')) {
              errorMessage = 'Invalid playlist URL or ID.';
            }
            
            reject(new Error(errorMessage));
            return;
          }

          try {
            const lines = output.trim().split('\n').filter(line => line.trim());
            const videos: PlaylistVideo[] = [];
            let playlistTitle = '';
            let playlistAuthor = '';
            let playlistThumbnail = '';

            lines.forEach((line, index) => {
              try {
                const data = JSON.parse(line);
                
                if (index === 0) {
                  playlistTitle = data.playlist_title || data.title || 'Unknown Playlist';
                  playlistAuthor = data.uploader || data.channel || 'Unknown';
                  playlistThumbnail = data.thumbnail || (data.thumbnails && data.thumbnails[0]?.url) || '';
                }

                if (data.id) {
                  videos.push({
                    videoId: data.id,
                    title: data.title || 'Unknown Title',
                    author: data.uploader || data.channel || 'Unknown',
                    thumbnail: data.thumbnail || (data.thumbnails && data.thumbnails[0]?.url) || '',
                    duration: data.duration || 0,
                    index: index + 1
                  });
                }
              } catch (parseError) {
                this.logger.warn(`Failed to parse line: ${line}`);
              }
            });

            if (videos.length === 0) {
              reject(new Error('No videos found in playlist'));
              return;
            }

            const playlistInfo: PlaylistInfo = {
              playlistId,
              title: playlistTitle,
              author: playlistAuthor,
              thumbnail: playlistThumbnail,
              videoCount: videos.length,
              videos
            };

            this.logger.log(`Playlist info fetched: ${videos.length} videos`);
            resolve(playlistInfo);
          } catch (error) {
            this.logger.error(`Error parsing playlist info: ${error.message}`);
            reject(error);
          }
        });
      });
    } catch (error) {
      this.logger.error(`Error fetching playlist info: ${error.message}`);
      throw new Error(`Failed to get playlist information: ${error.message}`);
    }
  }

  async downloadPlaylist(
    playlistId: string,
    quality: string,
    format: 'mp4' | 'mp3',
    selectedVideoIds?: string[]
  ): Promise<PlaylistDownloadResponse> {
    try {
      this.logger.log(`Starting playlist download: ${playlistId}`);
      
      // Get playlist info first
      const playlistInfo = await this.getPlaylistInfo(playlistId);
      
      // Filter videos if selectedVideoIds is provided
      let videosToDownload = playlistInfo.videos;
      if (selectedVideoIds && selectedVideoIds.length > 0) {
        videosToDownload = playlistInfo.videos.filter(v => 
          selectedVideoIds.includes(v.videoId)
        );
      }

      const totalVideos = videosToDownload.length;
      let downloadedVideos = 0;
      const failedVideos: string[] = [];
      const downloadUrls: string[] = [];
      const filenames: string[] = [];

      this.logger.log(`Downloading ${totalVideos} videos from playlist`);

      // Download each video sequentially
      for (let i = 0; i < videosToDownload.length; i++) {
        const video = videosToDownload[i];
        
        try {
          // Emit progress for current video
          const progress: PlaylistDownloadProgress = {
            playlistId,
            totalVideos,
            currentVideo: i + 1,
            currentVideoTitle: video.title,
            currentVideoProgress: 0,
            overallProgress: Math.round((i / totalVideos) * 100),
            status: 'downloading'
          };
          
          this.emit('playlist-progress', progress);

          // Download the video
          const result = await this.downloadVideo(video.videoId, quality, format);
          
          if (result.success && result.downloadUrl && result.filename) {
            downloadedVideos++;
            downloadUrls.push(result.downloadUrl);
            filenames.push(result.filename);
            this.logger.log(`Downloaded ${i + 1}/${totalVideos}: ${video.title}`);
          } else {
            failedVideos.push(video.title);
            this.logger.error(`Failed to download: ${video.title}`);
          }
        } catch (error) {
          failedVideos.push(video.title);
          this.logger.error(`Error downloading ${video.title}: ${error.message}`);
        }
      }

      // Emit final progress
      const finalProgress: PlaylistDownloadProgress = {
        playlistId,
        totalVideos,
        currentVideo: totalVideos,
        currentVideoTitle: 'Completed',
        currentVideoProgress: 100,
        overallProgress: 100,
        status: 'completed'
      };
      
      this.emit('playlist-progress', finalProgress);

      return {
        success: true,
        message: `Downloaded ${downloadedVideos} of ${totalVideos} videos`,
        totalVideos,
        downloadedVideos,
        failedVideos,
        downloadUrls,
        filenames
      };
    } catch (error) {
      this.logger.error(`Error downloading playlist: ${error.message}`);
      throw new Error(`Failed to download playlist: ${error.message}`);
    }
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
