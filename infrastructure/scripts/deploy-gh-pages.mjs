import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const rootDir = process.cwd();
const distDir = path.join(rootDir, 'apps', 'web', 'dist');

// 1. Build frontend with GITHUB_PAGES=true
console.log('[GH-Pages] Building frontend with base=/Neotia-WhatsApp/ ...');
execSync('npm --workspace=apps/web run build', {
  stdio: 'inherit',
  env: { ...process.env, GITHUB_PAGES: 'true' },
});

// Add 404.html & .nojekyll
fs.copyFileSync(path.join(distDir, 'index.html'), path.join(distDir, '404.html'));
fs.writeFileSync(path.join(distDir, '.nojekyll'), '');

// 2. Push built dist/ to orphan gh-pages branch from temp dir
const tmpDir = path.join(os.tmpdir(), `neotia-gh-pages-${Date.now()}`);
fs.mkdirSync(tmpDir, { recursive: true });
fs.cpSync(distDir, tmpDir, { recursive: true });

execSync('git init', { cwd: tmpDir, stdio: 'inherit' });
execSync('git checkout -b gh-pages', { cwd: tmpDir, stdio: 'inherit' });
execSync('git add .', { cwd: tmpDir, stdio: 'inherit' });
execSync('git commit -m "deploy: live GitHub Pages build for Neotia Bhagirathi Platform"', {
  cwd: tmpDir,
  stdio: 'inherit',
});
execSync('git remote add origin https://github.com/nasir-collab/Neotia-WhatsApp.git', {
  cwd: tmpDir,
  stdio: 'inherit',
});
execSync('git push -u origin gh-pages --force', { cwd: tmpDir, stdio: 'inherit' });
fs.rmSync(tmpDir, { recursive: true, force: true });

// 3. Enable GitHub Pages on branch gh-pages via GitHub REST API
const credOut = execSync('git credential fill', {
  input: 'protocol=https\nhost=github.com\n\n',
  encoding: 'utf8',
});
const creds = Object.fromEntries(credOut.trim().split('\n').map((l) => l.split('=')));

const resp = await fetch('https://api.github.com/repos/nasir-collab/Neotia-WhatsApp/pages', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${creds.password}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'ANHVL-GH-Pages',
  },
  body: JSON.stringify({
    source: { branch: 'gh-pages', path: '/' },
  }),
});

const json = await resp.json().catch(() => ({}));
console.log('[GH-Pages] Enable API Status:', resp.status, JSON.stringify(json));
console.log('[GH-Pages] Permanent Live URL: https://nasir-collab.github.io/Neotia-WhatsApp/');
