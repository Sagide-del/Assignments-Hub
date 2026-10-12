import { ResourceFulfillment, ResourceListingType } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, IsUrl, Max, MaxLength, Min } from 'class-validator';

export class CreateResourceDto {
  @IsString()
  @MaxLength(160)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsEnum(ResourceListingType)
  type!: ResourceListingType;

  @IsEnum(ResourceFulfillment)
  fulfillment!: ResourceFulfillment;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  subject?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  grade?: string;

  @IsInt()
  @Min(0)
  @Max(1_000_000)
  priceKES!: number;

  @IsOptional()
  @IsString()
  assetKey?: string;

  @IsOptional()
  @IsString()
  fileName?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  fileSize?: number;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  coverImageUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  stockQuantity?: number;
}
