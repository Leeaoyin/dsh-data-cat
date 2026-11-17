/** SQL identifiers, literals, filtering, risk classification, and export helpers. */

/** Quote one SQL identifier for MySQL/PostgreSQL. */
export function quoteIdent(kind, value) {
  if (kind === 'mysql') return `\`${String(value).replace(/`/g, '``')}\``;
  if (kind === 'postgresql') return `"${String(value).replace(/"/g, '""')}"`;
  return String(value);
}

/** Quote a dotted identifier path. */
export function quotePath(kind, parts) {
  return parts.filter(part => part !== undefined && part !== null && part !== '').map(part => quoteIdent(kind, part)).join('.');
}

/** Quote a Redis command argument. */
export function redisArg(value) {
  if (value === null || value === undefined) return '""';
  const text = Buffer.isBuffer(value) ? value.toString('utf8') : String(value);
  if (text === '' || /[\s"'\\]/.test(text)) {
    return `"${text.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r/g, '\\r').replace(/\n/g, '\\n')}"`;
  }
  return text;
}

/** Convert a JS value into a safe display/JSON value. */
export function normalizeValue(value, seen = new WeakSet()) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : String(value);
  if (typeof value === 'bigint') return value.toString();
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
    return `0x${Buffer.from(value).toString('hex').slice(0, 4096)}${value.length > 2048 ? '…' : ''}`;
  }
  if (value instanceof RegExp) return value.toString();
  if (typeof value === 'object') {
    if (seen.has(value)) return '[Circular]';
    seen.add(value);
    if (Array.isArray(value)) return value.slice(0, 2000).map(item => normalizeValue(item, seen));
    const out = {};
    let count = 0;
    for (const key of Object.keys(value)) {
      if (count >= 200) break;
      out[key] = normalizeValue(value[key], seen);
      count += 1;
    }
    return out;
  }
  return String(value);
}

/** Escape a string for a SQL single-quoted literal. */
function sqlString(value, kind) {
  const text = String(value);
  if (kind === 'mysql') {
    return `'${text.replace(/\\/g, '\\\\').replace(/'/g, "''").replace(/\0/g, '\\0')}'`;
  }
  return `'${text.replace(/'/g, "''")}'`;
}

