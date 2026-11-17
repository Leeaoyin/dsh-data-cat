/** Host JSON API exposed at POST /api/dshcat. */

import { AiService } from './ai.js';
import { ConnectionManager } from './adapters/index.js';
import { DshCatError, messageOf } from './errors.js';
import { classifyRisk, protectedDatabaseDrop } from './sql.js';
import { SourceStore } from './store.js';

const MAX_SQL_LENGTH = 200_000;
const MAX_RESULT_ROWS = 2_000;

/** Strip anything that is not a quick filter. */
function sanitizeFilters(input) {
  if (!Array.isArray(input)) return [];
  return input.slice(0, 8).flatMap(filter => {
    if (!filter || typeof filter !== 'object') return [];
    const field = typeof filter.field === 'string' ? filter.field.slice(0, 200) : '';
    const op = typeof filter.op === 'string' ? filter.op : 'contains';
    const value = filter.value === null || filter.value === undefined ? '' : String(filter.value).slice(0, 2000);
    if (!field) return [];
    return [{ field, op, value }];
  });
}

/** A JSON-safe primitive cell or key value. */
function sanitizeCellValue(value, label) {
  if (value === null) return null;
  if (typeof value === 'string') {
    if (value.length > 200_000) throw new DshCatError('invalid_cell_value', `${label}过长。`);
    return value;
  }
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'boolean') return value;
  throw new DshCatError('invalid_cell_value', `${label}必须是字符串、数字、布尔值或 NULL。`);
}

/** Validate a database name before quoting it as an identifier. */
function sanitizeDatabaseName(value) {
  const name = String(value || '').trim();
  if (!name) throw new DshCatError('invalid_database_name', '数据库名不能为空。');
  if (name.length > 63) throw new DshCatError('invalid_database_name', '数据库名不能超过 63 个字符。');
  if (/[\u0000-\u001f\u007f/\\]/.test(name) || name === '.' || name === '..') {
    throw new DshCatError('invalid_database_name', '数据库名包含不允许的字符。');
  }
  return name;
}

/** Pick only safe fields from a browser source form. */
function sanitizeSource(input) {
  if (!input || typeof input !== 'object') throw new DshCatError('invalid_source', '缺少数据源配置。');
  return {
    id: typeof input.id === 'string' ? input.id : undefined,
    kind: input.kind,
    name: typeof input.name === 'string' ? input.name : undefined,
    url: typeof input.url === 'string' ? input.url : '',
    username: typeof input.username === 'string' ? input.username : '',
    password: typeof input.password === 'string' ? input.password : '',
    database: typeof input.database === 'string' ? input.database : '',
    clearPassword: input.clearPassword === true
  };
}

/** Combine schema and relation for PostgreSQL-facing adapter methods. */
function pgTableName(kind, table, schema) {
  if (kind !== 'postgresql') return table;
  if (typeof schema === 'string' && schema !== '') return `${schema}.${table}`;
  return table;
}

export class DshCatApi {
  /**
   * @param {any} ctx Host plugin context
   * @param {{logger?: any}} [options]
   */
  constructor(ctx, options = {}) {
    this.ctx = ctx;
    this.logger = options.logger || ctx.logger;
    this.store = new SourceStore({ logger: this.logger });
    this.manager = new ConnectionManager({ logger: this.logger });
    this.ai = new AiService(ctx);
  }

  /** Load local data-source metadata before the route becomes callable. */
  async init() {
    await this.store.load();
  }

