/** Syntax-check every JavaScript file shipped by DshCat. */
import { readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = join(fileURLToPath(new URL('..', import.meta.url)));
const files = [];

function walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name.startsWith('.')) continue;
    const full = join(directory, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(?:c|m)?js$/.test(entry.name)) files.push(full);
  }
}

walk(root);
files.sort();
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if (result.status !== 0) {
    console.error(`\nSyntax check failed: ${relative(root, file)}`);
    process.exit(1);
  }
}
console.log(`Syntax check passed for ${files.length} JavaScript files.`);
