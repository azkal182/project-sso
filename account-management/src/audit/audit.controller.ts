import { Controller, Get, UseGuards } from '@nestjs/common';
import { db } from '../db/database';
import { auditLogs } from '../db/schema';
import { SessionGuard, PlatformAdminGuard } from '../auth/guards';
import { desc } from 'drizzle-orm';

@Controller('api/audit')
@UseGuards(SessionGuard, PlatformAdminGuard)
export class AuditController { @Get() list() { return db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(200); } }
