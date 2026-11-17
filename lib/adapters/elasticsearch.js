/** Elasticsearch adapter using the official client. */

import { Client } from '@elastic/elasticsearch';
import { BaseAdapter } from './base.js';
import { connectionInfo } from '../url.js';
import { DshCatError } from '../errors.js';
import { cleanSql, pageNumber, pageSize, pageResult, toCount } from './common.js';
import { exportFilename, normalizeValue } from '../sql.js';

const EXPORT_ROW_CAP = 10_000;

/** Read a dotted path from a document. */
function getPath(value, path) {
  let current = value;
  for (const part of path.split('.')) {
    if (current === null || current === undefined) return null;
    current = current[part];
  }
  return current;
}

/** Flatten mapping properties to dotted leaf fields. */
function flattenProperties(properties, prefix = '', depth = 0) {
  const out = [];
  if (!properties || depth > 4) return out;
  for (const [name, definition] of Object.entries(properties)) {
    const path = prefix ? `${prefix}.${name}` : name;
    if (definition && typeof definition === 'object' && definition.properties) {
      out.push(...flattenProperties(definition.properties, path, depth + 1));
    } else {
      out.push({ name: path, type: String(definition?.type || 'object') });
    }
  }
  return out;
}

/** Turn an Elasticsearch failure into a readable message. */
function esMessage(error) {
  const meta = error?.meta;
  const body = meta?.body;
  const reason = body?.error?.root_cause?.[0]?.reason || body?.error?.reason || body?.error?.type;
  if (reason) return `${reason}${meta?.statusCode ? ` (HTTP ${meta.statusCode})` : ''}`;
  return error instanceof Error ? error.message : String(error);
}

/** Pick a filter value for range/term queries. */
function typedValue(value, type) {
  if (type === 'long' || type === 'integer' || type === 'short' || type === 'byte' || type === 'double' || type === 'float' || type === 'half_float' || type === 'scaled_float') {
    const number = Number(value);
    return Number.isFinite(number) ? number : value;
  }
  return value;
}

/** Build one filter clause from a quick filter. */
function clauseFor(column, filter) {
  if (!filter || typeof filter !== 'object') return null;
  const field = column.name;
  const op = filter.op || 'contains';
  if (op === 'isNull') return { bool: { must_not: [{ exists: { field } }] } };
  if (op === 'notNull') return { exists: { field } };
  if (valueMissing(filter.value)) return null;
  const value = String(filter.value);
  if (field === '_id') {
    return { ids: { values: [value] } };
  }
  const isText = column.type === 'text';
  const isKeyword = column.type === 'keyword' || column.type === 'constant_keyword' || column.type === 'wildcard';
  if (op === 'contains') {
    if (isKeyword) return { wildcard: { [field]: { value: `*${value.replace(/[*?]/g, '\\$&')}*`, case_insensitive: true } } };
    if (isText) return { match_phrase: { [field]: value } };
    return { term: { [field]: typedValue(value, column.type) } };
  }
  if (op === 'equals') {
    return isText ? { match_phrase: { [field]: value } } : { term: { [field]: typedValue(value, column.type) } };
  }
  if (op === 'notEquals') {
    return { bool: { must_not: [isText ? { match_phrase: { [field]: value } } : { term: { [field]: typedValue(value, column.type) } }] } };
  }
  const ranges = { gt: 'gt', gte: 'gte', lt: 'lt', lte: 'lte' };
  if (ranges[op]) return { range: { [field]: { [ranges[op]]: typedValue(value, column.type) } } };
  return null;
}

function valueMissing(value) {
  return value === null || value === undefined || String(value) === '';
}

export class ElasticsearchAdapter extends BaseAdapter {
  constructor(source, options) {
    super(source, options);
    this.info = connectionInfo(source);
    const node = new URL(this.info.url.toString());
    node.username = '';
    node.password = '';
    node.search = '';
    const config = {
      node: node.toString(),
      requestTimeout: 15_000,
      maxRetries: 1,
      sniffOnStart: false
    };
    if (this.info.username || this.info.password) {
      config.auth = { username: this.info.username, password: this.info.password };
    }
    if (node.protocol === 'https:') {
      config.tls = { rejectUnauthorized: this.info.ssl?.rejectUnauthorized !== false };
    }
    this.client = new Client(config);
  }

  async test() {
    const started = Date.now();
    try {
      const info = await this.client.info();
      return {
        ok: true,
        latencyMs: Date.now() - started,
        version: `Elasticsearch ${info?.version?.number || ''}`.trim(),
        label: `${this.info.host}:${this.info.port}`
      };
    } catch (error) {
      throw new DshCatError('database_error', `连接 Elasticsearch 失败：${esMessage(error)}`);
    }
  }

