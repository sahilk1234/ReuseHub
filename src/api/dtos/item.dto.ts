import { IsString, IsNotEmpty, IsEnum, IsOptional, IsNumber, Min, Max, IsArray, ValidateNested, IsDateString } from 'class-validator';
import { Type, Transform } from 'class-transformer';

// Define DimensionsDto first since it's referenced by other DTOs
export class DimensionsDto {
  @IsNumber()
  @Min(0)
  length!: number;

  @IsNumber()
  @Min(0)
  width!: number;

  @IsNumber()
  @Min(0)
  height!: number;

  @IsNumber()
  @Min(0)
  weight!: number;
}

export class CreateItemDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsEnum(['new', 'like-new', 'good', 'fair', 'poor'])
  condition!: 'new' | 'like-new' | 'good' | 'fair' | 'poor';

  @IsNumber()
  latitude!: number;

  @IsNumber()
  longitude!: number;

  @IsString()
  address!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => DimensionsDto)
  dimensions?: DimensionsDto;

  @IsString()
  @IsOptional()
  pickupInstructions?: string;
}

export class UpdateItemDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsEnum(['new', 'like-new', 'good', 'fair', 'poor'])
  @IsOptional()
  condition?: 'new' | 'like-new' | 'good' | 'fair' | 'poor';

  @IsOptional()
  @ValidateNested()
  @Type(() => DimensionsDto)
  dimensions?: DimensionsDto;

  @IsString()
  @IsOptional()
  pickupInstructions?: string;
}

export class UpdateItemStatusDto {
  @IsEnum(['available', 'pending', 'exchanged', 'removed'])
  status!: 'available' | 'pending' | 'exchanged' | 'removed';
}

export class SearchItemsDto {
  @IsString()
  @IsOptional()
  searchTerm?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map(tag => tag.trim());
    }
    return value;
  })
  tags?: string[];

  @IsEnum(['available', 'pending', 'exchanged', 'removed'])
  @IsOptional()
  status?: 'available' | 'pending' | 'exchanged' | 'removed';

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => value ? parseFloat(value) : undefined)
  maxDistance?: number;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => value ? parseFloat(value) : undefined)
  latitude?: number;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => value ? parseFloat(value) : undefined)
  longitude?: number;

  @IsNumber()
  @Min(1)
  @Max(5)
  @IsOptional()
  @Transform(({ value }) => value ? parseFloat(value) : undefined)
  minRating?: number;

  @IsNumber()
  @Min(1)
  @Max(5)
  @IsOptional()
  @Transform(({ value }) => value ? parseFloat(value) : undefined)
  maxRating?: number;

  @IsDateString()
  @IsOptional()
  createdAfter?: string;

  @IsDateString()
  @IsOptional()
  createdBefore?: string;

  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Transform(({ value }) => value ? parseInt(value, 10) : 20)
  limit?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Transform(({ value }) => value ? parseInt(value, 10) : 0)
  offset?: number;
}

export class ItemIdParamDto {
  @IsString()
  @IsNotEmpty()
  id!: string;
}
