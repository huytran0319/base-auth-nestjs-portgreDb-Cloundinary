import {
  Controller,
  Post,
  Delete,
  Get,
  Query,
  Body,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { MediaService } from './media.service.js';
import type {
  SignatureResponse,
  PaginatedMediaResult,
} from './media.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/interfaces/auth.interface.js';
import { GenerateSignatureDto } from './dto/generate-signature.dto.js';
import { ConfirmUploadDto } from './dto/confirm-upload.dto.js';
import { FilterMediaDto } from './dto/filter-media.dto.js';
import { Media } from './entities/media.entity.js';

@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('signature')
  generateSignature(
    @CurrentUser() user: JwtPayload,
    @Body() dto: GenerateSignatureDto,
  ): SignatureResponse {
    return this.mediaService.generateSignature(user.sub, dto.folder);
  }

  @Post('confirm')
  confirmUpload(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ConfirmUploadDto,
  ): Promise<Media> {
    return this.mediaService.confirmUpload(user.sub, dto);
  }

  @Get()
  getUserMedia(
    @CurrentUser() user: JwtPayload,
    @Query() filter: FilterMediaDto,
  ): Promise<PaginatedMediaResult> {
    return this.mediaService.getUserMedia(user.sub, filter);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMedia(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.mediaService.deleteMedia(id, user.sub);
  }
}
