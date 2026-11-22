/** MySQL adapter using mysql2/promise. */

import mysql from 'mysql2/promise';
import { BaseAdapter } from './base.js';
import { connectionInfo } from '../url.js';
import { DshCatError } from '../errors.js';
import {
  cleanSql, normalizeRows, normalizeSort, pageNumber, pageSize, pageResult
} from './common.js';
import {
  buildWhere, exportFilename, insertStatements, normalizeValue, quoteIdent, quotePath, sqlLiteral
} from '../sql.js';

// `__recycle_bin__` is the Alibaba Cloud RDS for MySQL system database used by
// the Recycle Bin feature. RDS rejects DROP DATABASE even when the account has
// a global DROP grant, so treat it as protected instead of exposing a button
// that always fails.
const SYSTEM_DATABASES = new Set(['information_schema', 'mysql', 'performance_schema', 'sys', '__recycle_bin__']);
const EXPORT_ROW_CAP = 50_000;

/** Normalize a mysql2 result set into DshCat's table shape. */
function resultSetFromRows(rows, fields) {
  if (!Array.isArray(fields)) {
    return { columns: [], rows: [], rowCount: 0, message: `${rows.length} rows` };
  }
  const normalized = normalizeRows(Array.isArray(rows) ? rows : [], fields);
  return {
    columns: normalized.columns,
    rows: normalized.rows,
    rowCount: normalized.rows.length,
    message: `${normalized.rows.length} 行`
  };
}

/** Read a human version string from mysql2's version probe. */
function versionOf(row) {
  return row && typeof row === 'object' ? String(row.version ?? row.VERSION ?? '') : '';
}

