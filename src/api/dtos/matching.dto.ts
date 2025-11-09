import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, Max, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class GetRecommendationsDto {
  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => value ? parseFloat(value) : undefined)
  latitude?: number;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => value ? parseFloat(value) : undefined)
  longitude?: number;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => value ? parseFloat(value) : undefined)
  maxDistance?: number;

  @IsNumber()
  @Min(1)
  @Max(50)
  @IsOptional()
  @Transform(({ value }) => value ? parseInt(value, 10) : 15)
  limit?: number;
}

export class FindSimilarItemsDto {
  @IsNumber()
  @Min(1)
  @Max(50)
  @IsOptional()
  @Transform(({ value }) => value ? parseInt(value, 10) : 10)
  limit?: number;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  excludeOwnItems?: boolean;
}

export class ItemIdParamDto {
  @IsString()
  @IsNotEmpty()
  itemId!: string;
}
