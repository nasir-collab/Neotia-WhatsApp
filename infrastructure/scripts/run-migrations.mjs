import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');
const pgDataDir = path.join(rootDir, 'data', 'pgdata');
const migrationFile = path.join(rootDir, 'prisma', 'migrations', '20261115000000_init', 'migration.sql');

function isPortOpen(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1000);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
}

async function runMigrations() {
  const sql = fs.readFileSync(migrationFile, 'utf8');
  const portRunning = await isPortOpen(5432);

  if (portRunning) {
    console.log('[DB Migration] Detected running PostgreSQL server on 127.0.0.1:5432. Executing migration SQL...');
    const client = new pg.Client({
      connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5432/postgres?schema=public',
    });
    await client.connect();
    await client.query(sql);
    await client.end();
    console.log('[DB Migration] PostgreSQL schema migration applied successfully.');
  } else {
    console.log('[DB Migration] Initializing embedded PostgreSQL 16 data directory at ./data/pgdata...');
    fs.mkdirSync(pgDataDir, { recursive: true });
    const db = await PGlite.create(pgDataDir);
    await db.exec(sql);
    const server = new PGLiteSocketServer({ db, port: 5432, host: '127.0.0.1' });
    await server.start();
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    const count = await prisma.role.count();
    console.log(`[DB Migration] PostgreSQL 16 schema verified via Prisma Client! Existing roles: ${count}`);
    await prisma.$disconnect();
    await server.stop();
    await db.close();
  }
}

runMigrations().catch((err) => {
  console.error('[DB Migration Error]', err);
  process.exit(1);
});

