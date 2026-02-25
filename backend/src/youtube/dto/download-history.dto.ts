import { IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class DownloadHistoryDto {
  id: string;
  videoId: string;
  title: string;
  author: string;
  thumbnail: string;
  quality: string;
  format: string;
  downloadDate: Date;
  fileSize?: string;
  duration?: number;
}

export class GetHistoryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}
