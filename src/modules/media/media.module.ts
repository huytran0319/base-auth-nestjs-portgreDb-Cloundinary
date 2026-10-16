import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Media } from './entities/media.entity.js';
import { MediaService } from './media.service.js';
import { MediaController } from './media.controller.js';
import { CloudinaryProvider } from './cloudinary.provider.js';

@Module({
  imports: [TypeOrmModule.forFeature([Media])],
  controllers: [MediaController],
  providers: [CloudinaryProvider, MediaService],
  exports: [MediaService],
})
export class MediaModule {}
