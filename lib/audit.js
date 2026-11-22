/** Append-only, secret-free execution audit for DshDataCat. */

import { createHash } from 'node:crypto';
import { appendFile, chmod, mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

function dshHome() {
  const configured = process.env.DSH_HOME;
  if (typeof configured === 'string' && configured.trim() !== '') return path.resolve(configured);
  return path.join(os.homedir(), '.dsh');
}

export function hashStatement(text) {
  return createHash('sha256').update(String(text || '')).digest('hex');
}

export class AuditLog {
  constructor(options = {}) {
    this.logger = options.logger;
    this.file = path.join(dshHome(), 'dshcat', 'audit.jsonl');
    this.ready = false;
  }

  async ensureDirectory() {
    if (this.ready) return;
    await mkdir(path.dirname(this.file), { recursive: true, mode: 0o700 });
    this.ready = true;
  }

  /** Best effort: auditing must never change the outcome of a database action. */
  async append(entry) {
    try {
      await this.ensureDirectory();
      const line = JSON.stringify({
        ts: new Date().toISOString(),
        ...entry
      });
      await appendFile(this.file, `${line}\n`, { encoding: 'utf8', mode: 0o600 });
      try {
        await chmod(this.file, 0o600);
      } catch {
        // Windows does not implement POSIX modes.
      }
    } catch (error) {
      this.logger?.warn?.(`DshDataCat: audit append failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
