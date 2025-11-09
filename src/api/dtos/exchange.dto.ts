import { IsString, IsNotEmpty, IsOptional, IsDateString, IsNumber, Min, Max, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';

export class InitiateExchangeDto {
  @IsString()
  @IsNotEmpty()
  itemId!: string;

  @IsString()
  @IsNotEmpty()
  receiverId!: string;

  @IsString()
  @IsOptional()
  message?: string;

  @IsDateString()
  @IsOptional()
  scheduledPickup?: string;
}

export class AcceptExchangeDto {
  @IsDateString()
  @IsOptional()
  scheduledPickup?: string;
}

export class CompleteExchangeDto {
  @IsNumber()
  @IsOptional()
  @Min(0)
  ecoPointsAwarded?: number;
}

export class CancelExchangeDto {
  @IsString()
  @IsNotEmpty()
  reason!: string;
}

export class RateExchangeDto {
  @IsNumber()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsString()
  @IsOptional()
  review?: string;
}

export class ExchangeIdParamDto {
  @IsString()
  @IsNotEmpty()
  id!: string;
}

export class GetExchangeHistoryDto {
  @IsEnum(['requested', 'accepted', 'completed', 'cancelled'])
  @IsOptional()
  status?: 'requested' | 'accepted' | 'completed' | 'cancelled';

  @IsString()
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  asGiver?: boolean;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  asReceiver?: boolean;

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
