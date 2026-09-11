import { IsBoolean, IsEmail, IsOptional, IsString, Length, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString() @Length(1, 120) username!: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @Length(1, 120) firstName?: string;
  @IsOptional() @IsString() @Length(1, 120) lastName?: string;
  @IsOptional() @IsString() @MinLength(12) password?: string;
  @IsOptional() @IsBoolean() enabled?: boolean;
  @IsOptional() @IsBoolean() emailVerified?: boolean;
  @IsOptional() @IsBoolean() temporary?: boolean;
}

export class UpdateUserDto {
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @Length(1, 120) firstName?: string;
  @IsOptional() @IsString() @Length(1, 120) lastName?: string;
  @IsOptional() @IsBoolean() enabled?: boolean;
  @IsOptional() @IsBoolean() emailVerified?: boolean;
}

export class ResetPasswordDto {
  @IsString() @MinLength(12) password!: string;
  @IsOptional() @IsBoolean() temporary?: boolean;
}
