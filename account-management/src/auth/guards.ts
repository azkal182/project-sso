import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';

@Injectable()
export class SessionGuard implements CanActivate { canActivate(context: ExecutionContext) { if (!context.switchToHttp().getRequest().session?.user) throw new UnauthorizedException(); return true; } }

@Injectable()
export class PlatformAdminGuard implements CanActivate { canActivate(context: ExecutionContext) { const user = context.switchToHttp().getRequest().session?.user; if (!user) throw new UnauthorizedException(); if (!user.realmRoles?.includes('platform-admin') && !user.clientRoles?.includes('platform-admin')) throw new ForbiddenException(); return true; } }
