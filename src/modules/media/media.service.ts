import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { Media } from './entities/media.entity.js';
import { CLOUDINARY_TOKEN } from './cloudinary.provider.js';
import { ConfirmUploadDto } from './dto/confirm-upload.dto.js';
import { FilterMediaDto } from './dto/filter-media.dto.js';
import type { PaginatedResult } from '../../common/dto/pagination.dto.js';

export type PaginatedMediaResult = PaginatedResult<Media>;

export interface SignatureResponse {
  timestamp: number;
  signature: string;
  apiKey: string;
  cloudName: string;
  folder: string;
}


@Injectable()
export class MediaService {
  constructor(
    @InjectRepository(Media)
    private readonly mediaRepository: Repository<Media>,
    @Inject(CLOUDINARY_TOKEN)
    private readonly cloudinaryClient: typeof cloudinary,
    private readonly configService: ConfigService,
  ) {}

  generateSignature(userId: string, targetFolder?: string): SignatureResponse {
    const timestamp = Math.round(new Date().getTime() / 1000);
    const folder = targetFolder
      ? `uploads/${targetFolder}`
      : `uploads/users/${userId}`;

    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');

    if (!apiSecret || !apiKey || !cloudName) {
      throw new BadRequestException('Cấu hình Cloudinary chưa đầy đủ trên server.');
    }

    const signature = this.cloudinaryClient.utils.api_sign_request(
      {
        folder,
        timestamp,
      },
      apiSecret,
    );

    return {
      timestamp,
      signature,
      apiKey,
      cloudName,
      folder,
    };
  }

  async confirmUpload(userId: string, dto: ConfirmUploadDto): Promise<Media> {
    if (dto.replaceMediaId) {
      await this.deleteMedia(dto.replaceMediaId, userId);
    }

    const media = this.mediaRepository.create({
      userId,
      publicId: dto.publicId,
      secureUrl: dto.secureUrl,
      format: dto.format ?? null,
      width: dto.width ?? null,
      height: dto.height ?? null,
      bytes: dto.bytes ?? null,
      originalFilename: dto.originalFilename ?? null,
      folder: dto.folder ?? null,
      resourceType: 'image',
    });

    return this.mediaRepository.save(media);
  }

  async deleteMedia(id: string, userId: string): Promise<void> {
    const media = await this.mediaRepository.findOne({
      where: { id },
    });

    if (!media) {
      throw new NotFoundException('Không tìm thấy tệp tin');
    }

    if (media.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền xóa tệp tin này');
    }

    try {
      await this.cloudinaryClient.uploader.destroy(media.publicId);
    } catch {
      // ignore
    }

    await this.mediaRepository.remove(media);
  }

  async getUserMedia(
    userId: string,
    filter: FilterMediaDto = {},
  ): Promise<PaginatedMediaResult> {
    const page = filter.page && Number(filter.page) > 0 ? Number(filter.page) : 1;
    const limit = filter.limit && Number(filter.limit) > 0 ? Number(filter.limit) : 10;
    const skip = (page - 1) * limit;

    const qb = this.mediaRepository.createQueryBuilder('media');
    qb.where('media.userId = :userId', { userId });

    if (filter.search && filter.search.trim().length > 0) {
      const search = `%${filter.search.toLowerCase().trim()}%`;
      qb.andWhere(
        '(LOWER(COALESCE(media.originalFilename, \'\')) LIKE :search OR LOWER(media.publicId) LIKE :search OR LOWER(COALESCE(media.folder, \'\')) LIKE :search)',
        { search },
      );
    }

    if (filter.folder && filter.folder.trim().length > 0) {
      qb.andWhere('media.folder = :folder', { folder: filter.folder.trim() });
    }

    if (filter.format && filter.format.trim().length > 0) {
      qb.andWhere('media.format = :format', { format: filter.format.trim() });
    }

    qb.orderBy('media.createdAt', 'DESC');
    qb.skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findById(id: string): Promise<Media | null> {
    return this.mediaRepository.findOne({ where: { id } });
  }
}
