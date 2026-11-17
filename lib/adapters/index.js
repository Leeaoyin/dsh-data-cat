/** Adapter selection and connection lifecycle. */

import { MySqlAdapter } from './mysql.js';
import { PostgresAdapter } from './postgresql.js';
import { RedisAdapter } from './redis.js';
import { ElasticsearchAdapter } from './elasticsearch.js';
import { DshCatError } from '../errors.js';

const FACTORIES = {
  mysql: MySqlAdapter,
  postgresql: PostgresAdapter,
  redis: RedisAdapter,
  elasticsearch: ElasticsearchAdapter
};

export class ConnectionManager {
  /** @param {{logger?: any}} [options] */
  constructor(options = {}) {
    this.logger = options.logger;
    /** @type {Map<string, {adapter: any, updatedAt: string}>} */
    this.adapters = new Map();
  }

  /** Create one adapter for a source record. */
  create(source) {
    const Factory = FACTORIES[source?.kind];
    if (!Factory) throw new DshCatError('unsupported_source', `不支持的数据源类型：${String(source?.kind)}`);
    return new Factory(source, { logger: this.logger });
  }

  /** Return a cached adapter, reusing pools/clients across requests. */
  get(source) {
    const cached = this.adapters.get(source.id);
    if (cached && cached.updatedAt === source.updatedAt) return cached.adapter;
    if (cached) {
      this.adapters.delete(source.id);
      void cached.adapter.close();
    }
    const adapter = this.create(source);
    this.adapters.set(source.id, { adapter, updatedAt: source.updatedAt });
    return adapter;
  }

  /** Test a draft without retaining its connection. */
  async test(draft) {
    const adapter = this.create({ ...draft, id: draft.id || 'draft', updatedAt: draft.updatedAt || 'draft' });
    try {
      return await adapter.test();
    } finally {
      await adapter.close();
    }
  }

  /** Close and forget the adapter for one source. */
  async invalidate(id) {
    const cached = this.adapters.get(id);
    if (!cached) return;
    this.adapters.delete(id);
    await cached.adapter.close();
  }

  /** Close every adapter on plugin unload. */
  async closeAll() {
    const adapters = [...this.adapters.values()].map(entry => entry.adapter);
    this.adapters.clear();
    await Promise.all(adapters.map(adapter => adapter.close().catch(() => undefined)));
  }
}