/** Local wall-clock text for drivers that model zone-less date/time values. */
function localDateTime(value, withMillis = true) {
  const pad = (number, width = 2) => String(number).padStart(width, '0');
  const date = `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  const time = `${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}`;
  return withMillis ? `${date} ${time}.${pad(value.getMilliseconds(), 3)}` : `${date} ${time}`;
}

/** Format a raw database value as a SQL literal. */
export function sqlLiteral(value, kind, columnType = '') {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL';
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return 'NULL';
    if (kind === 'mysql') {
      if (String(columnType || '').toLowerCase() === 'date') return sqlString(localDateTime(value, false).slice(0, 10), kind);
      return sqlString(localDateTime(value), kind);
    }
    if (kind === 'postgresql') {
      const type = String(columnType || '').toLowerCase();
      if (type === 'date') return sqlString(localDateTime(value, false).slice(0, 10), kind);
      if (type.includes('with time zone')) return sqlString(value.toISOString(), kind);
      return sqlString(localDateTime(value), kind);
    }
    return sqlString(value.toISOString(), kind);
  }
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
    const hex = Buffer.from(value).toString('hex');
    if (kind === 'mysql') return hex === '' ? "''" : `X'${hex}'`;
    return hex === '' ? "''::bytea" : `'\\x${hex}'::bytea`;
  }
  if (Array.isArray(value)) {
    if (kind === 'postgresql') {
      const entries = value.map(item => sqlLiteral(item, kind)).join(', ');
      return `ARRAY[${entries}]`;
    }
    return sqlString(JSON.stringify(value), kind);
  }
  if (typeof value === 'object') {
    const json = JSON.stringify(value);
    return sqlString(json, kind);
  }
  const text = String(value);
  if (kind === 'postgresql' && (columnType === 'json' || columnType === 'jsonb')) {
    return `${sqlString(text, kind)}::${columnType === 'json' ? 'json' : 'jsonb'}`;
  }
  return sqlString(text, kind);
}

/** Split filter values into a stable string. */
function filterValue(filter) {
  if (!filter || typeof filter !== 'object') return '';
  const value = filter.value;
  if (value === null || value === undefined) return '';
  return String(value);
}

/** Convert a user filter into a SQL predicate and values. */
export function buildSqlFilter(kind, columns, filter) {
  if (!filter || typeof filter !== 'object') return { sql: '', values: [] };
  const column = columns.find(entry => entry.name === filter.field);
  if (!column) return { sql: '', values: [] };
  const ident = quoteIdent(kind, column.name);
  const op = typeof filter.op === 'string' ? filter.op : 'contains';
  const value = filterValue(filter);
  if (op === 'isNull') return { sql: `${ident} IS NULL`, values: [] };
  if (op === 'notNull') return { sql: `${ident} IS NOT NULL`, values: [] };
  if (op === 'contains') {
    if (value === '') return { sql: '', values: [] };
    if (kind === 'postgresql') return { sql: `CAST(${ident} AS TEXT) ILIKE $1`, values: [`%${value}%`] };
    return { sql: `CAST(${ident} AS CHAR) LIKE ?`, values: [`%${value}%`] };
  }
  if (value === '') return { sql: '', values: [] };
  const operators = {
    equals: '=',
    notEquals: '<>',
    gt: '>',
    gte: '>=',
    lt: '<',
    lte: '<='
  };
  const sqlOp = operators[op];
  if (!sqlOp) return { sql: '', values: [] };
  return {
    sql: `${ident} ${sqlOp} ${kind === 'postgresql' ? '$1' : '?'}`,
    values: [value]
  };
}

/** Turn a filter list into a WHERE clause with the right placeholders. */
export function buildWhere(kind, columns, filters) {
  const filtersArray = Array.isArray(filters) ? filters.filter(Boolean) : [];
  if (filtersArray.length === 0) return { sql: '', values: [] };
  const parts = [];
  const values = [];
  for (const filter of filtersArray) {
    const built = buildSqlFilter(kind, columns, filter);
    if (!built.sql) continue;
    if (kind === 'postgresql') {
      const start = values.length;
      parts.push(built.sql.replace(/\$1/g, `$${start + 1}`));
    } else {
      parts.push(built.sql);
    }
    values.push(...built.values);
  }
  if (parts.length === 0) return { sql: '', values: [] };
  return { sql: ` WHERE ${parts.join(' AND ')}`, values };
}

/** Remove comments and string literals before keyword classification. */
export function stripSqlNoise(input) {
  let text = String(input || '');
  text = text.replace(/\/\*[\s\S]*?\*\//g, ' ');
  text = text.replace(/(^|[^-])--[^\r\n]*/g, '$1 ');
  text = text.replace(/(^|\s)#[^\r\n]*/g, '$1 ');
  text = text.replace(/'(?:''|\\'|[^'])*'/g, "''");
  text = text.replace(/"(?:""|\\"|[^"])*"/g, '""');
  text = text.replace(/`[^`]*`/g, '``');
  return text.replace(/\s+/g, ' ').trim();
}

