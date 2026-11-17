/** Redis adapter using node-redis. */

import { createClient } from 'redis';
import { BaseAdapter } from './base.js';
import { connectionInfo } from '../url.js';
import { DshCatError } from '../errors.js';
import { cleanSql, pageNumber, pageSize, pageResult } from './common.js';
import { parseRedisCommand, redisCommandLine, exportFilename, normalizeValue } from '../sql.js';

const SCAN_LIMIT = 20_000;
const EXPORT_KEY_CAP = 1_000;

function safeText(value) {
  if (Buffer.isBuffer(value)) return value.toString('utf8');
  if (typeof value === 'string') return value;
  return String(value);
}

function parseDbIndex(database) {
  const text = String(database ?? 'db0').trim().toLowerCase();
  const match = /^(?:db)?(\d+)$/.exec(text);
  if (!match) throw new DshCatError('invalid_database', 'Redis 数据库应类似 db0。');
  const index = Number(match[1]);
  if (!Number.isInteger(index) || index < 0 || index > 1024) throw new DshCatError('invalid_database', 'Redis 数据库编号无效。');
  return index;
}

function globEscape(value) {
  return String(value).replace(/[*?[\]\\]/g, '\\$&');
}

function formatValue(value) {
  if (Array.isArray(value)) return value.slice(0, 50).map(item => normalizeValue(item));
  if (value && typeof value === 'object') {
    const out = {};
    for (const key of Object.keys(value).slice(0, 30)) out[key] = normalizeValue(value[key]);
    return out;
  }
  return normalizeValue(value);
}

function truncateVisible(value, max = 1600) {
  let text;
  try {
    text = JSON.stringify(value);
  } catch {
    text = String(value);
  }
  if (text === undefined) return null;
  return text.length > max ? `${text.slice(0, max)}…` : JSON.parse(text);
}

/** Parse `INFO keyspace` into per-db counts. */
function parseKeyspace(info) {
  const map = new Map();
  for (const line of String(info).split(/\r?\n/)) {
    const match = /^db(\d+):keys=(\d+)/.exec(line.trim());
    if (match) map.set(Number(match[1]), Number(match[2]));
  }
  return map;
}

export class RedisAdapter extends BaseAdapter {
  constructor(source, options) {
    super(source, options);
    this.info = connectionInfo(source);
    this.clients = new Map();
  }

  async clientFor(database) {
    const index = database === undefined || database === null
      ? (this.info.redisDatabase ?? 0)
      : parseDbIndex(database);
    const cached = this.clients.get(index);
    if (cached?.isOpen) return cached;
    if (cached) {
      try {
        await cached.disconnect();
      } catch {
        // The client was already gone.
      }
      this.clients.delete(index);
    }
    const options = {
      socket: {
        host: this.info.host,
        port: this.info.port,
        connectTimeout: 10_000,
        reconnectStrategy: false
      },
      username: this.info.username || undefined,
      password: this.info.password || undefined
    };
    if (this.info.url.protocol === 'rediss:') options.socket.tls = true;
    const client = createClient(options);
    client.on('error', error => this.logger?.warn?.('DshCat Redis client error', error?.message || error));
    await client.connect();
    if (index !== 0) await client.select(index);
    this.clients.set(index, client);
    return client;
  }

  async test() {
    const started = Date.now();
    try {
      const client = await this.clientFor();
      const pong = await client.ping();
      const info = await client.info('server');
      const version = /redis_version:([^\r\n]+)/.exec(String(info))?.[1] || '';
      return {
        ok: true,
        latencyMs: Date.now() - started,
        version: version ? `Redis ${version}` : String(pong),
        label: `${this.info.host}:${this.info.port}`
      };
    } catch (error) {
      const target = `${this.info.host}:${this.info.port}`;
      const code = error?.code || error?.errors?.[0]?.code;
      if (code === 'ECONNREFUSED') {
        throw new DshCatError('connection_refused', `无法连接 Redis ${target}：连接被拒绝。请确认 Redis 服务已启动，并检查端口是否正确（默认 6379）。`);
      }
      if (code === 'ENOTFOUND') {
        throw new DshCatError('host_not_found', `无法解析 Redis 主机 ${this.info.host}，请检查地址。`);
      }
      if (code === 'ETIMEDOUT') {
        throw new DshCatError('connection_timeout', `连接 Redis ${target} 超时，请检查网络、防火墙和端口。`);
      }
      this.wrap(error, `连接 Redis（${target}）`);
    }
  }