/** Classify a MySQL column just enough to choose the editor and conversion. */
function mysqlCellKind(column) {
  const type = String(column?.dataType || '').toLowerCase();
  const full = String(column?.type || '').toLowerCase();
  if (type === 'json' || /\bjson\b/.test(full)) return 'json';
  if (type === 'bool' || type === 'boolean' || /^tinyint\(1\)/.test(full)) return 'boolean';
  if (/^(binary|varbinary|tinyblob|blob|mediumblob|longblob|bit|geometry|point|linestring|polygon)$/.test(type)) return 'binary';
  if (/^enum\(/.test(full)) return 'enum';
  if (/^(tinyint|smallint|mediumint|int|integer|bigint|decimal|numeric|float|double|real|year)$/.test(type)) return 'number';
  if (/^(date|datetime|timestamp|time)$/.test(type)) return 'date';
  return 'text';
}

/** Convert a browser cell value into the parameter type mysql2 should send. */
function coerceMysqlCell(value, column, kind) {
  if (value === null) {
    if (!column.nullable) throw new DshCatError('invalid_cell_value', '该字段不允许为 NULL。');
    return null;
  }
  const text = typeof value === 'string' ? value : String(value);
  if (kind === 'binary') throw new DshCatError('unsupported_cell_edit', '二进制字段不支持编辑。');
  if (kind === 'boolean') {
    const normalized = text.trim().toLowerCase();
    if (['true', '1'].includes(normalized)) return 1;
    if (['false', '0'].includes(normalized)) return 0;
    throw new DshCatError('invalid_cell_value', '布尔字段只接受 true 或 false。');
  }
  if (kind === 'number') {
    if (text.trim() === '') throw new DshCatError('invalid_cell_value', '数字字段不能为空；如需空值请选择 NULL。');
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  if (kind === 'date') {
    const trimmed = text.trim();
    // Browser table data normalizes SQL dates to ISO. MySQL's temporal types
    // use a space-delimited wall-clock value, so undo the ISO punctuation.
    if (/^\d{4}-\d{2}-\d{2}T/i.test(trimmed)) {
      const parsed = new Date(trimmed);
      if (!Number.isNaN(parsed.getTime())) {
        const pad = (number, width = 2) => String(number).padStart(width, '0');
        const date = `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`;
        const time = `${pad(parsed.getHours())}:${pad(parsed.getMinutes())}:${pad(parsed.getSeconds())}.${pad(parsed.getMilliseconds(), 3)}`;
        if (String(column.dataType || '').toLowerCase() === 'date') return date;
        return `${date} ${time}`;
      }
    }
  }
  return text;
}

export class MySqlAdapter extends BaseAdapter {
  constructor(source, options) {
    super(source, options);
    this.info = connectionInfo(source);
    this.metaCache = new Map();
    this.estimateCache = new Map();
    this.pool = mysql.createPool({
      host: this.info.host,
      port: this.info.port,
      user: this.info.username || undefined,
      password: this.info.password || undefined,
      waitForConnections: true,
      connectionLimit: 4,
      maxIdle: 4,
      idleTimeout: 60_000,
      queueLimit: 0,
      connectTimeout: 10_000,
      charset: 'utf8mb4',
      multipleStatements: false,
      supportBigNumbers: true,
      bigNumberStrings: false,
      dateStrings: false,
      ssl: this.info.ssl || undefined,
      enableKeepAlive: true
    });
  }

  async test() {
    const started = Date.now();
    try {
      const [rows] = await this.pool.query('SELECT VERSION() AS version');
      return {
        ok: true,
        latencyMs: Date.now() - started,
        version: versionOf(rows?.[0]),
        label: `${this.info.host}:${this.info.port}`
      };
    } catch (error) {
      this.wrap(error, '连接 MySQL');
    }
  }

  async listDatabases() {
    try {
      const [rows] = await this.pool.query('SHOW DATABASES');
      const names = rows.map(row => String(row.Database ?? row.database ?? Object.values(row)[0]));
      names.sort((left, right) => {
        const a = SYSTEM_DATABASES.has(left) ? 1 : 0;
        const b = SYSTEM_DATABASES.has(right) ? 1 : 0;
        return a - b || left.localeCompare(right);
      });
      return names.map(name => ({
        name,
        detail: SYSTEM_DATABASES.has(name) ? 'system' : undefined
      }));
    } catch (error) {
      this.wrap(error, '读取 MySQL 数据库列表');
    }
  }

  async listTables(database) {
    try {
      const db = String(database || '');
      if (!db) throw new DshCatError('invalid_database', '请选择数据库。');
      const [rows] = await this.pool.query(
        `SELECT TABLE_NAME AS name, TABLE_TYPE AS type, TABLE_ROWS AS rowCount, TABLE_COMMENT AS comment
         FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = ?
         ORDER BY TABLE_TYPE, TABLE_NAME`,
        [db]
      );
      return rows.map(row => {
        const name = String(row.name);
        const rawType = String(row.type || 'BASE TABLE');
        const type = rawType.includes('VIEW') ? 'view' : 'table';
        const count = Number(row.rowCount);
        const details = [];
        if (Number.isFinite(count) && count > 0) details.push(`~${count} 行`);
        if (row.comment) details.push(String(row.comment).slice(0, 80));
        return { name, label: name, type, schema: db, detail: details.join(' · ') || undefined };
      });
    } catch (error) {
      this.wrap(error, '读取 MySQL 表列表');
    }
  }

  invalidateMetadata() {
    this.metaCache.clear();
    this.estimateCache.clear();
  }

  async columns(database, table) {
    const key = `${database}\0${table}`;
    const cached = this.metaCache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.columns.map(column => ({ ...column }));
    const [rows] = await this.pool.query(
      `SELECT COLUMN_NAME AS name, DATA_TYPE AS dataType, COLUMN_TYPE AS columnType,
              IS_NULLABLE AS nullable, COLUMN_KEY AS columnKey, COLUMN_DEFAULT AS defaultValue,
              EXTRA AS extra
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
       ORDER BY ORDINAL_POSITION`,
      [database, table]
    );
    const columns = rows.map(row => ({
      name: String(row.name),
      type: String(row.columnType || row.dataType || 'unknown'),
      dataType: String(row.dataType || ''),
      nullable: String(row.nullable).toUpperCase() === 'YES',
      primaryKey: String(row.columnKey).toUpperCase() === 'PRI',
      defaultValue: row.defaultValue,
      extra: row.extra ? String(row.extra) : ''
    }));
    this.metaCache.set(key, { expiresAt: Date.now() + 10_000, columns });
    return columns.map(column => ({ ...column }));
  }

  async indexes(database, table) {
    const [rows] = await this.pool.query(
      `SELECT INDEX_NAME AS name, NON_UNIQUE AS nonUnique, SEQ_IN_INDEX AS position,
              COLUMN_NAME AS columnName
       FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
       ORDER BY INDEX_NAME, SEQ_IN_INDEX`,
      [database, table]
    );
    const grouped = new Map();
    for (const row of rows) {
      const name = String(row.name);
      const entry = grouped.get(name) || {
        name, unique: Number(row.nonUnique) === 0, primary: name === 'PRIMARY', columns: []
      };
      if (row.columnName) entry.columns.push(String(row.columnName));
      grouped.set(name, entry);
    }
    return [...grouped.values()];
  }

  async constraints(database, table) {
    const [rows] = await this.pool.query(
      `SELECT CONSTRAINT_NAME AS name, CONSTRAINT_TYPE AS type
       FROM information_schema.TABLE_CONSTRAINTS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
       ORDER BY CONSTRAINT_NAME`,
      [database, table]
    );
    return rows.map(row => ({ name: String(row.name), type: String(row.type) }));
  }

  async estimatedRows(database, table) {
    const key = `${database}\0${table}`;
    const cached = this.estimateCache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.value;
    try {
      const [rows] = await this.pool.query(
        `SELECT TABLE_ROWS AS rowCount FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
        [database, table]
      );
      const value = Number(rows?.[0]?.rowCount);
      const estimate = Number.isFinite(value) && value >= 0 ? value : null;
      this.estimateCache.set(key, { expiresAt: Date.now() + 10_000, value: estimate });
      return estimate;
    } catch {
      return null;
    }
  }

  async countRows(database, table, options = {}) {
    const started = Date.now();
    try {
      const columns = await this.columns(database, table);
      const where = buildWhere('mysql', columns, options.filters);
      const [rows] = await this.pool.query({
        sql: `SELECT COUNT(*) AS total FROM ${quotePath('mysql', [database, table])}${where.sql}`,
        values: where.values,
        timeout: Math.max(1_000, Math.min(120_000, Number(options.timeoutMs) || 15_000))
      });
      return {
        total: Number(rows?.[0]?.total ?? 0),
        filtered: where.values.length > 0,
        durationMs: Date.now() - started
      };
    } catch (error) {
      this.wrap(error, '统计 MySQL 表行数');
    }
  }

  async tableData(database, table, options = {}) {
    const started = Date.now();
    try {
      const columns = await this.columns(database, table);
      if (columns.length === 0) throw new DshCatError('table_not_found', '表不存在或没有可见字段。');
      const page = pageNumber(options.page);
      const size = pageSize(options.pageSize);
      const where = buildWhere('mysql', columns, options.filters);
      const offset = (page - 1) * size;
      const sort = normalizeSort(columns, options.sort);
      const primary = columns.filter(column => column.primaryKey).map(column => column.name);
      const ordered = [];
      for (const item of sort) ordered.push(`${quoteIdent('mysql', item.field)} ${item.dir === 'desc' ? 'DESC' : 'ASC'}`);
      const used = new Set(sort.map(item => item.field));
      for (const field of [...primary, ...(primary.length === 0 ? columns.map(column => column.name) : [])]) {
        if (used.has(field)) continue;
        used.add(field);
        ordered.push(`${quoteIdent('mysql', field)} ASC`);
      }
      const order = ordered.length > 0 ? ` ORDER BY ${ordered.join(', ')}` : '';
      const sql = `SELECT * FROM ${quotePath('mysql', [database, table])}${where.sql}${order} LIMIT ? OFFSET ?`;
      const values = [...where.values, size + 1, offset];
      const [rows, fields] = await this.pool.query({
        sql,
        values,
        rowsAsArray: true,
        timeout: Math.max(1_000, Math.min(120_000, Number(options.timeoutMs) || 15_000))
      });
      const hasMore = rows.length > size;
      const selected = hasMore ? rows.slice(0, size) : rows;
      const normalized = normalizeRows(selected, fields || []);
      const columnDetails = columns.map(column => ({
        name: column.name,
        type: column.type,
        nullable: column.nullable,
        primaryKey: column.primaryKey
      }));
      const estimatedTotal = where.values.length === 0 ? await this.estimatedRows(database, table) : null;
      return pageResult(
        columnDetails.length > 0 ? columnDetails : normalized.columns,
        normalized.rows,
        page,
        size,
        hasMore,
        started,
        {
          sort,
          estimatedTotal,
          totalIsEstimate: estimatedTotal !== null,
          orderStable: primary.length > 0,
          orderHint: primary.length > 0 ? null : 'no_primary_key'
        }
      );
    } catch (error) {
      this.wrap(error, '读取 MySQL 表数据');
    }
  }

  async execute(database, input, options = {}) {
    const started = Date.now();
    const statements = (Array.isArray(input) ? input : [input])
      .map(value => cleanSql(value))
      .filter(Boolean);
    if (statements.length === 0) throw new DshCatError('empty_sql', '请先输入 SQL。');
    const readOnly = options.readOnly === true;
    const timeoutMs = Math.max(1_000, Math.min(120_000, Number(options.timeoutMs) || 15_000));
    let connection;
    let destroyed = false;
    let destroyedConnection = false;
    let aborted = false;
    const destroyConnection = () => {
      if (!connection || destroyedConnection) return;
      destroyedConnection = true;
      destroyed = true;
      try {
        connection.destroy();
      } catch {
        // The connection may already be gone.
      }
    };
    const onAbort = () => {
      aborted = true;
      destroyConnection();
    };
    options.signal?.addEventListener('abort', onAbort, { once: true });
    try {
      if (options.signal?.aborted) throw new DshCatError('query_cancelled', '查询已取消。');
      // A pool connection is not bound to a database: select the browser's
      // current database on this exact connection before running the SQL.
      connection = await this.pool.getConnection();
      if (aborted || options.signal?.aborted) throw new DshCatError('query_cancelled', '查询已取消。');
      if (database) await connection.query(`USE ${quoteIdent('mysql', database)}`);
      try {
        await connection.query(`SET SESSION MAX_EXECUTION_TIME = ${timeoutMs}`);
      } catch {
        try {
          await connection.query(`SET SESSION max_statement_time = ${timeoutMs / 1000}`);
        } catch {
          // Older engines may not expose either server-side timeout; the
          // driver timeout below still bounds the socket wait.
        }
      }
      await connection.query(readOnly ? 'START TRANSACTION READ ONLY' : 'START TRANSACTION');
      const sets = [];
      for (const [statementIndex, statement] of statements.entries()) {
        if (aborted || options.signal?.aborted) throw new DshCatError('query_cancelled', '查询已取消。');
        const [result, fields] = await connection.query({
          sql: statement,
          rowsAsArray: false,
          timeout: timeoutMs
        });
        for (const set of this.resultSets(result, fields)) {
          sets.push({ ...set, statementIndex });
        }
      }
      await connection.query(readOnly ? 'ROLLBACK' : 'COMMIT');
      return { sets, durationMs: Date.now() - started, readOnly };
    } catch (error) {
      try {
        if (connection && !destroyed) await connection.query('ROLLBACK');
      } catch {
        // The transaction may already have been rolled back by the driver.
      }
      if (aborted || error?.code === 'PROTOCOL_SEQUENCE_TIMEOUT' || /timeout/i.test(String(error?.message || ''))) {
        destroyed = true;
        throw aborted
          ? new DshCatError('query_cancelled', '查询已取消。')
          : new DshCatError('query_timeout', `查询超过 ${timeoutMs} ms，已终止。`);
      }
      this.wrap(error, readOnly ? '执行 MySQL 只读查询' : '执行 MySQL SQL');
    } finally {
      options.signal?.removeEventListener('abort', onAbort);
      if (!readOnly) this.invalidateMetadata();
      if (connection) {
        if (destroyed) destroyConnection();
        else connection.release();
      }
    }
  }

  async planCellEdits(database, table, edits = []) {
    const columns = await this.columns(database, table);
    const primary = columns.filter(column => column.primaryKey);
    if (primary.length === 0) {
      throw new DshCatError('no_primary_key', '该表没有主键，无法安全定位并编辑单元格。');
    }
    const byName = new Map(columns.map(column => [column.name, column]));
    const seen = new Set();
    const operations = [];
    for (const [index, edit] of edits.entries()) {
      const column = byName.get(String(edit?.column || ''));
      if (!column) throw new DshCatError('invalid_column', `第 ${index + 1} 处编辑的字段不存在。`);
      if (column.primaryKey) throw new DshCatError('primary_key_edit_unsupported', '待提交模式不支持修改主键字段。');
      const provided = edit?.pk && typeof edit.pk === 'object' && !Array.isArray(edit.pk) ? edit.pk : {};
      for (const keyColumn of primary) {
        if (!Object.prototype.hasOwnProperty.call(provided, keyColumn.name)
          || provided[keyColumn.name] === null || provided[keyColumn.name] === undefined) {
          throw new DshCatError('invalid_row_identity', `缺少主键字段 ${keyColumn.name} 的值。`);
        }
      }
      const keyValues = primary.map(keyColumn => coerceMysqlCell(
        provided[keyColumn.name], keyColumn, mysqlCellKind(keyColumn)
      ));
      const rowKey = JSON.stringify(primary.map((keyColumn, keyIndex) => [keyColumn.name, keyValues[keyIndex]]));
      const cellKey = `${rowKey}\0${column.name}`;
      if (seen.has(cellKey)) throw new DshCatError('duplicate_cell_edit', '同一单元格不能重复修改。');
      seen.add(cellKey);
      operations.push({
        column,
        value: coerceMysqlCell(edit.value, column, mysqlCellKind(column)),
        where: primary.map(keyColumn => `${quoteIdent('mysql', keyColumn.name)} = ?`).join(' AND '),
        keyValues
      });
    }
    return { primary, operations };
  }

  async previewCellEdits(database, table, edits = []) {
    const plan = await this.planCellEdits(database, table, edits);
    const qualified = quotePath('mysql', [database, table]);
    return plan.operations.map((operation, index) => ({
      index,
      column: operation.column.name,
      sql: `UPDATE ${qualified} SET ${quoteIdent('mysql', operation.column.name)} = ${sqlLiteral(operation.value, 'mysql', operation.column.type)} WHERE ${plan.primary.map((column, keyIndex) => `${quoteIdent('mysql', column.name)} = ${sqlLiteral(operation.keyValues[keyIndex], 'mysql', column.type)}`).join(' AND ')} LIMIT 1;`
    }));
  }

  async commitCellEdits(database, table, edits = [], options = {}) {
    const plan = await this.planCellEdits(database, table, edits);
    if (plan.operations.length === 0) return { updated: 0, statements: 0 };
    const qualified = quotePath('mysql', [database, table]);
    const timeoutMs = Math.max(1_000, Math.min(120_000, Number(options.timeoutMs) || 15_000));
    let connection;
    try {
      connection = await this.pool.getConnection();
      await connection.query('START TRANSACTION');
      for (const operation of plan.operations) {
        const [result] = await connection.query({
          sql: `UPDATE ${qualified} SET ${quoteIdent('mysql', operation.column.name)} = ? WHERE ${operation.where} LIMIT 1`,
          values: [operation.value, ...operation.keyValues],
          timeout: timeoutMs
        });
        if (result?.affectedRows === 0) {
          const [found] = await connection.query({
            sql: `SELECT 1 FROM ${qualified} WHERE ${operation.where} LIMIT 1`,
            values: operation.keyValues,
            timeout: timeoutMs
          });
          if (found.length === 0) {
            throw new DshCatError('row_not_found', '目标行已不存在，整批修改已回滚。');
          }
        }
      }
      await connection.query('COMMIT');
      return { updated: plan.operations.length, statements: plan.operations.length };
    } catch (error) {
      try {
        await connection?.query('ROLLBACK');
      } catch {
        // The failed statement may already have ended the transaction.
      }
      this.invalidateMetadata();
      this.wrap(error, '提交 MySQL 单元格变更');
    } finally {
      connection?.release();
    }
  }

  async createDatabase(name) {
    try {
      await this.pool.query({
        sql: `CREATE DATABASE ${quoteIdent('mysql', name)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
      });
      this.invalidateMetadata();
      return { name };
    } catch (error) {
      this.wrap(error, '创建 MySQL 数据库');
    }
  }

  async dropDatabase(name) {
    if (SYSTEM_DATABASES.has(String(name).toLowerCase())) {
      throw new DshCatError('protected_database', '系统数据库不允许删除。');
    }
    try {
      await this.pool.query({ sql: `DROP DATABASE ${quoteIdent('mysql', name)}` });
      this.invalidateMetadata();
      return { name };
    } catch (error) {
      this.wrap(error, '删除 MySQL 数据库');
    }
  }

  async updateCell(database, table, options = {}) {
    try {
      const columns = await this.columns(database, table);
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
      const kind = mysqlCellKind(column);
      const value = coerceMysqlCell(options.value, column, kind);
      const qualified = quotePath('mysql', [database, table]);
      const where = primary.map(keyColumn => `${quoteIdent('mysql', keyColumn.name)} = ?`).join(' AND ');
      const whereValues = primary.map(keyColumn => coerceMysqlCell(provided[keyColumn.name], keyColumn, mysqlCellKind(keyColumn)));
      await this.pool.query({
        sql: `UPDATE ${qualified} SET ${quoteIdent('mysql', column.name)} = ? WHERE ${where} LIMIT 1`,
        values: [value, ...whereValues]
      });
      // An unchanged value reports affectedRows 0, so verify the row with the
      // effective key (which may itself have been edited) instead.
      const effective = { ...provided };
      if (primary.some(keyColumn => keyColumn.name === column.name)) effective[column.name] = value;
      const confirmValues = primary.map(keyColumn => coerceMysqlCell(effective[keyColumn.name], keyColumn, mysqlCellKind(keyColumn)));
      const [found] = await this.pool.query({
        sql: `SELECT 1 FROM ${qualified} WHERE ${where} LIMIT 1`,
        values: confirmValues
      });
      if (found.length === 0) throw new DshCatError('row_not_found', '目标行已不存在，可能已被其他操作修改或删除。');
      return { updated: true, column: column.name };
    } catch (error) {
      this.wrap(error, '更新 MySQL 单元格');
    }
  }

  /** Flatten mysql2's single and multiple statement result shapes. */
  resultSets(result, fields) {
    // A multi-statement query returns arrays of per-statement rows and fields;
    // a single query returns one rows array and one fields array. Entries in
    // `fields` are nested arrays for SELECT results and undefined for DML.
    const multi = Array.isArray(result)
      && Array.isArray(fields)
      && fields.length > 0
      && fields.some(entry => entry === undefined || Array.isArray(entry));
    if (multi) {
      return result.map((entry, index) => this.resultSet(entry, fields[index], index));
    }
    return [this.resultSet(result, fields, 0)];
  }

  resultSet(result, fields, index) {
    if (Array.isArray(result)) {
      const normalized = normalizeRows(result, Array.isArray(fields) ? fields : []);
      return {
        index,
        label: `结果 ${index + 1}`,
        columns: normalized.columns,
        rows: normalized.rows,
        rowCount: normalized.rows.length,
        message: `${normalized.rows.length} 行`
      };
    }
    if (result && typeof result === 'object' && ('affectedRows' in result || 'insertId' in result)) {
      const pieces = [];
      if (Number(result.affectedRows) >= 0) pieces.push(`影响 ${Number(result.affectedRows)} 行`);
      if (Number(result.insertId) > 0) pieces.push(`插入 ID ${String(result.insertId)}`);
      if (result.info) pieces.push(String(result.info));
      return {
        index,
        label: `语句 ${index + 1}`,
        columns: [],
        rows: [],
        rowCount: 0,
        affectedRows: Number(result.affectedRows) || 0,
        message: pieces.join(' · ') || '执行完成'
      };
    }
    return {
      index,
      label: `结果 ${index + 1}`,
      columns: [],
      rows: [],
      rowCount: 0,
      message: '执行完成'
    };
  }

  async exportTable(database, table, mode) {
    try {
      const qualified = quotePath('mysql', [database, table]);
      const [showRows] = await this.pool.query(`SHOW CREATE TABLE ${qualified}`);
      const row = showRows?.[0] || {};
      const createKey = Object.keys(row).find(key => /^create /i.test(key));
      const createSql = createKey ? String(row[createKey]) : '';
      if (!createSql) throw new DshCatError('export_failed', '无法读取该表的建表语句（可能是视图或权限不足）。');
      const parts = [
        '-- DshCat structure export (MySQL)',
        `-- Database: ${database}`,
        `-- Table: ${table}`,
        `-- Generated: ${new Date().toISOString()}`,
        '',
        `${createSql};`,
        ''
      ];
      const isView = /^CREATE\s+(?:ALGORITHM\s*=\s*\S+\s+)?(?:DEFINER\s*=\s*\S+\s+)?(?:SQL\s+SECURITY\s+\S+\s+)?VIEW\b/i.test(createSql);
      if (mode === 'data' && isView) {
        parts.push('-- Data export is not available for views.', '');
      } else if (mode === 'data') {
        const columns = await this.columns(database, table);
        const [rows, fields] = await this.pool.query({
          sql: `SELECT * FROM ${qualified} LIMIT ${EXPORT_ROW_CAP + 1}`
        });
        const truncated = rows.length > EXPORT_ROW_CAP;
        const selected = truncated ? rows.slice(0, EXPORT_ROW_CAP) : rows;
        const fieldNames = (fields || []).map(field => field.name);
        const exportColumns = fieldNames.map(name => {
          const detail = columns.find(column => column.name === name);
          return { name, type: detail?.type || '' };
        });
        const arrayRows = selected.map(rowValue => fieldNames.map(name => rowValue[name]));
        parts.push('-- Data', `-- Rows: ${selected.length}${truncated ? ' (truncated)' : ''}`);
        if (truncated) parts.push(`-- The table exceeds ${EXPORT_ROW_CAP} rows; only the first ${EXPORT_ROW_CAP} rows are included.`);
        // Keep the INSERT portable: the surrounding CREATE TABLE is also
        // unqualified, so the export imports into whichever database is current.
        const data = insertStatements('mysql', [table], exportColumns, arrayRows);
        if (data) parts.push(data);
        else parts.push('-- No rows');
        parts.push('');
      }
      return {
        filename: exportFilename(database, table, mode === 'data' ? '' : '_structure'),
        content: parts.join('\n'),
        mime: 'application/sql;charset=utf-8'
      };
    } catch (error) {
      this.wrap(error, '导出 MySQL 表');
    }
  }

  async aiSchema(database, focusTable) {
    try {
      const tables = await this.listTables(database);
      const [columnRows] = await this.pool.query(
        `SELECT TABLE_NAME AS tableName, COLUMN_NAME AS name, COLUMN_TYPE AS type
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = ?
         ORDER BY TABLE_NAME, ORDINAL_POSITION
         LIMIT 3000`,
        [database]
      );
      const byTable = new Map();
      for (const row of columnRows) {
        const name = String(row.tableName);
        const list = byTable.get(name) || [];
        list.push(`${String(row.name)} ${String(row.type)}`);
        byTable.set(name, list);
      }
      const compact = tables.slice(0, 80).map(table => ({
        name: table.name,
        type: table.type,
        columns: (byTable.get(table.name) || []).slice(0, 80)
      }));
      let sample = null;
      if (focusTable) {
        const [rows, fields] = await this.pool.query({
          sql: `SELECT * FROM ${quotePath('mysql', [database, focusTable])} LIMIT 3`,
          rowsAsArray: false
        });
        if (rows.length > 0) {
          sample = {
            table: focusTable,
            rows: rows.map(row => Object.fromEntries((fields || []).map(field => [field.name, normalizeValue(row[field.name])])))
          };
        }
      }
      return {
        engine: 'mysql',
        dialect: 'MySQL 8 SQL',
        database,
        tables: compact,
        truncated: tables.length > compact.length,
        sample
      };
    } catch (error) {
      this.wrap(error, '读取 MySQL 结构');
    }
  }

  async close() {
    try {
      await this.pool.end();
    } catch {
      // A failed pool close must not prevent unloading the plugin.
    }
  }
}
