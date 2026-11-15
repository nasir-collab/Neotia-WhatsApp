import fs from 'node:fs';
import path from 'node:path';

const outDir = path.join('.vercel', 'output');
const staticDir = path.join(outDir, 'static');
const funcDir = path.join(outDir, 'functions', 'api', 'index.func');

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(staticDir, { recursive: true });
fs.mkdirSync(funcDir, { recursive: true });

fs.cpSync(path.join('apps', 'web', 'dist'), staticDir, { recursive: true });
fs.copyFileSync(path.join('api', 'index.js'), path.join(funcDir, 'index.js'));
fs.copyFileSync(path.join('api', 'db-snapshot.json'), path.join(funcDir, 'db-snapshot.json'));

fs.writeFileSync(
  path.join(funcDir, '.vc-config.json'),
  JSON.stringify(
    {
      runtime: 'nodejs22.x',
      handler: 'index.js',
      launcherType: 'Nodejs',
      shouldAddHelpers: true,
    },
    null,
    2
  )
);

fs.writeFileSync(
  path.join(outDir, 'config.json'),
  JSON.stringify(
    {
      version: 3,
      routes: [
        { src: '^/api/(.*)$', dest: '/api/index' },
        { handle: 'filesystem' },
        { src: '^/(?!api/).*$', dest: '/index.html' },
      ],
    },
    null,
    2
  )
);

console.log('Generated .vercel/output Build Output API v3 successfully');
