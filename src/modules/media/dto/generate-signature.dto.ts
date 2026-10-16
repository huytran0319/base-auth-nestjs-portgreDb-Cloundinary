import { IsOptional, IsString } from 'class-validator';

export class GenerateSignatureDto {
  @IsOptional()
  @IsString()
  folder?: string;
}