  async databaseCount() {
    const client = await this.clientFor(0);
    try {
      const reply = await client.sendCommand(['CONFIG', 'GET', 'databases']);
      if (Array.isArray(reply) && reply.length >= 2) {
        const count = Number(reply[1]);
        if (Number.isInteger(count) && count > 0) return Math.min(count, 256);
      }
    } catch {
      // CONFIG may be disabled by managed Redis; the protocol default is 16.
    }
    return 16;
  }

  async listDatabases() {
    try {
      const count = await this.databaseCount();
      const client = await this.clientFor(0);
      let keyspace = new Map();
      try {
        keyspace = parseKeyspace(await client.info('keyspace'));
      } catch {
        // INFO may be unavailable; show databases without counts.
      }
      return Array.from({ length: count }, (_, index) => {
        const keys = keyspace.get(index);
        return {
          name: `db${index}`,
          detail: keys === undefined ? 'empty' : `${keys} keys`
        };
      });
    } catch (error) {
      this.wrap(error, '读取 Redis 数据库列表');
    }
  }

  async listTables(database) {
    try {
      const client = await this.clientFor(database);
      let size = 0;
      try {
        size = await client.dbSize();
      } catch {
        // DB size is informational only.
      }
      const label = String(database || 'db0');
      return [{
        name: 'keys',
        label: 'Keys',
        type: 'keys',
        schema: label,
        detail: `${size} keys`
      }];
    } catch (error) {
      this.wrap(error, '读取 Redis Keys');
    }
  }

  async tableData(database, _table, options = {}) {
    const started = Date.now();
    try {
      const client = await this.clientFor(database);
      const page = pageNumber(options.page);
      const size = pageSize(options.pageSize);
      const offset = (page - 1) * size;
      const filters = Array.isArray(options.filters) ? options.filters : [];
      const keyFilter = filters.find(filter => filter && filter.field === 'key');
      const typeFilter = filters.find(filter => filter && filter.field === 'type');
      const keyValue = keyFilter ? String(keyFilter.value || '') : '';
      const keyOp = keyFilter?.op === 'equals' ? 'equals' : 'contains';
      const pattern = keyValue !== ''
        ? (keyOp === 'equals' ? globEscape(keyValue) : `*${globEscape(keyValue)}*`)
        : '*';
      const wantedType = typeFilter && String(typeFilter.value || '') !== ''
        ? String(typeFilter.value).toLowerCase()
        : '';
      const keys = [];
      const seen = new Set();
      let cursor = '0';
      let scanned = 0;
      let hasMore = false;
      const target = offset + size + 1;
      do {
        const reply = await client.sendCommand(['SCAN', cursor, 'MATCH', pattern, 'COUNT', '200']);
        const next = String(reply?.[0] ?? '0');
        const batch = Array.isArray(reply?.[1]) ? reply[1].map(safeText) : [];
        for (const key of batch) {
          scanned += 1;
          if (seen.has(key)) continue;
          seen.add(key);
          if (wantedType) {
            const type = safeText(await client.sendCommand(['TYPE', key]));
            if (type !== wantedType) continue;
          }
          keys.push(key);
          if (keys.length >= target) {
            hasMore = true;
            break;
          }
        }
        cursor = next;
        if (keys.length >= target || cursor === '0' || scanned >= SCAN_LIMIT) break;
      } while (true);
      const selected = keys.slice(offset, offset + size);
      const rows = [];
      for (const key of selected) {
        const type = safeText(await client.sendCommand(['TYPE', key]));
        let ttl = -1;
        try {
          ttl = Number(await client.sendCommand(['TTL', key]));
        } catch {
          ttl = -1;
        }
        let value = null;
        try {
          value = await this.readValue(client, key, type);
        } catch (error) {
          value = `[读取失败] ${error instanceof Error ? error.message : String(error)}`;
        }
        rows.push([key, type, ttl, truncateVisible(value)]);
      }
      return pageResult(
        [
          { name: 'key', type: 'string', filterable: true, ops: ['contains', 'equals'] },
          { name: 'type', type: 'string', filterable: true, ops: ['equals'] },
          { name: 'ttl', type: 'integer', filterable: false },
          { name: 'value', type: 'json', filterable: false }
        ],
        rows,
        page,
        size,
        hasMore,
        started,
        { truncatedScan: scanned >= SCAN_LIMIT }
      );
    } catch (error) {
      this.wrap(error, '读取 Redis Keys');
    }
  }

