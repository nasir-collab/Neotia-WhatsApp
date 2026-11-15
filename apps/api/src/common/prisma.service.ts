import { Inject, Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
// @ts-ignore
import { seedDatabase } from '../../../../prisma/seed/seed-data.mjs';

function checkTcpPort(port: number, host = '127.0.0.1'): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(800);
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

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private pgLiteDb: any = null;
  private pgSocketServer: any = null;
  public engineMode: 'EXTERNAL_POSTGRES' | 'EMBEDDED_POSTGRES_16' = 'EXTERNAL_POSTGRES';

  constructor() {
    super({
      datasources: {
        db: {
          url:
            process.env.DATABASE_URL ||
            'postgresql://postgres:postgres@127.0.0.1:5432/postgres?schema=public&connection_limit=1',
        },
      },
    });
  }

  async onModuleInit() {
    const isPostgresListening = await checkTcpPort(5432);
    if (!isPostgresListening) {
      const rootDir = path.resolve(__dirname, '../../../..');
      const pgDataDir = path.join(rootDir, 'data', 'pgdata');
      const migrationFile = path.join(rootDir, 'prisma', 'migrations', '20261115000000_init', 'migration.sql');
      fs.mkdirSync(pgDataDir, { recursive: true });
      this.pgLiteDb = await PGlite.create(pgDataDir);
      if (fs.existsSync(migrationFile)) {
        const sql = fs.readFileSync(migrationFile, 'utf8');
        await this.pgLiteDb.exec(sql);
      }
      this.pgSocketServer = new PGLiteSocketServer({
        db: this.pgLiteDb,
        port: 5432,
        host: '127.0.0.1',
      });
      await this.pgSocketServer.start();
      this.engineMode = 'EMBEDDED_POSTGRES_16';
      console.log('[Database] Started persistent PostgreSQL 16 engine on 127.0.0.1:5432 (data/pgdata).');
    } else {
      this.engineMode = 'EXTERNAL_POSTGRES';
      console.log('[Database] Connected to external PostgreSQL instance on 127.0.0.1:5432.');
    }

    await this.$connect();
    await seedDatabase(this);
  }

  async onModuleDestroy() {
    await this.$disconnect();
    if (this.pgSocketServer) {
      await this.pgSocketServer.stop();
    }
    if (this.pgLiteDb) {
      await this.pgLiteDb.close();
    }
  }
}