  async listDatabases() {
    try {
      const result = await this.client.cat.indices({
        format: 'json',
        expand_wildcards: 'open',
        h: 'index,docs.count,store.size,status'
      });
      const rows = Array.isArray(result) ? result : [];
      return rows
        .map(row => {
          const name = String(row.index || '');
          const pieces = [];
          if (row.status) pieces.push(String(row.status));
          if (row['docs.count'] !== undefined) pieces.push(`${row['docs.count']} docs`);
          if (row['store.size']) pieces.push(String(row['store.size']));
          return { name, detail: pieces.join(' · ') || undefined };
        })
        .filter(row => row.name !== '')
        .sort((a, b) => {
          const hiddenA = a.name.startsWith('.') ? 1 : 0;
          const hiddenB = b.name.startsWith('.') ? 1 : 0;
          return hiddenA - hiddenB || a.name.localeCompare(b.name);
        });
    } catch (error) {
      throw new DshCatError('database_error', `读取 Elasticsearch 索引失败：${esMessage(error)}`);
    }
  }

  async fieldsFor(index) {
    try {
      const mapping = await this.client.indices.getMapping({ index });
      const entry = mapping?.[index] || Object.values(mapping || {})[0];
      const properties = entry?.mappings?.properties || {};
      return flattenProperties(properties);
    } catch (error) {
      throw new DshCatError('database_error', `读取 Elasticsearch 映射失败：${esMessage(error)}`);
    }
  }

  async listTables(database) {
    try {
      const fields = await this.fieldsFor(database);
      let count = 0;
      try {
        count = toCount((await this.client.count({ index: database })).count);
      } catch {
        // count is informational only.
      }
      return [{
        name: '_docs',
        label: 'Documents',
        type: 'documents',
        schema: database,
        detail: `${count} docs · ${fields.length} fields`
      }];
    } catch (error) {
      if (error instanceof DshCatError) throw error;
      throw new DshCatError('database_error', `读取 Elasticsearch 文档信息失败：${esMessage(error)}`);
    }
  }

  async columns(database) {
    const fields = await this.fieldsFor(database);
    return [{ name: '_id', type: 'keyword' }, ...fields];
  }

  async tableData(database, _table, options = {}) {
    const started = Date.now();
    try {
      const columns = await this.columns(database);
      const page = pageNumber(options.page);
      const size = pageSize(options.pageSize);
      const filters = Array.isArray(options.filters) ? options.filters : [];
      const clauses = [];
      for (const filter of filters) {
        const column = columns.find(entry => entry.name === filter?.field);
        if (!column) continue;
        const clause = clauseFor(column, filter);
        if (clause) clauses.push(clause);
      }
      const query = clauses.length > 0 ? { bool: { filter: clauses } } : { match_all: {} };
      const result = await this.client.search({
        index: database,
        from: (page - 1) * size,
        size: size + 1,
        query,
        sort: ['_doc'],
        track_total_hits: true
      });
      const hits = result.hits?.hits || [];
      const hasMore = hits.length > size || toCount(result.hits?.total?.value) > page * size;
      const selected = hits.slice(0, size);
      const rows = selected.map(hit => [
        hit._id,
        ...columns.filter(column => column.name !== '_id').map(column => normalizeValue(getPath(hit._source, column.name)))
      ]);
      return pageResult(
        columns.map(column => ({ ...column })),
        rows,
        page,
        size,
        hasMore,
        started,
        { total: toCount(result.hits?.total?.value) }
      );
    } catch (error) {
      throw new DshCatError('database_error', `读取 Elasticsearch 文档失败：${esMessage(error)}`);
    }
  }

