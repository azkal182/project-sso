import { Controller, Get, Res } from '@nestjs/common';
import { db } from './db/database';
import { sql } from 'drizzle-orm';
import { renderMetrics } from './observability/metrics';

@Controller()
export class AppController {
  @Get('health') async health(@Res() res: any) { try { await db.execute(sql`SELECT 1`); return res.json({ status: 'UP' }); } catch { return res.status(503).json({ status: 'DOWN' }); } }
  @Get('metrics') metrics(@Res() res: any) { res.type('text/plain').send(renderMetrics()); }
  @Get('api/me') me(@Res() res: any) { return res.req.session?.user ? res.json({ user: res.req.session.user }) : res.json({ user: null }); }
}