  /** Register a route result for one Fetch request. */
  async handle(request) {
    const started = Date.now();
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return this.json({ ok: false, error: { code: 'invalid_json', message: `请求体不是有效 JSON：${messageOf(error)}` } }, 400);
    }
    try {
      const value = await this.dispatch(body);
      return this.json({ ok: true, value, durationMs: Date.now() - started });
    } catch (error) {
      if (error instanceof DshCatError) {
        return this.json({ ok: false, error: { code: error.code, message: error.message, details: error.details } });
      }
      const message = messageOf(error);
      this.logger?.warn?.(`DshCat: API ${body?.action || 'unknown'} failed: ${message}`);
      return this.json({ ok: false, error: { code: 'internal_error', message } });
    }
  }

  json(payload, status = 200) {
    return new Response(JSON.stringify(payload), {
      status,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store'
      }
    });
  }

  /** Dispatch one API action. */
  async dispatch(body) {
    if (!body || typeof body !== 'object') throw new DshCatError('invalid_request', '缺少请求体。');
    const action = body.action;
    if (typeof action !== 'string') throw new DshCatError('invalid_request', '缺少 action。');
    switch (action) {
      case 'sources.list':
        return { sources: this.store.list() };
      case 'sources.save': {
        const source = await this.store.save(sanitizeSource(body.source));
        await this.manager.invalidate(source.id);
        return { source, sources: this.store.list() };
      }
      case 'sources.delete': {
        const id = String(body.id || '');
        await this.store.delete(id);
        await this.manager.invalidate(id);
        return { sources: this.store.list() };
      }
      case 'sources.test': {
        const draft = this.store.draft(sanitizeSource(body.source));
        const info = await this.manager.test(draft);
        return { info };
      }
      case 'sources.connect': {
        const source = this.store.get(String(body.id || ''));
        const adapter = this.manager.get(source);
        const info = await adapter.test();
        const databases = await adapter.listDatabases();
        return { source: this.publicSource(source.id), info, databases };
      }
      case 'databases.list': {
        const source = this.store.get(String(body.id || ''));
        const adapter = this.manager.get(source);
        return { databases: await adapter.listDatabases() };
      }
      case 'databases.create': {
        const source = this.store.get(String(body.id || ''));
        if (source.kind !== 'mysql' && source.kind !== 'postgresql') {
          throw new DshCatError('unsupported_database_management', '当前数据源不支持新建数据库。');
        }
        const name = sanitizeDatabaseName(body.name);
        const adapter = this.manager.get(source);
        return { name, database: await adapter.createDatabase(name) };
      }
      case 'databases.drop': {
        const source = this.store.get(String(body.id || ''));
        if (source.kind !== 'mysql' && source.kind !== 'postgresql') {
          throw new DshCatError('unsupported_database_management', '当前数据源不支持删除数据库。');
        }
        const name = sanitizeDatabaseName(body.name);
        const adapter = this.manager.get(source);
        return { name, database: await adapter.dropDatabase(name) };
      }
      case 'tables.list': {
        const source = this.store.get(String(body.id || ''));
        const database = String(body.database || '');
        if (!database) throw new DshCatError('invalid_database', '请选择数据库。');
        return { tables: await this.manager.get(source).listTables(database) };
      }
      case 'table.data': {
        const source = this.store.get(String(body.id || ''));
        const database = String(body.database || '');
        const table = String(body.table || '');
        if (!database) throw new DshCatError('invalid_database', '请选择数据库。');
        if (!table) throw new DshCatError('invalid_table', '请选择表。');
        const result = await this.manager.get(source).tableData(database, table, {
          schema: typeof body.schema === 'string' ? body.schema : undefined,
          page: body.page,
          pageSize: body.pageSize,
          filters: sanitizeFilters(body.filters)
        });
        return { table: { database, schema: body.schema, name: table }, ...result };
      }
      case 'table.updateCell': {
        const source = this.store.get(String(body.id || ''));
        if (source.kind !== 'mysql' && source.kind !== 'postgresql') {
          throw new DshCatError('unsupported_cell_edit', '当前数据源不支持单元格编辑。');
        }
        const database = String(body.database || '');
        const table = String(body.table || '');
        const column = String(body.column || '');
        if (!database) throw new DshCatError('invalid_database', '请选择数据库。');
        if (!table) throw new DshCatError('invalid_table', '请选择表。');
        if (!column) throw new DshCatError('invalid_column', '请选择字段。');
        if (!body.pk || typeof body.pk !== 'object' || Array.isArray(body.pk)) {
          throw new DshCatError('invalid_row_identity', '缺少行主键。');
        }
        const entries = Object.entries(body.pk);
        if (entries.length === 0 || entries.length > 16) throw new DshCatError('invalid_row_identity', '主键字段数量无效。');
        const pk = {};
        for (const [name, value] of entries) {
          if (!name) throw new DshCatError('invalid_row_identity', '主键字段名无效。');
          pk[name] = sanitizeCellValue(value, `主键字段 ${name} 的值`);
        }
        const adapter = this.manager.get(source);
        return {
          update: await adapter.updateCell(database, table, {
            schema: typeof body.schema === 'string' ? body.schema : undefined,
            column,
            value: sanitizeCellValue(body.value, '单元格值'),
            pk
          })
        };
      }
      case 'table.export': {
        const source = this.store.get(String(body.id || ''));
        const database = String(body.database || '');
        const table = String(body.table || '');
        const mode = body.mode === 'data' ? 'data' : 'structure';
        if (!database) throw new DshCatError('invalid_database', '请选择数据库。');
        if (!table) throw new DshCatError('invalid_table', '请选择表。');
        const adapter = this.manager.get(source);
        const ref = pgTableName(source.kind, table, body.schema);
        return { export: await adapter.exportTable(database, ref, mode) };
      }
      case 'sql.execute': {
        const source = this.store.get(String(body.id || ''));
        const database = String(body.database || '');
        const sql = typeof body.sql === 'string' ? body.sql.trim() : '';
        if (!sql) throw new DshCatError('empty_sql', '请先输入 SQL。');
        if (sql.length > MAX_SQL_LENGTH) throw new DshCatError('sql_too_long', 'SQL 语句过长。');
        const protectedDb = protectedDatabaseDrop(source.kind, sql);
        if (protectedDb) throw new DshCatError('protected_database', `系统数据库 ${protectedDb} 不允许删除。`);
        // Elasticsearch JSON search DSL is read-only by construction; its SQL
        // path is checked separately by the adapter.
        const risk = source.kind === 'elasticsearch' && sql.trim().startsWith('{')
          ? 'read'
          : classifyRisk(source.kind, sql);
        if (risk !== 'read' && body.confirmed !== true) {
          return { requiresConfirmation: true, risk, statement: sql };
        }
        const adapter = this.manager.get(source);
        const result = await adapter.execute(database, sql);
        const sets = (Array.isArray(result.sets) ? result.sets : []).map(set => {
          const rows = Array.isArray(set.rows) ? set.rows : [];
          if (rows.length <= MAX_RESULT_ROWS) return set;
          return { ...set, rows: rows.slice(0, MAX_RESULT_ROWS), truncated: true };
        });
        this.logger?.info?.(`DshCat: executed ${source.kind} statement for source ${source.id} (${risk})`);
        return { risk, statement: sql, ...result, sets };
      }
      case 'ai.chat': {
        const source = this.store.get(String(body.id || ''));
        const database = String(body.database || '');
        const table = typeof body.table === 'string' ? body.table : '';
        const schemaHint = typeof body.schema === 'string' ? body.schema : '';
        if (!database) throw new DshCatError('invalid_database', '请先选择数据库，再让 AI 执行查询。');
        const messages = Array.isArray(body.messages) ? body.messages.slice(-20) : [];
        if (messages.length === 0) throw new DshCatError('invalid_messages', '请输入问题。');
        const adapter = this.manager.get(source);
        const focusTable = table ? pgTableName(source.kind, table, schemaHint) : '';
        const schema = await adapter.aiSchema(database, focusTable);
        const answer = await this.ai.chat({
          source: this.publicSource(source.id),
          database,
          table: focusTable,
          messages,
          schema
        });
        return answer;
      }
      default:
        throw new DshCatError('unknown_action', `未知操作：${action}`);
    }
  }

  publicSource(id) {
    const source = this.store.list().find(entry => entry.id === id);
    if (!source) throw new DshCatError('source_not_found', '数据源不存在。');
    return source;
  }

  async dispose() {
    await this.manager.closeAll();
  }
}
