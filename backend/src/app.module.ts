import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { YoutubeModule } from './youtube/youtube.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    YoutubeModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
