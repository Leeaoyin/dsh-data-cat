/** Connection URL parsing shared by every driver. */

export const KINDS = ['mysql', 'postgresql', 'redis', 'elasticsearch'];

export const KIND_LABELS = {
  mysql: 'MySQL',
  postgresql: 'PostgreSQL',
  redis: 'Redis',
  elasticsearch: 'Elasticsearch'
};

const DEFAULT_PORTS = {
  mysql: 3306,
  postgresql: 5432,
  redis: 6379,
  elasticsearch: 9200
};

const DEFAULT_SCHEMES = {
  mysql: 'mysql:',
  postgresql: 'postgresql:',
  redis: 'redis:',
  elasticsearch: 'http:'
};

const ALLOWED_SCHEMES = {
  mysql: new Set(['mysql:']),
  postgresql: new Set(['postgres:', 'postgresql:']),
  redis: new Set(['redis:', 'rediss:']),
  elasticsearch: new Set(['http:', 'https:'])
};

/** Throw a stable validation error. */
function invalid(message) {
  const error = new Error(message);
  error.code = 'invalid_url';
  throw error;
}

/** Decode one URL userinfo component without turning a malformed escape into a crash. */
function decode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * Accept a bare host (and optional path) by adding the engine's default scheme.
 * @param {string} kind engine key
 * @param {string} input user input
 * @returns {string} text containing a scheme
 */
function withScheme(kind, input) {
  const text = input.trim();
  if (text.includes('://')) return text;
  if (kind === 'elasticsearch' && text.startsWith('//')) return `http:${text}`;
  return `${DEFAULT_SCHEMES[kind]}//${text.replace(/^\/+/, '')}`;
}

/**
 * Parse and validate a data-source URL.
 * @param {string} kind one of KINDS
 * @param {string} raw user-supplied URL
 * @returns {{kind: string, url: URL, host: string, port: number, database: string, username: string, password: string, ssl: boolean | object, redisDatabase: number | null}}
 */
export function parseSourceUrl(kind, raw) {
  if (!KINDS.includes(kind)) invalid(`Unsupported database type: ${String(kind)}`);
  if (typeof raw !== 'string' || raw.trim() === '') invalid('请在“连接 URL”中填写实例地址。');
  let url;
  try {
    url = new URL(withScheme(kind, raw));
  } catch {
    invalid('连接 URL 格式无效。示例：mysql://localhost:3306 或 http://localhost:9200');
  }
  if (!ALLOWED_SCHEMES[kind].has(url.protocol)) {
    invalid(`${kind} 不支持 URL 协议 ${url.protocol}`);
  }
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (!host) invalid('连接 URL 缺少主机名。');
  const port = url.port ? Number(url.port) : DEFAULT_PORTS[kind];
  if (!Number.isInteger(port) || port <= 0 || port > 65535) invalid('连接 URL 的端口无效。');

  let database = '';
  try {
    database = decode(url.pathname.replace(/^\/+/, ''));
  } catch {
    database = url.pathname.replace(/^\/+/, '');
  }
  // Elasticsearch treats its path as an optional API prefix, never as a database.
  if (kind === 'elasticsearch') database = '';

  let redisDatabase = null;
  if (kind === 'redis') {
    const pathValue = database;
    if (pathValue !== '') {
      const index = Number(pathValue);
      if (!Number.isInteger(index) || index < 0) invalid('Redis URL 路径应为数据库编号，例如 redis://localhost:6379/0。');
      redisDatabase = index;
    }
    database = '';
  }

  const query = url.searchParams;
  const sslMode = (query.get('sslmode') || query.get('ssl') || query.get('tls') || '').toLowerCase();
  const sslRequested = url.protocol === 'rediss:'
    || url.protocol === 'https:'
    || sslMode === 'true'
    || sslMode === '1'
    || sslMode === 'require'
    || sslMode === 'required'
    || sslMode === 'verify-ca'
    || sslMode === 'verify-full';

  return {
    kind,
    url,
    host,
    port,
    database,
    username: decode(url.username || ''),
    password: decode(url.password || ''),
    ssl: sslRequested ? { rejectUnauthorized: sslMode !== 'verify-full' && sslMode !== 'verify-ca' } : false,
    redisDatabase
  };
}

/**
 * Hide credentials when a URL is shown in the UI or sent to a model.
 * @param {string} raw stored connection URL
 * @returns {string} sanitized URL
 */
export function sanitizeUrl(raw) {
  const text = String(raw);
  const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(text);
  try {
    // A bare host:port is legitimate input. Parse it under a placeholder scheme
    // so userinfo and sensitive query parameters are still stripped.
    const url = new URL(hasScheme ? text : `mysql://${text}`);
    url.username = '';
    url.password = '';
    for (const key of [...url.searchParams.keys()]) {
      if (/^(?:password|passwd|pwd|token|access[_-]?token|secret|api[_-]?key)$/i.test(key)) {
        url.searchParams.delete(key);
      }
    }
    const sanitized = url.toString();
    return hasScheme ? sanitized : sanitized.replace(/^mysql:\/\//, '');
  } catch {
    return text.replace(/\/\/[^/@\s]+@/, '//').replace(/([?&](?:password|passwd|pwd|token|secret|api[_-]?key)=)[^&]*/gi, '$1');
  }
}

/**
 * Merge URL-embedded credentials with separately supplied fields, with the
 * explicit fields taking precedence.
 * @param {{kind: string, url: string, username?: string, password?: string, database?: string}} source
 * @returns {{kind: string, url: URL, host: string, port: number, database: string, username: string, password: string, ssl: boolean | object, redisDatabase: number | null}}
 */
export function connectionInfo(source) {
  const parsed = parseSourceUrl(source.kind, source.url);
  const username = typeof source.username === 'string' && source.username !== ''
    ? source.username
    : parsed.username;
  const password = typeof source.password === 'string' && source.password !== ''
    ? source.password
    : parsed.password;
  const database = typeof source.database === 'string' && source.database !== ''
    ? source.database
    : parsed.database;
  return { ...parsed, username, password, database };
}

/** URL with a replaced database path, used for PostgreSQL and Redis child connections. */
export function urlWithDatabase(kind, raw, database) {
  const url = new URL(withScheme(kind, raw));
  if (kind === 'postgresql') {
    url.pathname = `/${encodeURIComponent(database)}`;
  } else if (kind === 'redis') {
    url.pathname = `/${String(database)}`;
  } else if (kind === 'mysql') {
    url.pathname = database ? `/${encodeURIComponent(database)}` : '/';
  }
  return url;
}

/** Build a connection test label without secrets. */
export function sourceLabel(kind, raw) {
  try {
    const parsed = parseSourceUrl(kind, raw);
    return `${parsed.host}:${parsed.port}`;
  } catch {
    return raw;
  }
}
