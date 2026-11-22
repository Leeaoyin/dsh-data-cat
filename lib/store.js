/** Durable data-source metadata for DshDataCat. Passwords live in ctx.credentials. */

import { randomUUID } from 'node:crypto';
import { chmod, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { DshCatError } from './errors.js';
import { KINDS, KIND_LABELS, parseSourceUrl, sanitizeUrl } from './url.js';

const FILE_VERSION = 2;
const CREDENTIAL_SCOPE = 'dshcat';
const MIN_TIMEOUT_MS = 1_000;
const MAX_TIMEOUT_MS = 120_000;
const DEFAULT_MAX_ROWS = 2_000;
const MAX_POLICY_DATABASES = 50;

/** Defaults are deliberately conservative; users can narrow them further. */
export const DEFAULT_POLICY = Object.freeze({
  readOnly: false,
  statementTimeoutMs: 15_000,
  maxRows: DEFAULT_MAX_ROWS,
  allowedDatabases: [],
  aiEnabled: true,
  aiSampleData: false
});

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

/** Credential records are addressed as <scope>/<id>; the credentials seam uses opaque strings. */
export function credentialKeyFor(sourceId) {
  return `${CREDENTIAL_SCOPE}/${sourceId}`;
}

/** Normalize policy so a malformed file cannot silently grant more access. */
export function normalizePolicy(input, fallback = DEFAULT_POLICY) {
  const base = fallback && typeof fallback === 'object' ? fallback : DEFAULT_POLICY;
  const value = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const timeout = Number(value.statementTimeoutMs ?? base.statementTimeoutMs ?? DEFAULT_POLICY.statementTimeoutMs);
  const maxRows = Number(value.maxRows ?? base.maxRows ?? DEFAULT_POLICY.maxRows);
  const allowed = Array.isArray(value.allowedDatabases ?? base.allowedDatabases)
    ? (value.allowedDatabases ?? base.allowedDatabases)
    : [];
  return {
    readOnly: value.readOnly === undefined ? base.readOnly === true : value.readOnly === true,
    statementTimeoutMs: Number.isFinite(timeout)
      ? Math.max(MIN_TIMEOUT_MS, Math.min(MAX_TIMEOUT_MS, Math.trunc(timeout)))
      : DEFAULT_POLICY.statementTimeoutMs,
    maxRows: Number.isFinite(maxRows)
      ? Math.max(1, Math.min(10_000, Math.trunc(maxRows)))
      : DEFAULT_POLICY.maxRows,
    allowedDatabases: [...new Set(allowed
      .filter(item => typeof item === 'string' && item.trim() !== '')
      .map(item => item.trim().slice(0, 128)))]
      .slice(0, MAX_POLICY_DATABASES),
    aiEnabled: value.aiEnabled === undefined ? base.aiEnabled !== false : value.aiEnabled !== false,
    aiSampleData: value.aiSampleData === undefined ? base.aiSampleData === true : value.aiSampleData === true
  };
}

/** Public source shape: never contains the password. */
function publicSource(source, hasPassword) {
  return {
    id: source.id,
    kind: source.kind,
    name: source.name,
    url: source.url,
    displayUrl: sanitizeUrl(source.url),
    username: source.username,
    hasPassword,
    database: source.database || '',
    policy: normalizePolicy(source.policy),
    createdAt: source.createdAt,
    updatedAt: source.updatedAt
  };
}

export class SourceStore {
  /** @param {{logger?: {warn: Function, info?: Function}, credentials?: any}} [options] */
  constructor(options = {}) {
    this.logger = options.logger;
    this.credentials = options.credentials;
    this.directory = path.join(dshHome(), 'dshcat');
    this.file = path.join(this.directory, 'datasources.json');
    /** @type {any[]} */
    this.sources = [];
    /** Passwords are held in process memory for adapters; never written to datasources.json. */
    this.secrets = new Map();
    this.credentialIds = new Set();
    this.writeChain = Promise.resolve();
  }

  requireCredentials() {
    if (!this.credentials) {
      throw new DshCatError('credentials_unavailable', 'DSH 凭据服务不可用，无法读取数据源密码。');
    }
    return this.credentials;
  }

  async readPassword(sourceId) {
    const record = await this.requireCredentials().readRecord(credentialKeyFor(sourceId));
    const password = record?.kind === 'grant'
      && record.payload
      && typeof record.payload.password === 'string'
      ? record.payload.password
      : '';
    if (password) {
      this.secrets.set(sourceId, password);
      this.credentialIds.add(sourceId);
    } else {
      this.secrets.delete(sourceId);
      this.credentialIds.delete(sourceId);
    }
    return password;
  }

  /** Re-read one credential after an external rotation without editing metadata. */
  async refreshPassword(sourceId) {
    return this.readPassword(sourceId);
  }

  async writePassword(sourceId, password) {
    await this.requireCredentials().modifyRecord(credentialKeyFor(sourceId), async () => ({
      kind: 'grant',
      payload: { password }
    }));
    this.secrets.set(sourceId, password);
    this.credentialIds.add(sourceId);
  }

  async deletePassword(sourceId) {
    await this.requireCredentials().deleteRecord(credentialKeyFor(sourceId));
    this.secrets.delete(sourceId);
    this.credentialIds.delete(sourceId);
  }

  /** Load local metadata and migrate any legacy plaintext password into the credential store. */
  async load() {
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    let text;
    try {
      text = await readFile(this.file, 'utf8');
    } catch (error) {
      if (error && error.code === 'ENOENT') return;
      throw error;
    }
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (error) {
      const backup = `${this.file}.corrupt-${Date.now()}`;
      try {
        await rename(this.file, backup);
      } catch {
        // Keep the original file if it cannot be moved; starting empty is still safe.
      }
      this.logger?.warn?.(`DshDataCat: datasources.json was unreadable (${error instanceof Error ? error.message : String(error)}); moved to ${backup}`);
      this.sources = [];
      this.secrets.clear();
      this.credentialIds.clear();
      return;
    }
    const rows = parsed && Array.isArray(parsed.sources) ? parsed.sources : [];
    const valid = rows.filter(row => row && typeof row === 'object' && typeof row.id === 'string' && KINDS.includes(row.kind));
    let migrated = parsed?.version !== FILE_VERSION;
    this.sources = [];
    this.secrets.clear();
    this.credentialIds.clear();
    for (const row of valid) {
      const hadLegacyField = Object.prototype.hasOwnProperty.call(row, 'password');
      const legacyPassword = typeof row.password === 'string' && row.password !== '' ? row.password : '';
      if (hadLegacyField || !row.policy) migrated = true;
      const source = {
        id: row.id,
        kind: row.kind,
        name: typeof row.name === 'string' && row.name ? row.name : `${KIND_LABELS[row.kind]} datasource`,
        url: typeof row.url === 'string' ? row.url : '',
        username: typeof row.username === 'string' ? row.username : '',
        database: typeof row.database === 'string' ? row.database : '',
        policy: normalizePolicy(row.policy),
        createdAt: typeof row.createdAt === 'string' ? row.createdAt : new Date().toISOString(),
        updatedAt: typeof row.updatedAt === 'string' ? row.updatedAt : new Date().toISOString()
      };
      this.sources.push(source);
      const existing = await this.readPassword(source.id);
      if (legacyPassword) {
        migrated = true;
        if (!existing) await this.writePassword(source.id, legacyPassword);
      }
    }
    if (migrated) await this.persist();
  }

  /** Serialize writes so two saves cannot interleave. */
  async persist() {
    const snapshot = JSON.stringify({
      version: FILE_VERSION,
      sources: this.sources.map(source => ({
        id: source.id,
        kind: source.kind,
        name: source.name,
        url: source.url,
        username: source.username,
        database: source.database,
        policy: normalizePolicy(source.policy),
        createdAt: source.createdAt,
        updatedAt: source.updatedAt
      }))
    }, null, 2);
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
    return this.sources.map(source => publicSource(source, this.credentialIds.has(source.id)));
  }

  /** Full record for Host-side adapters, including the in-memory password. */
  get(id) {
    if (typeof id !== 'string' || id === '') throw new DshCatError('invalid_source', '缺少数据源 ID。');
    const source = this.sources.find(entry => entry.id === id);
    if (!source) throw new DshCatError('source_not_found', '数据源不存在，可能已被删除。');
    return { ...source, password: this.secrets.get(id) || '' };
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
    const existing = typeof input.id === 'string' && input.id !== ''
      ? this.sources.find(entry => entry.id === input.id)
      : undefined;
    return {
      id: existing?.id ?? input.id,
      kind,
      name: typeof input.name === 'string' && input.name.trim() ? input.name.trim().slice(0, 120) : defaultName(kind, parsed),
      url: credentialFreeUrl(parsed.url),
      username: typeof input.username === 'string' && input.username !== '' ? input.username : parsed.username,
      database: typeof input.database === 'string' ? input.database.trim() : parsed.database,
      urlPassword: parsed.password || '',
      policy: normalizePolicy(input.policy, existing?.policy || DEFAULT_POLICY),
      createdAt: existing?.createdAt,
      updatedAt: undefined
    };
  }

  /** Create or update one source. Password changes go to ctx.credentials, not the JSON file. */
  async save(input) {
    const resolved = this.resolveInput(input);
    const now = new Date().toISOString();
    const index = resolved.id ? this.sources.findIndex(entry => entry.id === resolved.id) : -1;
    if (resolved.id && index === -1) throw new DshCatError('source_not_found', '要更新的数据源不存在。');
    const id = resolved.id || randomUUID();
    const explicitPassword = typeof input.password === 'string' && input.password !== ''
      ? input.password
      : resolved.urlPassword || undefined;
    if (input.clearPassword === true) await this.deletePassword(id);
    else if (explicitPassword !== undefined) await this.writePassword(id, explicitPassword);
    const { urlPassword: _urlPassword, ...metadata } = resolved;
    const record = {
      ...metadata,
      id,
      createdAt: resolved.createdAt || now,
      updatedAt: now
    };
    if (index === -1) this.sources.push(record);
    else this.sources[index] = record;
    await this.persist();
    return publicSource(record, this.credentialIds.has(id));
  }

  /** Delete one source and its credential record. */
  async delete(id) {
    const index = this.sources.findIndex(entry => entry.id === id);
    if (index === -1) throw new DshCatError('source_not_found', '数据源不存在，可能已被删除。');
    await this.deletePassword(id);
    this.sources.splice(index, 1);
    await this.persist();
  }

  /** Full source used for a connection test without saving it. */
  draft(input) {
    const resolved = this.resolveInput(input);
    const { urlPassword, ...metadata } = resolved;
    const existingId = resolved.id;
    const explicitPassword = typeof input.password === 'string' && input.password !== ''
      ? input.password
      : urlPassword || undefined;
    return {
      ...metadata,
      id: existingId || 'draft',
      password: input.clearPassword === true
        ? ''
        : explicitPassword ?? (existingId ? this.secrets.get(existingId) || '' : '')
    };
  }
}
