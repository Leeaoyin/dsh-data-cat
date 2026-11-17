/** PostgreSQL adapter using pg. */

import pg from 'pg';
import { BaseAdapter } from './base.js';
import { connectionInfo } from '../url.js';
import { DshCatError } from '../errors.js';
import {
  cleanSql, pageNumber, pageSize, pageResult, parsePgTable
} from './common.js';
import {
  buildWhere, exportFilename, insertStatements, normalizeValue, quotePath
} from '../sql.js';

const { Pool } = pg;
const EXPORT_ROW_CAP = 50_000;
const PG_SYSTEM_DATABASES = new Set(['postgres', 'template0', 'template1']);

/** Build a profile-safe version label. */
function versionOf(result) {
  const row = result?.rows?.[0];
  return row ? String(row.version ?? '') : '';
}

/** Classify a PostgreSQL column just enough to choose the editor and conversion. */
function pgCellKind(column) {
  const type = String(column?.type || '').toLowerCase();
  if (/\[\]$/.test(type)) return 'array';
  if (/\bjsonb?\b/.test(type)) return 'json';
  if (/\b(bytea|bit)\b/.test(type)) return 'binary';
  if (/^(bool|boolean)$/.test(type)) return 'boolean';
  if (/^(smallint|integer|bigint|decimal|numeric|real|double precision|money|serial|bigserial|smallserial)$/.test(type)) return 'number';
  if (/\b(timestamp|date|time)\b/.test(type)) return 'date';
  return 'text';
}

