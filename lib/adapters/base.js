/** Adapter contract and small lifecycle helpers. */

/** Flatten driver errors, including AggregateError from dual-stack hosts. */
function describeError(error, depth = 0) {
  if (error === null || error === undefined) return '';
  if (typeof error === 'string') return error;
  if (typeof error !== 'object') return String(error);
  const parts = [];
  if (typeof error.message === 'string' && error.message) parts.push(error.message);
  if (depth < 3 && Array.isArray(error.errors)) {
    for (const nested of error.errors.slice(0, 4)) {
      const text = describeError(nested, depth + 1);
      if (text) parts.push(text);
    }
  }
  if (depth < 3 && error.cause) {
    const text = describeError(error.cause, depth + 1);
    if (text) parts.push(text);
  }
  if (parts.length === 0 && error.code) parts.push(String(error.code));
  if (parts.length === 0 && error.name && error.name !== 'Error') parts.push(String(error.name));
  return [...new Set(parts)].join(' · ');
}

export class BaseAdapter {
  /**
   * @param {any} source full source record
   * @param {{connection: any, logger?: any}} options
   */
  constructor(source, options = {}) {
    this.source = source;
    this.connection = options.connection || {};
    this.logger = options.logger;
  }

  /** Validate the connection and return a short summary. */
  async test() {
    throw new Error('not implemented');
  }

  /** @returns {Promise<Array<{name: string, detail?: string}>>} */
  async listDatabases() {
    throw new Error('not implemented');
  }

  /** @returns {Promise<Array<{name: string, label: string, type: string, schema?: string, detail?: string}>>} */
  async listTables(_database) {
    throw new Error('not implemented');
  }

  /** @returns {Promise<any>} */
  async tableData(_database, _table, _options) {
    throw new Error('not implemented');
  }

  /** @returns {Promise<any>} */
  async execute(_database, _sql) {
    throw new Error('not implemented');
  }

  /** Edit one cell identified by its primary-key values. */
  async updateCell(_database, _table, _options) {
    throw new Error('Cell editing is not supported for this data source');
  }

  /** Create an empty database/schema on the connected instance. */
  async createDatabase(_name) {
    throw new Error('Creating databases is not supported for this data source');
  }

  /** Drop a database/schema on the connected instance. */
  async dropDatabase(_name) {
    throw new Error('Dropping databases is not supported for this data source');
  }

  /** @returns {Promise<{filename: string, content: string, mime: string}>} */
  async exportTable(_database, _table, _mode) {
    throw new Error('not implemented');
  }

  /** @returns {Promise<any>} */
  async aiSchema(_database, _focusTable) {
    throw new Error('not implemented');
  }

  /** Close cached clients and pools. */
  async close() {}

  /** Human-readable error context. */
  wrap(error, action) {
    if (error && error.code && typeof error.message === 'string' && error.name === 'DshCatError') throw error;
    const message = describeError(error) || '未知错误';
    const wrapped = new Error(`${action}失败：${message}`);
    wrapped.code = error?.code || 'database_error';
    wrapped.cause = error;
    throw wrapped;
  }
}
