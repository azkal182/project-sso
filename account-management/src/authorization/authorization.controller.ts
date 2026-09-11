import { Controller, ForbiddenException, Get, NotFoundException, Param, Req, UseGuards } from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '../db/database';
import { applicationMemberships, applicationOauthClients, applications, membershipRoles, permissions, rolePermissions, roles, users } from '../db/schema';
import { BearerTokenGuard } from '../auth/bearer.guard';

@Controller('api/applications')
@UseGuards(BearerTokenGuard)
export class AuthorizationController {
  @Get(':id/authorization')
  async resolve(@Param('id') id: string, @Req() req: any) {
    const application = (await db.select().from(applications).where(eq(applications.id, id)))[0];
    if (!application) throw new NotFoundException('Application not found');
    const claims: any = req.tokenClaims;
    const subject = claims.sub;
    if (!subject) throw new ForbiddenException('Token subject is missing');
    const audience = Array.isArray(claims.aud) ? claims.aud : claims.aud ? [claims.aud] : [];
    const clientId = claims.azp || audience.find((value: unknown) => typeof value === 'string' && value !== process.env.OIDC_CLIENT_ID);
    if (!clientId) throw new ForbiddenException('Token client is missing');
    const client = (await db.select().from(applicationOauthClients).where(and(eq(applicationOauthClients.applicationId, id), eq(applicationOauthClients.clientId, clientId))))[0];
    if (!client) throw new ForbiddenException('Token client is not registered for this application');
    const localUser = (await db.select().from(users).where(eq(users.keycloakUserId, subject)))[0];
    if (!localUser || localUser.status !== 'active') throw new ForbiddenException('User is not active');
    const membership = (await db.select().from(applicationMemberships).where(and(eq(applicationMemberships.applicationId, id), eq(applicationMemberships.userId, localUser.id))))[0];
    if (!membership || membership.status !== 'active') throw new ForbiddenException('User is not an active application member');
    const tokenRoles: string[] = claims.resource_access?.[clientId]?.roles || [];
    const assignedRoles = await db.select({ id: roles.id, code: roles.code, name: roles.name }).from(membershipRoles).innerJoin(roles, eq(roles.id, membershipRoles.roleId)).where(eq(membershipRoles.membershipId, membership.id));
    const rolesInToken = assignedRoles.filter((role) => tokenRoles.includes(role.code));
    const resolvedPermissions = rolesInToken.length
      ? await db.select({ code: permissions.code, name: permissions.name }).from(rolePermissions).innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId)).where(and(inArray(rolePermissions.roleId, rolesInToken.map((role) => role.id)), eq(permissions.applicationId, id)))
      : [];
    return { applicationId: id, clientId, subject, roles: rolesInToken.map((role) => role.code), permissions: [...new Set(resolvedPermissions.map((permission) => permission.code))] };
  }
}