/** Convert a browser cell value into the parameter type node-postgres should send. */
function coercePgCell(value, column, kind) {
  if (value === null) {
    if (!column.nullable) throw new DshCatError('invalid_cell_value', '该字段不允许为 NULL。');
    return null;
  }
  const text = typeof value === 'string' ? value : String(value);
  if (kind === 'binary') throw new DshCatError('unsupported_cell_edit', '二进制字段不支持编辑。');
  if (kind === 'boolean') {
    const normalized = text.trim().toLowerCase();
    if (['true', '1'].includes(normalized)) return true;
    if (['false', '0'].includes(normalized)) return false;
    throw new DshCatError('invalid_cell_value', '布尔字段只接受 true 或 false。');
  }
  if (kind === 'array') {
    if (text.trim() === '') throw new DshCatError('invalid_cell_value', '数组字段不能为空；如需空值请选择 NULL。');
    try {
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) throw new Error('not an array');
      return parsed;
    } catch {
      throw new DshCatError('invalid_cell_value', '数组字段请输入 JSON 数组，例如 [1, 2]。');
    }
  }
  if (kind === 'number') {
    if (text.trim() === '') throw new DshCatError('invalid_cell_value', '数字字段不能为空；如需空值请选择 NULL。');
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  if (kind === 'date' && /^\d{4}-\d{2}-\d{2}T/i.test(text.trim())) {
    const type = String(column.type || '').toLowerCase();
    const parsed = new Date(text.trim());
    if (!Number.isNaN(parsed.getTime())) {
      if (type === 'date') {
        const pad = number => String(number).padStart(2, '0');
        return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`;
      }
      if (!type.includes('with time zone')) {
        const pad = (number, width = 2) => String(number).padStart(width, '0');
        const date = `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`;
        const time = `${pad(parsed.getHours())}:${pad(parsed.getMinutes())}:${pad(parsed.getSeconds())}.${pad(parsed.getMilliseconds(), 3)}`;
        return `${date} ${time}`;
      }
    }
  }
  return text;
}

export class PostgresAdapter extends BaseAdapter {
  constructor(source, options) {
    super(source, options);
    this.info = connectionInfo(source);
    this.pools = new Map();
  }

  initialDatabase() {
    return this.info.database || 'postgres';
  }

  poolFor(database) {
    const name = database || this.initialDatabase();
    const cached = this.pools.get(name);
    if (cached) return cached;
    const config = {
      host: this.info.host,
      port: this.info.port,
      user: this.info.username || undefined,
      password: this.info.password || undefined,
      database: name,
      max: 4,
      connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 60_000,
      application_name: 'DshCat'
    };
    if (this.info.ssl && typeof this.info.ssl === 'object') config.ssl = this.info.ssl;
    const pool = new Pool(config);
    pool.on('error', error => this.logger?.warn?.('DshCat PostgreSQL idle client error', error?.message || error));
    this.pools.set(name, pool);
    return pool;
  }

  async test() {
    const started = Date.now();
    try {
      const result = await this.poolFor(this.initialDatabase()).query('SELECT version() AS version');
      return {
        ok: true,
        latencyMs: Date.now() - started,
        version: versionOf(result),
        label: `${this.info.host}:${this.info.port}`
      };
    } catch (error) {
      this.wrap(error, '连接 PostgreSQL');
    }
  }

  async listDatabases() {
    try {
      const result = await this.poolFor(this.initialDatabase()).query(
        `SELECT datname AS name
         FROM pg_database
         WHERE datistemplate = false
         ORDER BY datname`
      );
      return result.rows.map(row => ({ name: String(row.name) }));
    } catch (error) {
      this.wrap(error, '读取 PostgreSQL 数据库列表');
    }
  }

  async listTables(database) {
    try {
      const result = await this.poolFor(database).query(
        `SELECT n.nspname AS schema, c.relname AS name, c.relkind AS kind
         FROM pg_class c
         JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE c.relkind IN ('r', 'p', 'v', 'm', 'f')
           AND n.nspname NOT IN ('pg_catalog', 'information_schema')
           AND n.nspname NOT LIKE 'pg_toast%'
           AND n.nspname NOT LIKE 'pg_temp_%'
         ORDER BY n.nspname, c.relname`
      );
      return result.rows.map(row => {
        const kind = String(row.kind);
        const type = kind === 'v' ? 'view' : kind === 'm' ? 'materialized view' : 'table';
        const schema = String(row.schema);
        const name = String(row.name);
        return {
          name,
          label: name,
          schema,
          type,
          detail: schema
        };
      });
    } catch (error) {
      this.wrap(error, '读取 PostgreSQL 表列表');
    }
  }

  async columns(database, schema, table) {
    const pool = this.poolFor(database);
    const result = await pool.query(
      `SELECT a.attname AS name,
              format_type(a.atttypid, a.atttypmod) AS type,
              NOT a.attnotnull AS nullable,
              pg_get_expr(ad.adbin, ad.adrelid) AS default_value,
              a.attidentity AS identity,
              a.attgenerated AS generated
       FROM pg_attribute a
       JOIN pg_class c ON c.oid = a.attrelid
       JOIN pg_namespace n ON n.oid = c.relnamespace
       LEFT JOIN pg_attrdef ad ON ad.adrelid = a.attrelid AND ad.adnum = a.attnum
       WHERE n.nspname = $1 AND c.relname = $2
         AND a.attnum > 0 AND NOT a.attisdropped
       ORDER BY a.attnum`,
      [schema, table]
    );
    const pk = await pool.query(
      `SELECT a.attname AS name
       FROM pg_index i
       JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
       WHERE i.indrelid = $1::regclass AND i.indisprimary`,
      [`${quotePath('postgresql', [schema, table])}`]
    );
    const primary = new Set(pk.rows.map(row => String(row.name)));
    return result.rows.map(row => ({
      name: String(row.name),
      type: String(row.type || 'unknown'),
      nullable: Boolean(row.nullable),
      primaryKey: primary.has(String(row.name)),
      defaultValue: row.default_value,
      identity: row.identity ? String(row.identity) : '',
      generated: row.generated ? String(row.generated) : ''
    }));
  }

  async tableData(database, table, options = {}) {
    const started = Date.now();
    try {
      const ref = parsePgTable(table, options.schema);
      const columns = await this.columns(database, ref.schema, ref.table);
      if (columns.length === 0) throw new DshCatError('table_not_found', '表不存在或没有可见字段。');
      const page = pageNumber(options.page);
      const size = pageSize(options.pageSize);
      const where = buildWhere('postgresql', columns, options.filters);
      const values = [...where.values, size + 1, (page - 1) * size];
      const primary = columns.filter(column => column.primaryKey).map(column => quotePath('postgresql', [column.name]));
      const order = primary.length > 0 ? ` ORDER BY ${primary.join(', ')}` : '';
      const result = await this.poolFor(database).query({
        text: `SELECT * FROM ${quotePath('postgresql', [ref.schema, ref.table])}${where.sql}${order} LIMIT $${values.length - 1} OFFSET $${values.length}`,
        values,
        rowMode: 'array'
      });
      const hasMore = result.rows.length > size;
      const selected = hasMore ? result.rows.slice(0, size) : result.rows;
      return pageResult(
        columns.map(column => ({
          name: column.name,
          type: column.type,
          nullable: column.nullable,
          primaryKey: column.primaryKey
        })),
        selected.map(row => row.map(value => normalizeValue(value))),
        page,
        size,
        hasMore,
        started
      );
    } catch (error) {
      this.wrap(error, '读取 PostgreSQL 表数据');
    }
  }

  async execute(database, input) {
    const started = Date.now();
    const sql = cleanSql(input);
    if (!sql) throw new DshCatError('empty_sql', '请先输入 SQL。');
    try {
      const result = await this.poolFor(database || this.initialDatabase()).query(sql);
      const results = Array.isArray(result) ? result : [result];
      const sets = results.map((entry, index) => {
        if (!entry || typeof entry !== 'object') {
          return { index, label: `语句 ${index + 1}`, columns: [], rows: [], rowCount: 0, message: '执行完成' };
        }
        if (Array.isArray(entry.fields) && entry.fields.length > 0) {
          const fields = entry.fields;
          return {
            index,
            label: `结果 ${index + 1}`,
            columns: fields.map(field => ({ name: field.name, type: field.dataTypeID ? `oid:${field.dataTypeID}` : 'value' })),
            rows: (entry.rows || []).map(row => fields.map(field => normalizeValue(row[field.name]))),
            rowCount: entry.rowCount ?? (entry.rows || []).length,
            message: `${entry.rowCount ?? (entry.rows || []).length} 行`
          };
        }
        const affected = Number(entry.rowCount);
        return {
          index,
          label: `语句 ${index + 1}`,
          columns: [],
          rows: [],
          rowCount: 0,
          affectedRows: Number.isFinite(affected) ? affected : 0,
          message: Number.isFinite(affected) ? `影响 ${affected} 行` : '执行完成'
        };
      });
      return { sets, durationMs: Date.now() - started };
    } catch (error) {
      this.wrap(error, '执行 PostgreSQL SQL');
    }
  }

  async createDatabase(name) {
    try {
      await this.poolFor(this.initialDatabase()).query(`CREATE DATABASE ${quotePath('postgresql', [name])} ENCODING 'UTF8'`);
      return { name };
    } catch (error) {
      this.wrap(error, '创建 PostgreSQL 数据库');
    }
  }

  async dropDatabase(name) {
    if (PG_SYSTEM_DATABASES.has(String(name).toLowerCase())) {
      throw new DshCatError('protected_database', '系统数据库不允许删除。');
    }
    try {
      // PostgreSQL refuses to drop a database with an open pool from this
      // process, so close the target pool first and run the DROP elsewhere.
      const target = this.pools.get(name);
      if (target) {
        this.pools.delete(name);
        await target.end().catch(() => undefined);
      }
      const adminDatabase = name === this.initialDatabase() ? 'postgres' : this.initialDatabase();
      await this.poolFor(adminDatabase).query(`DROP DATABASE ${quotePath('postgresql', [name])}`);
      return { name };
    } catch (error) {
      this.wrap(error, '删除 PostgreSQL 数据库');
    }
  }

  async updateCell(database, table, options = {}) {
    try {
      const ref = parsePgTable(table, options.schema);
      const columns = await this.columns(database, ref.schema, ref.table);
      const column = columns.find(entry => entry.name === options.column);
      if (!column) throw new DshCatError('column_not_found', '字段不存在或没有编辑权限。');
      const primary = columns.filter(entry => entry.primaryKey);
      if (primary.length === 0) {
        throw new DshCatError('no_primary_key', '该表没有主键，无法安全定位并编辑单元格。');
      }
      const provided = options.pk && typeof options.pk === 'object' ? options.pk : {};
      for (const keyColumn of primary) {
        if (!Object.prototype.hasOwnProperty.call(provided, keyColumn.name) || provided[keyColumn.name] === null || provided[keyColumn.name] === undefined) {
          throw new DshCatError('invalid_row_identity', `缺少主键字段 ${keyColumn.name} 的值。`);
        }
      }
      const kind = pgCellKind(column);
      const value = coercePgCell(options.value, column, kind);
      const qualified = quotePath('postgresql', [ref.schema, ref.table]);
      const values = [value, ...primary.map(keyColumn => coercePgCell(provided[keyColumn.name], keyColumn, pgCellKind(keyColumn)))];
      const where = primary.map((keyColumn, index) => `${quotePath('postgresql', [keyColumn.name])} = $${index + 2}`).join(' AND ');
      const result = await this.poolFor(database).query({
        text: `UPDATE ${qualified} SET ${quotePath('postgresql', [column.name])} = $1 WHERE ${where} RETURNING 1`,
        values
      });
      if (result.rowCount === 0) {
        throw new DshCatError('row_not_found', '目标行已不存在，可能已被其他操作修改或删除。');
      }
      return { updated: true, column: column.name };
    } catch (error) {
      this.wrap(error, '更新 PostgreSQL 单元格');
    }
  }

  async exportTable(database, table, mode) {
    try {
      const ref = parsePgTable(table);
      const pool = this.poolFor(database);
      const relation = await pool.query(
        `SELECT c.relkind AS kind
         FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = $1 AND c.relname = $2`,
        [ref.schema, ref.table]
      );
      if (relation.rows.length === 0) throw new DshCatError('table_not_found', '表不存在。');
      const kind = String(relation.rows[0].kind);
      const qualified = quotePath('postgresql', [ref.schema, ref.table]);
      const parts = [
        '-- DshCat structure export (PostgreSQL)',
        `-- Database: ${database}`,
        `-- Table: ${ref.schema}.${ref.table}`,
        `-- Generated: ${new Date().toISOString()}`,
        ''
      ];
      if (kind === 'v' || kind === 'm') {
        const view = await pool.query('SELECT pg_get_viewdef($1::regclass, true) AS definition', [qualified]);
        const definition = String(view.rows[0]?.definition || '').trim();
        const keyword = kind === 'm' ? 'CREATE MATERIALIZED VIEW' : 'CREATE OR REPLACE VIEW';
        parts.push(`${keyword} ${qualified} AS`, definition.replace(/;$/, ''), ';');
        if (mode === 'data') parts.push('-- Data export is not available for views.');
      } else {
        const columns = await this.columns(database, ref.schema, ref.table);
        const pk = columns.filter(column => column.primaryKey).map(column => column.name);
        const definitions = columns.map(column => {
          let definition = `  ${quotePath('postgresql', [column.name])} ${column.type}`;
          const serialDefault = /^nextval\(/i.test(String(column.defaultValue || ''))
            && /^(smallint|integer|bigint)$/i.test(String(column.type || ''));
          if (column.generated === 's' && column.defaultValue !== null && column.defaultValue !== undefined) {
            definition += ` GENERATED ALWAYS AS (${column.defaultValue}) STORED`;
          } else if (column.identity === 'a') {
            definition += ' GENERATED ALWAYS AS IDENTITY';
          } else if (column.identity === 'd') {
            definition += ' GENERATED BY DEFAULT AS IDENTITY';
          } else if (serialDefault) {
            // A serial's sequence is not included in this export. Emitting an
            // identity column keeps the DDL self-contained and still permits
            // the explicit IDs in the data section.
            definition += ' GENERATED BY DEFAULT AS IDENTITY';
          } else if (column.defaultValue !== null && column.defaultValue !== undefined) {
            definition += ` DEFAULT ${column.defaultValue}`;
          }
          if (!column.nullable) definition += ' NOT NULL';
          return definition;
        });
        if (pk.length > 0) definitions.push(`  PRIMARY KEY (${pk.map(name => quotePath('postgresql', [name])).join(', ')})`);
        parts.push(`CREATE TABLE ${qualified} (\n${definitions.join(',\n')}\n);`);
        if (mode === 'data') {
          const result = await pool.query(`SELECT * FROM ${qualified} LIMIT ${EXPORT_ROW_CAP + 1}`);
          const truncated = result.rows.length > EXPORT_ROW_CAP;
          const selected = truncated ? result.rows.slice(0, EXPORT_ROW_CAP) : result.rows;
          const fieldNames = (result.fields || []).map(field => field.name);
          const exportColumns = fieldNames.map(name => {
            const detail = columns.find(column => column.name === name);
            return { name, type: detail?.type || '' };
          });
          const arrayRows = selected.map(row => fieldNames.map(name => row[name]));
          parts.push('', '-- Data', `-- Rows: ${selected.length}${truncated ? ' (truncated)' : ''}`);
          if (truncated) parts.push(`-- The table exceeds ${EXPORT_ROW_CAP} rows; only the first ${EXPORT_ROW_CAP} rows are included.`);
          const data = insertStatements('postgresql', [ref.schema, ref.table], exportColumns, arrayRows);
          parts.push(data || '-- No rows');
          const sequenceColumns = columns.filter(column => column.identity
            || (/^nextval\(/i.test(String(column.defaultValue || '')) && /^(smallint|integer|bigint)$/i.test(String(column.type || ''))));
          if (selected.length > 0 && sequenceColumns.length > 0) {
            parts.push('', '-- Advance sequences after importing explicit IDs');
            const tableLiteral = `'${qualified.replace(/'/g, "''")}'`;
            for (const column of sequenceColumns) {
              const columnLiteral = `'${String(column.name).replace(/'/g, "''")}'`;
              parts.push(`SELECT setval(pg_get_serial_sequence(${tableLiteral}, ${columnLiteral}), COALESCE((SELECT MAX(${quotePath('postgresql', [column.name])}) FROM ${qualified}), 1), true);`);
            }
          }
        }
      }
      parts.push('');
      return {
        filename: exportFilename(`${database}_${ref.schema}`, ref.table, mode === 'data' ? '' : '_structure'),
        content: parts.join('\n'),
        mime: 'application/sql;charset=utf-8'
      };
    } catch (error) {
      this.wrap(error, '导出 PostgreSQL 表');
    }
  }

  async aiSchema(database, focusTable) {
    try {
      const tables = await this.listTables(database);
      const result = await this.poolFor(database).query(
        `SELECT table_schema, table_name, column_name, data_type
         FROM information_schema.columns
         WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
           AND table_schema NOT LIKE 'pg_toast%'
         ORDER BY table_schema, table_name, ordinal_position
         LIMIT 3000`
      );
      const map = new Map();
      for (const row of result.rows) {
        const key = `${row.table_schema}.${row.table_name}`;
        const list = map.get(key) || [];
        list.push(`${row.column_name} ${row.data_type}`);
        map.set(key, list);
      }
      const compact = tables.slice(0, 80).map(table => ({
        name: `${table.schema}.${table.name}`,
        schema: table.schema,
        type: table.type,
        columns: (map.get(`${table.schema}.${table.name}`) || []).slice(0, 80)
      }));
      let sample = null;
      if (focusTable) {
        const ref = parsePgTable(focusTable);
        const sampleResult = await this.poolFor(database).query(
          `SELECT * FROM ${quotePath('postgresql', [ref.schema, ref.table])} LIMIT 3`
        );
        if (sampleResult.rows.length > 0) {
          sample = { table: `${ref.schema}.${ref.table}`, rows: sampleResult.rows.map(row => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, normalizeValue(value)]))) };
        }
      }
      return {
        engine: 'postgresql',
        dialect: 'PostgreSQL SQL',
        database,
        schemas: [...new Set(tables.map(table => table.schema))],
        tables: compact,
        truncated: tables.length > compact.length,
        sample
      };
    } catch (error) {
      this.wrap(error, '读取 PostgreSQL 结构');
    }
  }

  async close() {
    await Promise.all([...this.pools.values()].map(pool => pool.end().catch(() => undefined)));
    this.pools.clear();
  }
}
