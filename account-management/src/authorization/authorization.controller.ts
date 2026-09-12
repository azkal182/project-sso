import { Controller, ForbiddenException, Get, NotFoundException, Param, Req, UseGuards } from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '../db/database';
import { applicationMemberships, applicationOauthClients, applications, membershipRoles, permissions, rolePermissions, roles, users } from '../db/schema';
import { BearerTokenGuard } from '../auth/bearer.guard';

export function resolveApplicationClient(clients: { clientId: string }[], claims: { azp?: unknown; aud?: unknown }) {
  const clientId = claims.azp;
  const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (typeof clientId !== 'string' || !clientId) throw new ForbiddenException('Token client is missing');
  const client = clients.find((candidate) => candidate.clientId === clientId);
  if (!client) throw new ForbiddenException('Token client is not registered for this application');
  if (!audience.some((value) => typeof value === 'string' && clients.some((candidate) => candidate.clientId === value))) throw new ForbiddenException('Token audience is not registered for this application');
  return client;
}

@Controller('api/applications')
@UseGuards(BearerTokenGuard)
export class AuthorizationController {
  @Get(':id/authorization')
  async resolve(@Param('id') id: string, @Req() req: any) {
    const application = (await db.select().from(applications).where(eq(applications.id, id)))[0];
    if (!application) throw new NotFoundException('Application not found');
    const claims: any = req.tokenClaims;
    const subject = claims.sub;
    const clientId = claims.azp;
    if (typeof subject !== 'string' || !subject) throw new ForbiddenException('Token subject is missing');
    const clients = await db.select().from(applicationOauthClients).where(eq(applicationOauthClients.applicationId, id));
    const client = resolveApplicationClient(clients, claims);
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
