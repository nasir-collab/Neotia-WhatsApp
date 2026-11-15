import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { PrismaClient } from '@prisma/client';
import { seedDatabase } from './seed-data.mjs';

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

async function main() {
  const portRunning = await isPortOpen(5432);
  let db = null;
  let server = null;

  if (!portRunning) {
    fs.mkdirSync(pgDataDir, { recursive: true });
    db = await PGlite.create(pgDataDir);
    const sql = fs.readFileSync(migrationFile, 'utf8');
    await db.exec(sql);
    server = new PGLiteSocketServer({ db, port: 5432, host: '127.0.0.1' });
    await server.start();
  }

  const prisma = new PrismaClient();
  try {
    await seedDatabase(prisma);
  } finally {
    await prisma.$disconnect();
    if (server) await server.stop();
    if (db) await db.close();
  }
}

main().catch((err) => {
  console.error('[Seed Error]', err);
  process.exit(1);
});

