import { BadRequestException, Body, ConflictException, Controller, Delete, Get, NotFoundException, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { eq, inArray } from 'drizzle-orm';
import { SessionGuard, PlatformAdminGuard } from '../auth/guards';
import { KeycloakService } from '../keycloak/keycloak.service';
import { db } from '../db/database';
import { auditLogs, users } from '../db/schema';
import { CreateUserDto, ResetPasswordDto, UpdateUserDto } from './dto';

@Controller('api/users')
@UseGuards(SessionGuard, PlatformAdminGuard)
export class UsersController {
  constructor(private readonly keycloak: KeycloakService) {}

  private async audit(req: any, action: string, entityId: string | undefined, metadata: unknown = {}) {
    await db.insert(auditLogs).values({ actorUserId: req.session.user.id, action, entityType: 'user', entityId, metadata });
  }

  @Get()
  async list(@Req() req: any) {
    const search = req.query.search ? `&search=${encodeURIComponent(req.query.search)}` : '';
    const result: any[] = await this.keycloak.request('GET', `/users?max=${Math.min(Number(req.query.limit || 100), 100)}${search}`);
    const ids = result.map((user) => user.id).filter(Boolean);
    const local = ids.length ? await db.select().from(users).where(inArray(users.keycloakUserId, ids)) : [];
    const byKeycloakId = new Map(local.map((user) => [user.keycloakUserId, user]));
    return result.map((user) => ({ ...user, localId: byKeycloakId.get(user.id)?.id || null, localStatus: byKeycloakId.get(user.id)?.status || null }));
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    const keycloakUser: any = await this.keycloak.user(id);
    const local = await db.select().from(users).where(eq(users.keycloakUserId, id));
    if (!local[0]) throw new NotFoundException('Local user reference not found');
    return { ...keycloakUser, local: local[0] };
  }

  @Post()
  async create(@Body() body: CreateUserDto, @Req() req: any) {
    if (!body.username || typeof body.username !== 'string') throw new BadRequestException('username is required');
    const user = { username: body.username, email: body.email, firstName: body.firstName, lastName: body.lastName, enabled: body.enabled !== false, emailVerified: body.emailVerified === true };
    const keycloakUserId = await this.keycloak.createUser(user);
    try {
      if (body.password !== undefined) {
        if (typeof body.password !== 'string' || body.password.length < 12) throw new BadRequestException('password must be at least 12 characters');
        await this.keycloak.resetPassword(keycloakUserId, body.password, body.temporary !== false);
      }
      const local = await db.insert(users).values({ keycloakUserId, username: user.username, displayName: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username, email: user.email || null, status: user.enabled ? 'active' : 'disabled' }).returning();
      await this.audit(req, 'user.created', keycloakUserId, user);
      return local[0];
    } catch (error: any) {
      await this.keycloak.deleteUser(keycloakUserId).catch(() => undefined);
      await db.delete(users).where(eq(users.keycloakUserId, keycloakUserId)).catch(() => undefined);
      if (error?.code === '23505') throw new ConflictException('User already exists');
      throw error;
    }
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: UpdateUserDto, @Req() req: any) {
    const local = (await db.select().from(users).where(eq(users.keycloakUserId, id)))[0];
    if (!local) throw new NotFoundException('Local user reference not found');
    const update = Object.fromEntries(Object.entries({ email: body.email, firstName: body.firstName, lastName: body.lastName, enabled: body.enabled, emailVerified: body.emailVerified }).filter(([, value]) => value !== undefined));
    if (!Object.keys(update).length) throw new BadRequestException('No user fields to update');
    await this.keycloak.updateUser(id, update);
    const localUpdate: any = { updatedAt: new Date() };
    if (update.email !== undefined) localUpdate.email = update.email || null;
    if (update.firstName !== undefined || update.lastName !== undefined) localUpdate.displayName = [update.firstName ?? '', update.lastName ?? ''].filter(Boolean).join(' ') || update.username || local.username;
    if (update.enabled !== undefined) localUpdate.status = update.enabled ? 'active' : 'disabled';
    const saved = (await db.update(users).set(localUpdate).where(eq(users.keycloakUserId, id)).returning())[0];
    const action = update.enabled === false ? 'user.disabled' : update.enabled === true ? 'user.enabled' : 'user.updated';
    await this.audit(req, action, id, update);
    return saved;
  }

  @Post(':id/password')
  async password(@Param('id') id: string, @Body() body: ResetPasswordDto, @Req() req: any) {
    if (typeof body.password !== 'string' || body.password.length < 12) throw new BadRequestException('password must be at least 12 characters');
    await this.keycloak.resetPassword(id, body.password, body.temporary !== false);
    await this.audit(req, 'user.password_reset_initiated', id, { temporary: body.temporary !== false });
    return { updated: true };
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: any) {
    const local = (await db.select().from(users).where(eq(users.keycloakUserId, id)))[0];
    if (!local) throw new NotFoundException('Local user reference not found');
    await this.keycloak.deleteUser(id);
    await db.delete(users).where(eq(users.keycloakUserId, id));
    await this.audit(req, 'user.deleted', id);
    return { deleted: true };
  }
}
