import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsOptional, IsString, IsUUID, Length, Matches } from 'class-validator';

export class ApplicationDto { @IsString() @Length(2, 80) @Matches(/^[a-z0-9-]+$/) code!: string; @IsString() @Length(1, 160) name!: string; @IsOptional() @IsString() description?: string; }
export class ApplicationUpdateDto { @IsOptional() @IsString() @Length(1, 160) name?: string; @IsOptional() @IsString() description?: string; @IsOptional() @IsIn(['active', 'disabled']) status?: string; }
export class RoleDto { @IsString() @Length(1, 80) @Matches(/^[a-z0-9._-]+$/) code!: string; @IsString() @Length(1, 160) name!: string; @IsOptional() @IsString() description?: string; }
export class PermissionDto extends RoleDto {}
export class MembershipCreateDto { @IsUUID() userId!: string; @IsOptional() @IsIn(['active', 'disabled']) status?: string; }
export class MembershipUpdateDto { @IsIn(['active', 'disabled']) status!: string; }
export class AssignmentDto { @IsUUID() id!: string; }
export class OAuthClientDto { @IsString() @Length(1, 80) @Matches(/^[a-z0-9._-]+$/) clientId!: string; @IsString() @Length(1, 160) name!: string; @IsIn(['web', 'api', 'mobile', 'service']) clientType!: string; @IsOptional() @IsArray() @ArrayMaxSize(50) @IsString({ each: true }) redirectUris?: string[]; @IsOptional() @IsArray() @ArrayMaxSize(50) @IsString({ each: true }) webOrigins?: string[]; @IsOptional() @IsBoolean() enabled?: boolean; }
export class OAuthClientUpdateDto { @IsOptional() @IsString() @Length(1, 160) name?: string; @IsOptional() @IsArray() @ArrayMaxSize(50) @IsString({ each: true }) redirectUris?: string[]; @IsOptional() @IsArray() @ArrayMaxSize(50) @IsString({ each: true }) webOrigins?: string[]; @IsOptional() @IsBoolean() enabled?: boolean; }
