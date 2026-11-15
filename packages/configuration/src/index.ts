export interface PlatformEnvironmentConfig {
  appEnv: 'development' | 'staging' | 'production';
  port: number;
  demoMode: boolean;
  databaseUrl: string;
  redisUrl: string;
  metaConfigured: boolean;
  hisConfigured: boolean;
  altruistConfigured: boolean;
}

export function loadPlatformConfig(): PlatformEnvironmentConfig {
  const demoMode = process.env.DEMO_MODE !== 'false';
  const metaConfigured = Boolean(
    process.env.META_ACCESS_TOKEN &&
      process.env.WHATSAPP_PHONE_NUMBER_ID &&
      process.env.WHATSAPP_BUSINESS_ACCOUNT_ID
  );
  const hisConfigured = Boolean(process.env.HIS_API_BASE_URL && process.env.HIS_API_AUTH);
  const altruistConfigured = Boolean(process.env.ALTRUIST_API_BASE_URL && process.env.ALTRUIST_API_AUTH);

  return {
    appEnv: (process.env.APP_ENV as PlatformEnvironmentConfig['appEnv']) || 'development',
    port: Number(process.env.PORT || 4000),
    demoMode,
    databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5432/postgres?schema=public&connection_limit=1',
    redisUrl: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
    metaConfigured,
    hisConfigured,
    altruistConfigured,
  };
}