const READ_REDIS = new Set([
  'GET', 'MGET', 'STRLEN', 'GETRANGE', 'EXISTS', 'TYPE', 'TTL', 'PTTL', 'SCAN', 'KEYS', 'RANDOMKEY',
  'HGET', 'HMGET', 'HGETALL', 'HKEYS', 'HVALS', 'HLEN', 'HEXISTS', 'HRANDFIELD',
  'LRANGE', 'LLEN', 'LINDEX', 'LPOS',
  'SMEMBERS', 'SCARD', 'SISMEMBER', 'SMISMEMBER', 'SINTER', 'SUNION', 'SDIFF', 'SRANDMEMBER',
  'ZRANGE', 'ZRANGEBYSCORE', 'ZREVRANGE', 'ZREVRANGEBYSCORE', 'ZCARD', 'ZSCORE', 'ZMSCORE', 'ZRANK', 'ZREVRANK', 'ZCOUNT',
  'XRANGE', 'XREVRANGE', 'XLEN', 'XINFO',
  'INFO', 'DBSIZE', 'PING', 'ECHO', 'TIME', 'LASTSAVE', 'MEMORY', 'OBJECT', 'BITCOUNT', 'PFCOUNT',
  'GEOHASH', 'GEOPOS', 'GEODIST', 'GEOSEARCH', 'GEORADIUS_RO', 'GEORADIUSBYMEMBER_RO',
  'COMMAND', 'CLIENT', 'SLOWLOG', 'LATENCY'
]);

const DANGER_REDIS = new Set([
  'FLUSHALL', 'FLUSHDB', 'SHUTDOWN', 'DEBUG', 'DEL', 'UNLINK', 'EVAL', 'EVALSHA', 'FCALL', 'FCALL_RO',
  'FUNCTION', 'SCRIPT', 'ACL', 'CONFIG', 'RESET', 'RESTORE', 'MIGRATE', 'SWAPDB', 'REPLICAOF', 'SLAVEOF',
  'CLUSTER', 'MODULE', 'SAVE', 'BGSAVE', 'BGREWRITEAOF', 'MONITOR'
]);

const REDIS_WRITE = new Set([
  'SET', 'SETEX', 'PSETEX', 'SETNX', 'GETSET', 'GETDEL', 'GETEX', 'APPEND', 'INCR', 'DECR', 'INCRBY', 'DECRBY',
  'INCRBYFLOAT', 'MSET', 'MSETNX', 'HSET', 'HSETNX', 'HMSET', 'HDEL', 'HINCRBY', 'HINCRBYFLOAT',
  'LPUSH', 'RPUSH', 'LPUSHX', 'RPUSHX', 'LPOP', 'RPOP', 'LSET', 'LTRIM', 'LREM', 'LINSERT', 'RPOPLPUSH', 'LMOVE',
  'SADD', 'SREM', 'SPOP', 'SMOVE', 'SINTERSTORE', 'SUNIONSTORE', 'SDIFFSTORE',
  'ZADD', 'ZINCRBY', 'ZREM', 'ZREMRANGEBYRANK', 'ZREMRANGEBYSCORE', 'ZREMRANGEBYLEX', 'ZPOPMIN', 'ZPOPMAX',
  'ZUNIONSTORE', 'ZINTERSTORE', 'ZDIFFSTORE', 'XADD', 'XDEL', 'XTRIM', 'XGROUP', 'XACK', 'XCLAIM', 'XSETID',
  'PFADD', 'PFMERGE', 'GEOADD', 'EXPIRE', 'PEXPIRE', 'EXPIREAT', 'PEXPIREAT', 'PERSIST', 'RENAME', 'RENAMENX',
  'MOVE', 'COPY', 'DUMP', 'SORT', 'BITOP', 'BITFIELD', 'PUBLISH', 'SPUBLISH', 'SETBIT'
]);

const MYSQL_SYSTEM_DATABASES = new Set(['mysql', 'information_schema', 'performance_schema', 'sys']);
const PG_SYSTEM_DATABASES = new Set(['postgres', 'template0', 'template1']);

