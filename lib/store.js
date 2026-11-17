/** Durable data-source metadata for DshCat. Secrets stay in this local file only. */

import { randomUUID } from 'node:crypto';
import { chmod, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { DshCatError } from './errors.js';
import { KINDS, KIND_LABELS, parseSourceUrl, sanitizeUrl } from './url.js';

const FILE_VERSION = 1;

/** Resolve DSH_HOME without depending on a Harness package. */
function dshHome() {
  const configured = process.env.DSH_HOME;
  if (typeof configured === 'string' && configured.trim() !== '') return path.resolve(configured);
  return path.join(os.homedir(), '.dsh');
}

/** Remove URL credentials before persisting. */
function credentialFreeUrl(parsedUrl) {
  try {
    const url = new URL(parsedUrl.toString());
    url.username = '';
    url.password = '';
    for (const key of [...url.searchParams.keys()]) {
      if (/^(?:password|passwd|pwd|token|access[_-]?token|secret|api[_-]?key)$/i.test(key)) {
        url.searchParams.delete(key);
      }
    }
    return url.toString();
  } catch {
    return parsedUrl.toString();
  }
}

/** Derive a readable default source name. */
function defaultName(kind, parsed) {
  const suffix = parsed.database ? ` / ${parsed.database}` : '';
  return `${KIND_LABELS[kind] || kind} ${parsed.host}:${parsed.port}${suffix}`;
}

/** Public source shape: never contains the password. */
function publicSource(source) {
  return {
    id: source.id,
    kind: source.kind,
    name: source.name,
    url: source.url,
    displayUrl: sanitizeUrl(source.url),
    username: source.username,
    hasPassword: Boolean(source.password),
    database: source.database || '',
    createdAt: source.createdAt,
    updatedAt: source.updatedAt
  };
}

export class SourceStore {
  /** @param {{logger?: {warn: Function, info?: Function}}} [options] */
  constructor(options = {}) {
    this.logger = options.logger;
    this.directory = path.join(dshHome(), 'dshcat');
    this.file = path.join(this.directory, 'datasources.json');
    /** @type {any[]} */
    this.sources = [];
    this.writeChain = Promise.resolve();
  }

  /** Load the local data-source file, tolerating a first run. */
  async load() {
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    let text;
    try {
      text = await readFile(this.file, 'utf8');
    } catch (error) {
      if (error && error.code === 'ENOENT') return;
      throw error;
    }
    try {
      const parsed = JSON.parse(text);
      const rows = parsed && Array.isArray(parsed.sources) ? parsed.sources : [];
      this.sources = rows
        .filter(row => row && typeof row === 'object' && typeof row.id === 'string' && KINDS.includes(row.kind))
        .map(row => ({
          id: row.id,
          kind: row.kind,
          name: typeof row.name === 'string' && row.name ? row.name : `${KIND_LABELS[row.kind]} datasource`,
          url: typeof row.url === 'string' ? row.url : '',
          username: typeof row.username === 'string' ? row.username : '',
          password: typeof row.password === 'string' ? row.password : '',
          database: typeof row.database === 'string' ? row.database : '',
          createdAt: typeof row.createdAt === 'string' ? row.createdAt : new Date().toISOString(),
          updatedAt: typeof row.updatedAt === 'string' ? row.updatedAt : new Date().toISOString()
        }));
    } catch (error) {
      const backup = `${this.file}.corrupt-${Date.now()}`;
      try {
        await rename(this.file, backup);
      } catch {
        // Keep the original file if it cannot be moved; starting empty is still safe.
      }
      this.logger?.warn?.(`DshCat: datasources.json was unreadable (${error instanceof Error ? error.message : String(error)}); moved to ${backup}`);
      this.sources = [];
    }
  }

  /** Serialize writes so two saves cannot interleave. */
  async persist() {
    const snapshot = JSON.stringify({ version: FILE_VERSION, sources: this.sources }, null, 2);
    const run = this.writeChain.then(async () => {
      await mkdir(this.directory, { recursive: true, mode: 0o700 });
      const temporary = `${this.file}.${process.pid}.${Date.now()}.tmp`;
      await writeFile(temporary, `${snapshot}\n`, { encoding: 'utf8', mode: 0o600 });
      await rename(temporary, this.file);
      try {
        await chmod(this.file, 0o600);
      } catch {
        // Windows does not implement POSIX modes; the file stays under the user profile.
      }
    });
    this.writeChain = run.catch(() => undefined);
    await run;
  }

  /** Public list for the browser: passwords never cross this boundary. */
  list() {
    return this.sources.map(publicSource);
  }

  /** Full record for Host-side adapters. */
  get(id) {
    if (typeof id !== 'string' || id === '') throw new DshCatError('invalid_source', '缺少数据源 ID。');
    const source = this.sources.find(entry => entry.id === id);
    if (!source) throw new DshCatError('source_not_found', '数据源不存在，可能已被删除。');
    return source;
  }

  /** Merge an unsaved form with an existing record (used by test and connect). */
  resolveInput(input) {
    if (!input || typeof input !== 'object') throw new DshCatError('invalid_source', '缺少数据源配置。');
    const kind = input.kind;
    if (!KINDS.includes(kind)) throw new DshCatError('invalid_source', '请选择有效的数据源类型。');
    const url = typeof input.url === 'string' ? input.url.trim() : '';
    if (!url) throw new DshCatError('invalid_source', '请填写连接 URL。');
    let parsed;
    try {
      parsed = parseSourceUrl(kind, url);
    } catch (error) {
      throw new DshCatError('invalid_source', error instanceof Error ? error.message : '连接 URL 无效。');
    }
    let existing;
    if (typeof input.id === 'string' && input.id !== '') {
      existing = this.sources.find(entry => entry.id === input.id);
    }
    const explicitPassword = typeof input.password === 'string' && input.password !== ''
      ? input.password
      : undefined;
    return {
      id: existing?.id ?? input.id,
      kind,
      name: typeof input.name === 'string' && input.name.trim() ? input.name.trim().slice(0, 120) : defaultName(kind, parsed),
      url: credentialFreeUrl(parsed.url),
      username: typeof input.username === 'string' && input.username !== '' ? input.username : parsed.username,
      password: input.clearPassword === true
        ? ''
        : explicitPassword ?? existing?.password ?? parsed.password,
      database: typeof input.database === 'string' ? input.database.trim() : parsed.database,
      createdAt: existing?.createdAt,
      updatedAt: undefined
    };
  }

  /** Create or update one source. */
  async save(input) {
    const resolved = this.resolveInput(input);
    const now = new Date().toISOString();
    const index = resolved.id ? this.sources.findIndex(entry => entry.id === resolved.id) : -1;
    if (resolved.id && index === -1) throw new DshCatError('source_not_found', '要更新的数据源不存在。');
    const record = {
      ...resolved,
      id: resolved.id || randomUUID(),
      createdAt: resolved.createdAt || now,
      updatedAt: now
    };
    if (index === -1) this.sources.push(record);
    else this.sources[index] = record;
    await this.persist();
    return publicSource(record);
  }

  /** Delete one source and persist immediately. */
  async delete(id) {
    const index = this.sources.findIndex(entry => entry.id === id);
    if (index === -1) throw new DshCatError('source_not_found', '数据源不存在，可能已被删除。');
    this.sources.splice(index, 1);
    await this.persist();
  }

  /** Full source used for a connection test without saving it. */
  draft(input) {
    const resolved = this.resolveInput(input);
    return { ...resolved, id: resolved.id || 'draft' };
  }
}
