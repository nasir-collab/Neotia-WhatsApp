import fs from 'node:fs';
import path from 'node:path';

function walk(dir) {
  let results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results = results.concat(walk(full));
    else if (full.endsWith('.ts')) results.push(full);
  }
  return results;
}

const files = walk('apps/api/src');
for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes('constructor(')) continue;

  // Ensure Inject is imported from @nestjs/common
  if (content.includes("from '@nestjs/common'")) {
    content = content.replace(
      /import\s*\{([\s\S]*?)\}\s*from\s*'@nestjs\/common'/,
      (match, inner) => {
        if (/\bInject\b/.test(inner)) return match;
        return `import { Inject, ${inner.trim()} } from '@nestjs/common'`;
      }
    );
  } else {
    content = `import { Inject } from '@nestjs/common';\n` + content;
  }

  // Add @Inject(Type) before private readonly name: Type
  content = content.replace(
    /(?<!@Inject\([A-Za-z0-9_]+\)\s*)private\s+readonly\s+([a-zA-Z0-9_]+)\s*:\s*([A-Z][a-zA-Z0-9_]*)/g,
    '@Inject($2) private readonly $1: $2'
  );

  fs.writeFileSync(file, content, 'utf8');
}
console.log('Applied explicit @Inject() decorators to all NestJS constructors.');
