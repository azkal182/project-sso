import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsOptional, IsString, IsUUID, Length, Matches, Validate, ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';

const loopbackHosts = new Set(['localhost', '127.0.0.1', '[::1]']);
const isLoopbackHttp = (parsed: URL) => parsed.protocol === 'http:' && loopbackHosts.has(parsed.hostname);

@ValidatorConstraint({ name: 'oauthClientConfig', async: false })
class OAuthClientConfigConstraint implements ValidatorConstraintInterface {
  validate(_: unknown, args: ValidationArguments) {
    const value = args.object as OAuthClientDto;
    const redirects = value.redirectUris || [];
    const origins = value.webOrigins || [];
    if ((value.clientType === 'web' || value.clientType === 'mobile') && redirects.length === 0) return false;
    if ((value.clientType === 'api' || value.clientType === 'service') && (redirects.length > 0 || origins.length > 0)) return false;
    if (redirects.some((uri) => uri.includes('*') || uri.includes('#'))) return false;
    if (origins.some((origin) => origin.includes('*'))) return false;
    try {
      for (const uri of redirects) {
        const parsed = new URL(uri);
        if (value.clientType !== 'mobile' && !['http:', 'https:'].includes(parsed.protocol)) return false;
        if (parsed.protocol === 'http:' && !isLoopbackHttp(parsed)) return false;
      }
      for (const origin of origins) {
        const parsed = new URL(origin);
        if (!['http:', 'https:'].includes(parsed.protocol) || parsed.pathname !== '/' || parsed.search || parsed.hash) return false;
        if (parsed.protocol === 'http:' && !isLoopbackHttp(parsed)) return false;
      }
      return true;
    } catch { return false; }
  }
  defaultMessage() { return 'OAuth client redirect and origin configuration is invalid'; }
}

@ValidatorConstraint({ name: 'oauthClientUpdateConfig', async: false })
class OAuthClientUpdateConfigConstraint implements ValidatorConstraintInterface {
  validate(_: unknown, args: ValidationArguments) {
    const value = args.object as OAuthClientUpdateDto;
    const values = [...(value.redirectUris || []), ...(value.webOrigins || [])];
    try {
      return values.every((item) => {
        if (item.includes('*') || item.includes('#')) return false;
        const parsed = new URL(item);
        return parsed.protocol !== 'http:' || isLoopbackHttp(parsed);
      });
    } catch { return false; }
  }
  defaultMessage() { return 'OAuth client redirect and origin configuration is invalid'; }
}

export class ApplicationDto { @IsString() @Length(2, 80) @Matches(/^[a-z0-9-]+$/) code!: string; @IsString() @Length(1, 160) name!: string; @IsOptional() @IsString() description?: string; }
export class ApplicationUpdateDto { @IsOptional() @IsString() @Length(1, 160) name?: string; @IsOptional() @IsString() description?: string; @IsOptional() @IsIn(['active', 'disabled']) status?: string; }
export class RoleDto { @IsString() @Length(1, 80) @Matches(/^[a-z0-9._-]+$/) code!: string; @IsString() @Length(1, 160) name!: string; @IsOptional() @IsString() description?: string; }
export class PermissionDto extends RoleDto {}
export class MembershipCreateDto { @IsUUID() userId!: string; @IsOptional() @IsIn(['active', 'disabled']) status?: string; }
export class MembershipUpdateDto { @IsIn(['active', 'disabled']) status!: string; }
export class AssignmentDto { @IsUUID() id!: string; }
export class OAuthClientDto { @IsString() @Length(1, 80) @Matches(/^[a-z0-9._-]+$/) clientId!: string; @IsString() @Length(1, 160) name!: string; @IsIn(['web', 'api', 'mobile', 'service']) @Validate(OAuthClientConfigConstraint) clientType!: string; @IsOptional() @IsArray() @ArrayMaxSize(50) @IsString({ each: true }) redirectUris?: string[]; @IsOptional() @IsArray() @ArrayMaxSize(50) @IsString({ each: true }) webOrigins?: string[]; @IsOptional() @IsBoolean() enabled?: boolean; }
export class OAuthClientUpdateDto { @IsOptional() @IsString() @Length(1, 160) name?: string; @IsOptional() @IsArray() @ArrayMaxSize(50) @IsString({ each: true }) @Validate(OAuthClientUpdateConfigConstraint) redirectUris?: string[]; @IsOptional() @IsArray() @ArrayMaxSize(50) @IsString({ each: true }) @Validate(OAuthClientUpdateConfigConstraint) webOrigins?: string[]; @IsOptional() @IsBoolean() enabled?: boolean; }
