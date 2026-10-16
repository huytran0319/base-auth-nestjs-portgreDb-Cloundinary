import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsUrl,
  IsUUID,
} from 'class-validator';

export class ConfirmUploadDto {
  @IsNotEmpty()
  @IsString()
  publicId: string;

  @IsNotEmpty()
  @IsUrl()
  secureUrl: string;

  @IsOptional()
  @IsString()
  format?: string;

  @IsOptional()
  @IsNumber()
  width?: number;

  @IsOptional()
  @IsNumber()
  height?: number;

  @IsOptional()
  @IsNumber()
  bytes?: number;

  @IsOptional()
  @IsString()
  originalFilename?: string;

  @IsOptional()
  @IsString()
  folder?: string;

  @IsOptional()
  @IsUUID()
  replaceMediaId?: string;
}