/** Return the protected database name when a statement drops a system DB. */
export function protectedDatabaseDrop(kind, statement) {
  const protectedNames = kind === 'mysql' ? MYSQL_SYSTEM_DATABASES : kind === 'postgresql' ? PG_SYSTEM_DATABASES : null;
  if (!protectedNames) return null;
  const text = String(statement || '');
  let sanitized = '';
  const blank = value => ' '.repeat(value.length);
  for (let index = 0; index < text.length;) {
    const char = text[index];
    if (char === "'") {
      let end = index + 1;
      while (end < text.length) {
        if (text[end] === "'") {
          if (text[end + 1] === "'") {
            end += 2;
            continue;
          }
          end++;
          break;
        }
        end += text[end] === '\\' ? 2 : 1;
      }
      sanitized += blank(text.slice(index, end));
      index = end;
      continue;
    }
    if (kind === 'mysql' && char === '"') {
      let end = index + 1;
      while (end < text.length) {
        if (text[end] === '"') {
          if (text[end + 1] === '"') {
            end += 2;
            continue;
          }
          end++;
          break;
        }
        end += text[end] === '\\' ? 2 : 1;
      }
      sanitized += blank(text.slice(index, end));
      index = end;
      continue;
    }
    if (char === '-' && text[index + 1] === '-') {
      let end = text.indexOf('\n', index + 2);
      if (end < 0) end = text.length;
      sanitized += blank(text.slice(index, end));
      index = end;
      continue;
    }
    if (kind === 'mysql' && char === '#') {
      let end = text.indexOf('\n', index + 1);
      if (end < 0) end = text.length;
      sanitized += blank(text.slice(index, end));
      index = end;
      continue;
    }
    if (char === '/' && text[index + 1] === '*') {
      const close = text.indexOf('*/', index + 2);
      const end = close < 0 ? text.length : close + 2;
      sanitized += blank(text.slice(index, end));
      index = end;
      continue;
    }
    sanitized += char;
    index++;
  }
  const pattern = /\bDROP\s+DATABASE\s+(?:IF\s+EXISTS\s+)?(?:`([^`]+)`|"([^"]+)"|([A-Za-z0-9_$]+))/gi;
  let match;
  while ((match = pattern.exec(sanitized)) !== null) {
    const name = match[1] || match[2] || match[3] || '';
    if (protectedNames.has(name.toLowerCase())) return name;
  }
  return null;
}

/**
 * Classify a statement's risk. Reads may run directly; every write requires a
 * confirmation; danger marks destructive or hard-to-reverse operations.
 * @param {string} kind database kind
 * @param {string} statement SQL text or one Redis command
 * @returns {'read'|'write'|'danger'}
 */
export function classifyRisk(kind, statement) {
  const text = String(statement || '').trim();
  if (!text) return 'read';
  if (kind === 'redis') {
    // Redis has no statement terminator. Classify every non-empty line and
    // keep the highest risk so a read cannot mask a following write.
    let highest = 'read';
    for (const line of text.split(/\r?\n/).map(part => part.trim()).filter(Boolean)) {
      let args;
      try {
        args = parseRedisCommand(line);
      } catch {
        return 'danger';
      }
      const first = args[0]?.toUpperCase() || '';
      if (DANGER_REDIS.has(first)) return 'danger';
      if (first === 'CLIENT' || first === 'SLOWLOG') {
        const sub = args[1]?.toUpperCase() || '';
        if (['LIST', 'INFO', 'ID', 'GETNAME'].includes(sub)) continue;
        return 'danger';
      }
      if (first === 'CONFIG') {
        const sub = args[1]?.toUpperCase() || '';
        if (sub === 'GET') continue;
        return 'danger';
      }
      if (READ_REDIS.has(first)) continue;
      if (REDIS_WRITE.has(first)) {
        if (first === 'DEL' || first === 'UNLINK') return 'danger';
        highest = 'write';
        continue;
      }
      return 'danger';
    }
    return highest;
  }

  const clean = stripSqlNoise(text);
  const lower = clean.toLowerCase();
  const statements = clean.split(';').map(part => part.trim()).filter(Boolean);
  let highest = 'read';
  for (const single of statements) {
    const lowerSingle = single.toLowerCase();
    const danger = /\b(drop|truncate|alter|grant|revoke|shutdown|kill|flushall|flushdb|reset)\b/.test(lowerSingle)
      || /\bcreate\s+(user|role|database|schema|extension)\b/.test(lowerSingle)
      || /\bselect\b[\s\S]*\binto\s+(outfile|dumpfile)\b/.test(lowerSingle)
      || /\bcopy\b[\s\S]*\bto\b/.test(lowerSingle)
      || /\bdelete\s+from\b[\s\S]*?(?:;|$)/.test(lowerSingle) && !/\bwhere\b/.test(lowerSingle)
      || /\bupdate\s+\S+[\s\S]*?\bset\b[\s\S]*?(?:;|$)/.test(lowerSingle) && !/\bwhere\b/.test(lowerSingle);
    if (danger) return 'danger';
    if (/\b(insert|update|delete|create|replace|merge|rename|call|do|copy|vacuum|analyze|set|use|lock|unlock|comment|refresh|reindex|flush|load|import|backup|restore)\b/.test(lowerSingle)) {
      highest = 'write';
    }
    if (!/^(select|with|show|describe|desc|explain|values|table|pragma)\b/.test(lowerSingle)) {
      // Unknown leading statements in a SQL playground are safer treated as writes.
      if (highest === 'read') highest = 'write';
    }
  }
  // A SELECT statement can still contain a mutating CTE.
  if (/\b(with|select)\b[\s\S]*\b(insert|update|delete|merge)\b/.test(lower)) highest = 'write';
  return highest;
}

/**
 * Split a Redis command line into arguments. Supports single/double quotes and
 * backslash escapes; this is a parser for convenience, not a shell.
 * @param {string} input
 * @returns {string[]}
 */
export function parseRedisCommand(input) {
  const text = String(input || '').trim();
  const args = [];
  let current = '';
  let quote = '';
  let escaping = false;
  let started = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (escaping) {
      const escapes = { n: '\n', r: '\r', t: '\t', '\\': '\\', '"': '"', "'": "'", '0': '\0' };
      current += escapes[char] ?? char;
      escaping = false;
      started = true;
      continue;
    }
    if (char === '\\' && (quote === '"' || quote === "'" || !quote)) {
      escaping = true;
      started = true;
      continue;
    }
    if (quote) {
      if (char === quote) quote = '';
      else current += char;
      started = true;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      started = true;
      continue;
    }
    if (/\s/.test(char)) {
      if (started) {
        args.push(current);
        current = '';
        started = false;
      }
      continue;
    }
    current += char;
    started = true;
  }
  if (quote) throw new Error('Redis 命令存在未闭合的引号。');
  if (started) args.push(current);
  return args;
}

/** Render a whole Redis command as one SQL-style comment/section. */
export function redisCommandLine(args) {
  return args.map(redisArg).join(' ');
}

/** Make a filesystem-safe export filename. */
export function exportFilename(database, table, suffix, extension = 'sql') {
  const clean = value => String(value || 'export').replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 80) || 'export';
  return `${clean(database)}__${clean(table)}${suffix}.${extension}`;
}

/** Format a batch of rows as INSERT statements (SQL engines only). */
export function insertStatements(kind, target, columns, rows, chunkSize = 100) {
  if (!Array.isArray(rows) || rows.length === 0) return '';
  const columnList = columns.map(column => quoteIdent(kind, column.name)).join(', ');
  const qualified = quotePath(kind, target);
  const chunks = [];
  for (let offset = 0; offset < rows.length; offset += chunkSize) {
    const slice = rows.slice(offset, offset + chunkSize);
    const values = slice.map(row => {
      const values = columns.map((column, index) => sqlLiteral(row[index], kind, column.type));
      return `(${values.join(', ')})`;
    }).join(',\n  ');
    chunks.push(`INSERT INTO ${qualified} (${columnList}) VALUES\n  ${values};`);
  }
  return chunks.join('\n\n');
}
