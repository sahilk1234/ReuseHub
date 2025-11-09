import { IsString, IsNotEmpty, IsEmail, IsEnum, IsOptional, IsNumber, ValidateNested, IsPhoneNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class RegisterUserDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  displayName!: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEnum(['individual', 'organization'])
  accountType!: 'individual' | 'organization';

  @IsNumber()
  latitude!: number;

  @IsNumber()
  longitude!: number;

  @IsString()
  address!: string;
}

export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  displayName?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  avatar?: string;
}

export class UpdateLocationDto {
  @IsNumber()
  latitude!: number;

  @IsNumber()
  longitude!: number;

  @IsString()
  address!: string;
}

export class VerifyUserDto {
  @IsString()
  @IsNotEmpty()
  verificationToken!: string;
}

export class UserIdParamDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;
}
