import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';

export class PlaylistInfoDto {
  @IsString()
  @IsNotEmpty()
  playlistId: string;
}

export class DownloadPlaylistDto {
  @IsString()
  @IsNotEmpty()
  playlistId: string;

  @IsString()
  @IsNotEmpty()
  quality: string;

  @IsString()
  @IsNotEmpty()
  format: 'mp4' | 'mp3';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  selectedVideoIds?: string[]; // Optional: download only selected videos
}
