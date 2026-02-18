import { IsString, IsNotEmpty, Matches } from 'class-validator';

export class VideoInfoDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-zA-Z0-9_-]{11}$/, {
    message: 'Invalid YouTube video ID',
  })
  videoId: string;
}

export class DownloadVideoDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-zA-Z0-9_-]{11}$/, {
    message: 'Invalid YouTube video ID',
  })
  videoId: string;

  @IsString()
  @IsNotEmpty()
  quality: string;

  @IsString()
  @IsNotEmpty()
  format: 'mp4' | 'mp3';
}