  async execute(database, input) {
    const started = Date.now();
    const text = cleanSql(input);
    if (!text) throw new DshCatError('empty_sql', '请先输入 Elasticsearch SQL 或 JSON 查询。');
    try {
      if (text.startsWith('{')) {
        let body;
        try {
          body = JSON.parse(text);
        } catch (error) {
          throw new DshCatError('invalid_query', `Elasticsearch JSON 查询解析失败：${error instanceof Error ? error.message : String(error)}`);
        }
        const result = await this.client.search({ index: database, ...body });
        const hits = result.hits?.hits || [];
        const sourceKeys = new Set(['_id']);
        for (const hit of hits) {
          for (const key of Object.keys(hit._source || {})) sourceKeys.add(key);
        }
        const keys = [...sourceKeys];
        return {
          sets: [{
            index: 0,
            label: 'JSON 查询',
            columns: keys.map(key => ({ name: key, type: key === '_id' ? 'keyword' : 'value' })),
            rows: hits.map(hit => keys.map(key => key === '_id' ? hit._id : normalizeValue(hit._source?.[key]))),
            rowCount: hits.length,
            message: `${hits.length} 条文档`
          }],
          durationMs: Date.now() - started
        };
      }
      if (!/^\s*(select|show|describe|with|explain)\b/i.test(text)) {
        throw new DshCatError('read_only_engine', 'Elasticsearch 数据源只支持只读 SQL（SELECT/WITH/SHOW）或 JSON 查询 DSL。');
      }
      let result;
      try {
        result = await this.client.sql.query({ query: text, format: 'json' });
      } catch (error) {
        throw new DshCatError('database_error', `Elasticsearch SQL 执行失败：${esMessage(error)}。请在 Kibana/Elasticsearch 中启用 SQL 功能，或改用 JSON 查询 DSL。`);
      }
      const columns = (result.columns || []).map(column => ({
        name: String(column.name),
        type: String(column.type || 'value')
      }));
      const rows = (result.rows || []).map(row => row.map(value => normalizeValue(value)));
      return {
        sets: [{
          index: 0,
          label: 'SQL 结果',
          columns,
          rows,
          rowCount: rows.length,
          message: `${rows.length} 行`
        }],
        durationMs: Date.now() - started
      };
    } catch (error) {
      if (error instanceof DshCatError) throw error;
      throw new DshCatError('database_error', `执行 Elasticsearch 查询失败：${esMessage(error)}`);
    }
  }

  async exportTable(database, _table, mode) {
    try {
      const mapping = await this.client.indices.getMapping({ index: database });
      const entry = mapping?.[database] || Object.values(mapping || {})[0];
      const settingsResult = await this.client.indices.getSettings({ index: database });
      const settingsEntry = settingsResult?.[database] || Object.values(settingsResult || {})[0];
      const indexSettings = settingsEntry?.settings?.index || {};
      const structure = {
        settings: {
          number_of_shards: indexSettings.number_of_shards,
          number_of_replicas: indexSettings.number_of_replicas
        },
        mappings: entry?.mappings || {}
      };
      if (mode !== 'data') {
        return {
          filename: exportFilename(database, 'structure', '', 'es.json'),
          content: `PUT /${encodeURIComponent(database)}\n${JSON.stringify(structure, null, 2)}\n`,
          mime: 'application/json;charset=utf-8'
        };
      }
      const lines = [];
      let scrollId;
      let response;
      let fetched = 0;
      try {
        response = await this.client.search({
          index: database,
          scroll: '1m',
          size: 1000,
          query: { match_all: {} }
        });
        scrollId = response._scroll_id;
        while (response?.hits?.hits?.length > 0 && fetched < EXPORT_ROW_CAP) {
          for (const hit of response.hits.hits) {
            lines.push(JSON.stringify({ index: { _index: database, _id: hit._id } }));
            lines.push(JSON.stringify(hit._source || {}));
            fetched += 1;
            if (fetched >= EXPORT_ROW_CAP) break;
          }
          if (fetched >= EXPORT_ROW_CAP) break;
          response = await this.client.scroll({ scroll_id: scrollId, scroll: '1m' });
          scrollId = response._scroll_id || scrollId;
        }
      } finally {
        if (scrollId) {
          try {
            await this.client.clearScroll({ scroll_id: [scrollId] });
          } catch {
            // Scroll cleanup is best-effort.
          }
        }
      }
      return {
        filename: exportFilename(database, 'documents', '', 'es.ndjson'),
        content: `${lines.join('\n')}${lines.length ? '\n' : ''}`,
        mime: 'application/x-ndjson;charset=utf-8'
      };
    } catch (error) {
      throw new DshCatError('database_error', `导出 Elasticsearch 索引失败：${esMessage(error)}`);
    }
  }

  async aiSchema(database, _focusTable) {
    try {
      const columns = await this.columns(database);
      let sample = [];
      try {
        const result = await this.client.search({ index: database, size: 3, query: { match_all: {} } });
        sample = (result.hits?.hits || []).map(hit => ({ _id: hit._id, ...hit._source }));
      } catch {
        sample = [];
      }
      return {
        engine: 'elasticsearch',
        dialect: 'Elasticsearch SQL (read-only)',
        database,
        index: database,
        fields: columns.map(column => `${column.name} ${column.type}`),
        sample: sample.map(row => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, normalizeValue(value)]))),
        note: 'Use SELECT statements against this index (for example SELECT * FROM "index" LIMIT 10).'
      };
    } catch (error) {
      if (error instanceof DshCatError) throw error;
      throw new DshCatError('database_error', `读取 Elasticsearch 结构失败：${esMessage(error)}`);
    }
  }

  async close() {
    try {
      await this.client.close();
    } catch {
      // Closing an idle client is best-effort.
    }
  }
}