  async readValue(client, key, type) {
    if (type === 'string') return truncateVisible(await client.sendCommand(['GETRANGE', key, '0', '2000']));
    if (type === 'hash') {
      const all = await client.sendCommand(['HGETALL', key]);
      const out = {};
      if (Array.isArray(all)) {
        for (let index = 0; index < all.length && Object.keys(out).length < 20; index += 2) {
          out[safeText(all[index])] = safeText(all[index + 1]);
        }
      }
      return out;
    }
    if (type === 'list') return (await client.sendCommand(['LRANGE', key, '0', '19'])).map(safeText);
    if (type === 'set') return (await client.sendCommand(['SMEMBERS', key])).slice(0, 20).map(safeText);
    if (type === 'zset') {
      const items = await client.sendCommand(['ZRANGE', key, '0', '19', 'WITHSCORES']);
      return Array.isArray(items) ? items.map(safeText) : items;
    }
    if (type === 'stream') return formatValue(await client.sendCommand(['XRANGE', key, '-', '+', 'COUNT', '5']));
    if (type === 'none') return null;
    return `[${type} 值预览不可用]`;
  }

  async execute(database, input) {
    const started = Date.now();
    const text = cleanSql(input);
    if (!text) throw new DshCatError('empty_sql', '请先输入 Redis 命令。');
    try {
      const client = await this.clientFor(database);
      const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
      const sets = [];
      for (const [index, line] of lines.entries()) {
        let args;
        try {
          args = parseRedisCommand(line);
        } catch (error) {
          throw new DshCatError('invalid_redis_command', error instanceof Error ? error.message : 'Redis 命令解析失败。');
        }
        if (args.length === 0) continue;
        if (/^(select|use|show|describe|desc|explain)$/i.test(args[0])) {
          throw new DshCatError('redis_command_expected', 'Redis 数据源请使用 Redis 命令（例如 GET key、HGETALL hash、SCAN 0 MATCH *）。');
        }
        const result = await client.sendCommand(args);
        const normalized = formatValue(result);
        let columns;
        let rows;
        if (Array.isArray(normalized)) {
          columns = [{ name: 'value', type: 'json' }];
          rows = normalized.map(item => [item]);
        } else if (normalized && typeof normalized === 'object') {
          columns = [{ name: 'field', type: 'string' }, { name: 'value', type: 'json' }];
          rows = Object.entries(normalized).map(([field, value]) => [field, value]);
        } else {
          columns = [{ name: 'value', type: 'json' }];
          rows = [[normalized]];
        }
        sets.push({
          index,
          label: `命令 ${index + 1}`,
          command: redisCommandLine(args),
          columns,
          rows,
          rowCount: rows.length,
          message: `${rows.length} 个返回值`
        });
      }
      return { sets, durationMs: Date.now() - started };
    } catch (error) {
      this.wrap(error, '执行 Redis 命令');
    }
  }

  async scanAll(client, pattern = '*', limit = 1000) {
    const keys = [];
    const seen = new Set();
    let cursor = '0';
    do {
      const reply = await client.sendCommand(['SCAN', cursor, 'MATCH', pattern, 'COUNT', '500']);
      cursor = String(reply?.[0] ?? '0');
      for (const key of Array.isArray(reply?.[1]) ? reply[1] : []) {
        const text = safeText(key);
        if (seen.has(text)) continue;
        seen.add(text);
        keys.push(text);
        if (keys.length >= limit) return keys;
      }
    } while (cursor !== '0');
    return keys;
  }

