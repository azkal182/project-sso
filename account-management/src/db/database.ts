import fs from 'node:fs/promises';
import path from 'node:path';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { sql } from 'drizzle-orm';

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool);

export async function migrate() {
  const migrationDir = path.join(process.cwd(), 'migrations');
  await db.execute(sql`SELECT pg_advisory_lock(817263451)`);
  try {
    const files = (await fs.readdir(migrationDir)).filter((file) => file.endsWith('.sql')).sort();
    for (const file of files) await db.execute(sql.raw(await fs.readFile(path.join(migrationDir, file), 'utf8')));
  } finally {
    await db.execute(sql`SELECT pg_advisory_unlock(817263451)`);
  }
}