  async exportTable(database, _table, mode) {
    try {
      const client = await this.clientFor(database);
      const keys = await this.scanAll(client, '*', EXPORT_KEY_CAP);
      const parts = [];
      if (mode === 'data') parts.push('-- DshCat Redis data export', `-- Database: ${database}`, '-- Redis command script; execute with redis-cli.', '');
      else parts.push('-- DshCat Redis structure export', `-- Database: ${database}`, '-- Redis has no tables; this lists keys and types.', '');
      for (const key of keys) {
        const type = safeText(await client.sendCommand(['TYPE', key]));
        if (mode !== 'data') {
          parts.push(`-- ${type.padEnd(10)} ${key}`);
          continue;
        }
        const commands = await this.keyCommands(client, key, type);
        parts.push(...commands);
      }
      if (keys.length >= EXPORT_KEY_CAP) parts.push(`-- Export capped at ${EXPORT_KEY_CAP} keys.`);
      parts.push('');
      return {
        filename: exportFilename('redis', String(database || 'db0'), mode === 'data' ? '' : '_structure', 'redis'),
        content: parts.join('\n'),
        mime: 'text/plain;charset=utf-8'
      };
    } catch (error) {
      this.wrap(error, '导出 Redis 数据');
    }
  }

  async keyCommands(client, key, type) {
    const ttl = Number(await client.sendCommand(['TTL', key]));
    const commands = [];
    if (type === 'string') {
      const value = await client.sendCommand(['GET', key]);
      commands.push(redisCommandLine(['SET', key, safeText(value ?? '')]));
    } else if (type === 'hash') {
      const values = await client.sendCommand(['HGETALL', key]);
      const args = ['HSET', key];
      if (Array.isArray(values)) for (const value of values) args.push(safeText(value));
      if (args.length > 2) commands.push(redisCommandLine(args));
    } else if (type === 'list') {
      const values = await client.sendCommand(['LRANGE', key, '0', '-1']);
      if (Array.isArray(values) && values.length) commands.push(redisCommandLine(['RPUSH', key, ...values.map(safeText)]));
    } else if (type === 'set') {
      const values = await client.sendCommand(['SMEMBERS', key]);
      if (Array.isArray(values) && values.length) commands.push(redisCommandLine(['SADD', key, ...values.map(safeText)]));
    } else if (type === 'zset') {
      const values = await client.sendCommand(['ZRANGE', key, '0', '-1', 'WITHSCORES']);
      if (Array.isArray(values) && values.length) {
        const args = ['ZADD', key];
        for (let index = 0; index < values.length; index += 2) {
          args.push(safeText(values[index + 1]), safeText(values[index]));
        }
        commands.push(redisCommandLine(args));
      }
    } else {
      commands.push(`# Skipped ${type} key ${key}`);
    }
    if (Number.isFinite(ttl) && ttl > 0) commands.push(redisCommandLine(['EXPIRE', key, String(ttl)]));
    return commands;
  }

  async aiSchema(database, _focusTable) {
    try {
      const client = await this.clientFor(database);
      const keys = await this.scanAll(client, '*', 50);
      const sample = [];
      for (const key of keys.slice(0, 20)) {
        const type = safeText(await client.sendCommand(['TYPE', key]));
        let value = null;
        try {
          value = truncateVisible(await this.readValue(client, key, type), 500);
        } catch {
          value = null;
        }
        sample.push({ key, type, value });
      }
      return {
        engine: 'redis',
        dialect: 'Redis commands (not SQL)',
        database: String(database || 'db0'),
        keys: sample,
        note: 'Redis has no tables. Use commands such as GET, HGETALL, SCAN, SET, HSET, DEL.'
      };
    } catch (error) {
      this.wrap(error, '读取 Redis 结构');
    }
  }

  async close() {
    await Promise.all([...this.clients.values()].map(async client => {
      try {
        await client.quit();
      } catch {
        try {
          await client.disconnect();
        } catch {
          // Already closed.
        }
      }
    }));
    this.clients.clear();
  }
}
