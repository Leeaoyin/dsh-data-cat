/** Host JSON API exposed at POST /api/dshcat. */

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import XLSX from 'xlsx';
import { AiService } from './ai.js';
import { AuditLog, hashStatement } from './audit.js';
import { ConnectionManager } from './adapters/index.js';
import { DshCatError, messageOf } from './errors.js';
import {
  classifyRisk, protectedDatabaseDrop, protectedSchemaDrop, quoteIdent, quotePath, splitStatements, sqlLiteral
} from './sql.js';
import { normalizePolicy, SourceStore } from './store.js';

const MAX_SQL_LENGTH = 200_000;
const MAX_RESULT_ROWS = 2_000;
const MAX_STATEMENTS = 50;

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

/** Whitelist sort fields/directions here; adapters also check against real columns. */
/** Tool results must be lossless JSON: drop undefined object properties. */
function plainJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function csvCell(value) {
  if (value === null || value === undefined) return '';
  let text = typeof value === 'object' ? JSON.stringify(value) : String(value);
  // Neutralize spreadsheet formula cells; leave ordinary negative numbers alone.
  if (typeof value !== 'number' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function resultToCsv(set) {
  const columns = Array.isArray(set?.columns) ? set.columns : [];
  const rows = Array.isArray(set?.rows) ? set.rows : [];
  const lines = [columns.map(column => csvCell(column.name)).join(',')];
  for (const row of rows) {
    lines.push(columns.map((_column, index) => csvCell(Array.isArray(row) ? row[index] : row?.[column.name])).join(','));
  }
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}

function resultToXlsx(set) {
  const columns = Array.isArray(set?.columns) ? set.columns : [];
  const rows = Array.isArray(set?.rows) ? set.rows : [];
  const safe = value => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'number' || typeof value === 'boolean') return value;
    const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
    return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  };
  const data = [
    columns.map(column => column.name),
    ...rows.map(row => columns.map((_column, index) => safe(Array.isArray(row) ? row[index] : row?.[column.name])))
  ];
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(workbook, sheet, 'data');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

const MAX_CELL_EDITS = 500;

/** Validate a staged edit batch without ever accepting raw SQL from the browser. */
function sanitizeEdits(input) {
  if (!Array.isArray(input) || input.length === 0) {
    throw new DshCatError('empty_edits', '没有待提交的修改。');
  }
  if (input.length > MAX_CELL_EDITS) {
    throw new DshCatError('too_many_edits', `一次最多提交 ${MAX_CELL_EDITS} 处修改。`);
  }
  return input.map((edit, index) => {
    if (!edit || typeof edit !== 'object' || Array.isArray(edit)) {
      throw new DshCatError('invalid_cell_edit', `第 ${index + 1} 处修改格式无效。`);
    }
    const column = typeof edit.column === 'string' ? edit.column.slice(0, 200) : '';
    if (!column) throw new DshCatError('invalid_column', `第 ${index + 1} 处修改缺少字段。`);
    if (!edit.pk || typeof edit.pk !== 'object' || Array.isArray(edit.pk)) {
      throw new DshCatError('invalid_row_identity', `第 ${index + 1} 处修改缺少主键。`);
    }
    const pk = {};
    const entries = Object.entries(edit.pk);
    if (entries.length === 0 || entries.length > 16) {
      throw new DshCatError('invalid_row_identity', `第 ${index + 1} 处修改的主键无效。`);
    }
    for (const [name, value] of entries) {
      if (!name) throw new DshCatError('invalid_row_identity', '主键字段名无效。');
      pk[name] = sanitizeCellValue(value, `主键字段 ${name} 的值`);
    }
    return {
      column,
      value: sanitizeCellValue(edit.value, '单元格值'),
      pk
    };
  });
}

function sanitizeSort(input) {
  if (!Array.isArray(input)) return [];
  const seen = new Set();
  return input.slice(0, 4).flatMap(item => {
    if (!item || typeof item !== 'object') return [];
    const field = typeof item.field === 'string' ? item.field.slice(0, 200) : '';
    if (!field || seen.has(field)) return [];
    seen.add(field);
    return [{ field, dir: String(item.dir || '').toLowerCase() === 'desc' ? 'desc' : 'asc' }];
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
    policy: input.policy && typeof input.policy === 'object' && !Array.isArray(input.policy) ? input.policy : undefined,
    clearPassword: input.clearPassword === true
  };
}

/** Combine schema and relation for PostgreSQL-facing adapter methods. */
function pgTableName(kind, table, schema) {
  if (kind !== 'postgresql') return table;
  if (typeof schema === 'string' && schema !== '') return `${schema}.${table}`;
  return table;
}

const SENSITIVE_COLUMN = /(?:pass(?:word)?|passwd|pwd|secret|token|api[_-]?key|access[_-]?key|email|phone|mobile|ssn|credit[_-]?card|card[_-]?number)/i;

/** Default AI context is schema-only; opt-in samples are masked by column name. */
function sanitizeAiSchema(schema, includeSamples) {
  if (!schema || typeof schema !== 'object') return schema;
  const output = { ...schema };
  if (!includeSamples) {
    delete output.sample;
    return output;
  }
  if (output.sample && Array.isArray(output.sample.rows)) {
    output.sample = {
      ...output.sample,
      rows: output.sample.rows.map(row => {
        if (!row || typeof row !== 'object') return row;
        return Object.fromEntries(Object.entries(row).map(([key, value]) => [
          key,
          SENSITIVE_COLUMN.test(key) && value !== null ? '***' : value
        ]));
      })
    };
  }
  return output;
}

export class DshCatApi {
  /**
   * @param {any} ctx Host plugin context
   * @param {{logger?: any}} [options]
   */
  constructor(ctx, options = {}) {
    this.ctx = ctx;
    this.logger = options.logger || ctx.logger;
    this.credentials = ctx.credentials || ctx.get?.('credentials');
    this.store = new SourceStore({ logger: this.logger, credentials: this.credentials });
    this.manager = new ConnectionManager({ logger: this.logger });
    this.ai = new AiService(ctx);
    this.audit = new AuditLog({ logger: this.logger });
    this.agents = ctx.get?.('agents');
    this.approval = ctx.get?.('approval');
    this.toolDisposers = [];
  }

  /** Use the official one-shot approval seam when an Agent initiated the call. */
  async requestAgentApproval(risk, signal, explicitAgent) {
    const agent = explicitAgent || this.agents?.currentInitiator?.();
    if (!agent || !this.approval || typeof this.approval.request !== 'function') return false;
    let outcome;
    try {
      outcome = await this.approval.request({
        agent,
        toolName: 'dshcat.sql.write',
        reason: `DshDataCat requests approval for a ${risk} database statement batch.`,
        signal
      });
    } catch {
      // No open turn/answerer: keep the authenticated in-page confirmation path.
      return false;
    }
    if (outcome !== 'allowed-once') {
      throw new DshCatError('approval_denied', '写入操作未获批准。');
    }
    return true;
  }

  policyFor(source) {
    return normalizePolicy(source?.policy);
  }

  assertDatabase(source, database) {
    const policy = this.policyFor(source);
    if (database && policy.allowedDatabases.length > 0 && !policy.allowedDatabases.includes(database)) {
      throw new DshCatError('database_not_allowed', '该数据源策略不允许访问此数据库。');
    }
  }

  assertWritable(source) {
    if (this.policyFor(source).readOnly) {
      throw new DshCatError('read_only_source', '该数据源已设置为只读。');
    }
  }

  resolveToolSource(reference) {
    const text = String(reference || '').trim();
    const matches = this.store.sources.filter(source =>
      text === '' || source.id === text || source.name === text
    );
    if (matches.length === 1) return this.store.get(matches[0].id);
    if (matches.length === 0) {
      const names = this.store.sources.map(source => source.name).join(', ') || '(none)';
      throw new DshCatError('source_not_found', `找不到数据源 "${text}"。可用数据源：${names}`);
    }
    throw new DshCatError('source_ambiguous', `有多个数据源匹配 "${text}"，请使用数据源名称或 ID。`);
  }

  toolOutput() {
    return {
      schema: { type: 'object', additionalProperties: true },
      render: (_args, value) => [{
        type: 'text',
        text: JSON.stringify(value, null, 2)
      }]
    };
  }

  async writeToolWorkspaceFile(exec, requested, content) {
    const working = this.ctx.get?.('workingDirectory');
    const base = (working?.ensure
      ? await working.ensure(exec.agent, exec.signal)
      : process.cwd()) || process.cwd();
    if (path.isAbsolute(requested) || requested.includes('\0')) {
      throw new DshCatError('invalid_export_path', '导出文件名必须是工作区相对路径。');
    }
    const target = path.resolve(base, requested);
    const relative = path.relative(base, target);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new DshCatError('invalid_export_path', '导出路径不能离开工作区。');
    }
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content, typeof content === 'string' ? 'utf8' : undefined);
    return { path: relative.replace(/\\/g, '/'), bytes: Buffer.byteLength(content, 'utf8') };
  }

  async toolColumns(source, database, table, schema) {
    const adapter = this.manager.get(source);
    if (source.kind === 'postgresql') {
      const raw = String(table);
      const dot = raw.indexOf('.');
      const resolvedSchema = schema || (dot > 0 ? raw.slice(0, dot) : 'public');
      const resolvedTable = dot > 0 ? raw.slice(dot + 1) : raw;
      return { schema: resolvedSchema, table: resolvedTable, columns: await adapter.columns(database, resolvedSchema, resolvedTable) };
    }
    return { schema: '', table: String(table), columns: await adapter.columns(database, String(table)) };
  }

  async toolIndexes(source, database, table, schema) {
    const adapter = this.manager.get(source);
    if (source.kind === 'postgresql') {
      const raw = String(table);
      const dot = raw.indexOf('.');
      const resolvedSchema = schema || (dot > 0 ? raw.slice(0, dot) : 'public');
      const resolvedTable = dot > 0 ? raw.slice(dot + 1) : raw;
      return { schema: resolvedSchema, table: resolvedTable, indexes: await adapter.indexes(database, resolvedSchema, resolvedTable) };
    }
    return { schema: '', table: String(table), indexes: await adapter.indexes(database, String(table)) };
  }

  async toolConstraints(source, database, table, schema) {
    const adapter = this.manager.get(source);
    if (source.kind === 'postgresql') {
      const raw = String(table);
      const dot = raw.indexOf('.');
      const resolvedSchema = schema || (dot > 0 ? raw.slice(0, dot) : 'public');
      const resolvedTable = dot > 0 ? raw.slice(dot + 1) : raw;
      return { schema: resolvedSchema, table: resolvedTable, constraints: await adapter.constraints(database, resolvedSchema, resolvedTable) };
    }
    return { schema: '', table: String(table), constraints: await adapter.constraints(database, String(table)) };
  }

  toolTableRef(source, database, table, schema) {
    if (source.kind === 'postgresql') {
      const raw = String(table);
      const dot = raw.indexOf('.');
      const resolvedSchema = schema || (dot > 0 ? raw.slice(0, dot) : 'public');
      const resolvedTable = dot > 0 ? raw.slice(dot + 1) : raw;
      return quotePath('postgresql', [resolvedSchema, resolvedTable]);
    }
    return quotePath('mysql', [database, String(table)]);
  }

  toolColumnDefinition(source, column) {
    const kind = source.kind;
    const type = String(column.type || 'text');
    const parts = [`${quoteIdent(kind, column.name)} ${type}`];
    parts.push(column.nullable ? 'NULL' : 'NOT NULL');
    if (column.defaultValue !== null && column.defaultValue !== undefined && String(column.defaultValue) !== '') {
      const raw = String(column.defaultValue);
      const expression = /^(?:current_(?:timestamp|date|time)|now\(|nextval\(|null(?:\b|$)|\(|-?\d+(?:\.\d+)?$|true$|false$)/i.test(raw)
        || raw.startsWith("'") || raw.startsWith('(');
      parts.push(`DEFAULT ${expression ? raw : sqlLiteral(raw, kind, column.type)}`);
    }
    return parts.join(' ');
  }

  async schemaDiffTool(args) {
    const sourceA = this.resolveToolSource(args?.source_a);
    const sourceB = this.resolveToolSource(args?.source_b);
    if (sourceA.kind !== sourceB.kind || (sourceA.kind !== 'mysql' && sourceA.kind !== 'postgresql')) {
      throw new DshCatError('schema_diff_unsupported', 'DB schema diff 目前仅支持同类型 MySQL/PostgreSQL 数据源。');
    }
    const databaseA = String(args.database_a || '');
    const databaseB = String(args.database_b || '');
    const tableA = String(args.table_a || '');
    const tableB = String(args.table_b || tableA);
    if (!databaseA || !databaseB) {
      throw new DshCatError('invalid_schema_args', '需要 source_a/database_a 与 source_b/database_b。');
    }
    this.assertDatabase(sourceA, databaseA);
    this.assertDatabase(sourceB, databaseB);
    if (!tableA) {
      const leftTables = await this.manager.get(sourceA).listTables(databaseA);
      const rightTables = await this.manager.get(sourceB).listTables(databaseB);
      const keyOf = table => sourceA.kind === 'postgresql' ? `${table.schema || 'public'}.${table.name}` : table.name;
      const rightKeys = new Set(rightTables.map(keyOf));
      const leftKeys = new Set(leftTables.map(keyOf));
      const tableChanges = [
        ...leftTables.filter(table => !rightKeys.has(keyOf(table))).map(table => ({
          type: 'missing-in-target', table: keyOf(table)
        })),
        ...rightTables.filter(table => !leftKeys.has(keyOf(table))).map(table => ({
          type: 'extra-in-target', table: keyOf(table)
        }))
      ];
      return plainJson({
        ok: true,
        from: { source: sourceA.name, database: databaseA },
        to: { source: sourceB.name, database: databaseB },
        tables: { source: leftTables.length, target: rightTables.length },
        tableChanges,
        notes: [
          '未提供 table_a，因此只比较表名集合，未比较列/索引/约束。',
          '表缺失只报告，不自动生成 CREATE/DROP TABLE。'
        ]
      });
    }
    const left = await this.toolColumns(sourceA, databaseA, tableA, args.schema_a);
    const right = await this.toolColumns(sourceB, databaseB, tableB, args.schema_b);
    const leftIndexes = await this.toolIndexes(sourceA, databaseA, tableA, args.schema_a);
    const rightIndexes = await this.toolIndexes(sourceB, databaseB, tableB, args.schema_b);
    const leftConstraints = await this.toolConstraints(sourceA, databaseA, tableA, args.schema_a);
    const rightConstraints = await this.toolConstraints(sourceB, databaseB, tableB, args.schema_b);
    const leftMap = new Map(left.columns.map(column => [column.name, column]));
    const rightMap = new Map(right.columns.map(column => [column.name, column]));
    const targetRef = this.toolTableRef(sourceB, databaseB, tableB, args.schema_b);
    const sourceRef = this.toolTableRef(sourceA, databaseA, tableA, args.schema_a);
    const changes = [];
    const alter = [];
    for (const column of right.columns) {
      const other = leftMap.get(column.name);
      if (!other) {
        changes.push({ type: 'add', column: column.name, target: column.type });
        alter.push(`ALTER TABLE ${targetRef} ADD COLUMN ${this.toolColumnDefinition(sourceB, column)};`);
      }
    }
    for (const column of left.columns) {
      if (!rightMap.has(column.name)) {
        changes.push({ type: 'drop', column: column.name, source: column.type });
        alter.push(`ALTER TABLE ${targetRef} DROP COLUMN ${quoteIdent(sourceB.kind, column.name)};`);
      }
    }
    for (const column of left.columns) {
      const other = rightMap.get(column.name);
      if (!other) continue;
      const typeChanged = String(column.type || '').toLowerCase() !== String(other.type || '').toLowerCase();
      const nullChanged = Boolean(column.nullable) !== Boolean(other.nullable);
      const defaultChanged = String(column.defaultValue ?? '') !== String(other.defaultValue ?? '');
      if (!typeChanged && !nullChanged && !defaultChanged) continue;
      changes.push({
        type: 'modify', column: column.name, source: column.type, target: other.type,
        sourceNullable: column.nullable, targetNullable: other.nullable,
        sourceDefault: column.defaultValue ?? null, targetDefault: other.defaultValue ?? null
      });
      if (sourceB.kind === 'mysql') {
        alter.push(`ALTER TABLE ${targetRef} MODIFY COLUMN ${this.toolColumnDefinition(sourceB, other)};`);
      } else {
        if (typeChanged) {
          alter.push(`ALTER TABLE ${targetRef} ALTER COLUMN ${quoteIdent('postgresql', column.name)} TYPE ${other.type};`);
        }
        if (nullChanged) {
          alter.push(`ALTER TABLE ${targetRef} ALTER COLUMN ${quoteIdent('postgresql', column.name)} ${other.nullable ? 'DROP' : 'SET'} NOT NULL;`);
        }
        if (defaultChanged) {
          if (other.defaultValue === null || other.defaultValue === undefined || String(other.defaultValue) === '') {
            alter.push(`ALTER TABLE ${targetRef} ALTER COLUMN ${quoteIdent('postgresql', column.name)} DROP DEFAULT;`);
          } else {
            alter.push(`ALTER TABLE ${targetRef} ALTER COLUMN ${quoteIdent('postgresql', column.name)} SET DEFAULT ${other.defaultValue};`);
          }
        }
      }
    }
    const indexChanges = [];
    const leftIndexNames = new Set(leftIndexes.indexes.map(index => index.name));
    const indexKey = index => `${index.unique ? 'u' : 'n'}\0${index.columns.join('\0')}`;
    for (const index of leftIndexes.indexes) {
      if (index.primary) continue;
      const targetIndex = rightIndexes.indexes.find(item => item.name === index.name);
      if (!targetIndex) {
        indexChanges.push({ type: 'add', name: index.name, columns: index.columns, unique: index.unique });
      } else if (indexKey(index) !== indexKey(targetIndex)) {
        indexChanges.push({ type: 'modify', name: index.name, source: index, target: targetIndex });
      }
    }
    for (const index of rightIndexes.indexes) {
      if (index.primary) continue;
      if (!leftIndexNames.has(index.name)) indexChanges.push({ type: 'drop', name: index.name, columns: index.columns, unique: index.unique });
    }
    for (const change of indexChanges) {
      if (change.type === 'add' || change.type === 'modify') {
        const index = change.type === 'modify' ? change.source : change;
        if (change.type === 'modify') {
          if (sourceB.kind === 'mysql') {
            alter.push(`DROP INDEX ${quoteIdent('mysql', change.name)} ON ${targetRef};`);
          } else {
            alter.push(`DROP INDEX ${quotePath('postgresql', [rightIndexes.schema, change.name])};`);
          }
        }
        alter.push(`CREATE ${index.unique ? 'UNIQUE ' : ''}INDEX ${quoteIdent(sourceB.kind, index.name)} ON ${targetRef} (${index.columns.map(column => quoteIdent(sourceB.kind, column)).join(', ')});`);
      } else {
        if (sourceB.kind === 'mysql') {
          alter.push(`DROP INDEX ${quoteIdent('mysql', change.name)} ON ${targetRef};`);
        } else {
          alter.push(`DROP INDEX ${quotePath('postgresql', [rightIndexes.schema, change.name])};`);
        }
      }
    }
    const constraintChanges = [];
    const rightConstraintNames = new Set(rightConstraints.constraints.map(item => item.name));
    for (const constraint of leftConstraints.constraints) {
      const target = rightConstraints.constraints.find(item => item.name === constraint.name);
      if (!target) {
        constraintChanges.push({ type: 'add', name: constraint.name, constraintType: constraint.type, definition: constraint.definition });
        if (sourceB.kind === 'postgresql' && constraint.definition) {
          alter.push(`ALTER TABLE ${targetRef} ADD CONSTRAINT ${quoteIdent('postgresql', constraint.name)} ${constraint.definition};`);
        }
      } else if (constraint.definition && target.definition && constraint.definition !== target.definition) {
        constraintChanges.push({ type: 'modify', name: constraint.name, source: constraint.definition, target: target.definition });
      }
    }
    for (const constraint of rightConstraints.constraints) {
      if (!leftConstraints.constraints.some(item => item.name === constraint.name)) {
        constraintChanges.push({ type: 'drop', name: constraint.name, constraintType: constraint.type, definition: constraint.definition });
      }
    }
    // Keep the generated preview executable in a safe order: indexes and
    // constraints that disappear first, then columns, then new indexes and
    // constraints. This avoids dropping a column before an index that uses it.
    const ordered = [];
    const seenAlter = new Set();
    const take = predicate => {
      for (const statement of alter) {
        if (!predicate(statement) || seenAlter.has(statement)) continue;
        seenAlter.add(statement);
        ordered.push(statement);
      }
    };
    take(statement => /^DROP INDEX\b/.test(statement));
    take(statement => /^ALTER TABLE\b[\s\S]*\bDROP COLUMN\b/.test(statement));
    take(statement => /^ALTER TABLE\b[\s\S]*\b(?:ADD|MODIFY) COLUMN\b/.test(statement));
    take(statement => /^CREATE\b[\s\S]*\bINDEX\b/.test(statement));
    take(statement => /^ALTER TABLE\b[\s\S]*\bADD CONSTRAINT\b/.test(statement));
    take(() => true);

    return plainJson({
      ok: true,
      from: { source: sourceA.name, database: databaseA, table: sourceRef },
      to: { source: sourceB.name, database: databaseB, table: targetRef },
      tables: { source: tableA, target: tableB },
      columns: { source: left.columns.length, target: right.columns.length },
      indexes: { source: leftIndexes.indexes, target: rightIndexes.indexes },
      constraints: { source: leftConstraints.constraints, target: rightConstraints.constraints },
      changes,
      indexChanges,
      constraintChanges,
      alter: ordered,
      notes: [
        '比较列名、类型、可空性、默认值、索引和约束名称/定义。',
        '索引差异会生成 CREATE/DROP INDEX；PostgreSQL 约束差异会生成 ADD CONSTRAINT。MySQL 约束仅报告差异，不自动生成 ADD/DROP。',
        'ALTER 已按“先删索引、再删列、再加/改列、最后建索引/约束”排序，但仍为预览，未执行；执行前请人工审查。'
      ]
    });
  }

  registerAgentTools() {
    const tools = this.ctx.get?.('tools');
    if (!tools || typeof tools.register !== 'function') return;
    const output = this.toolOutput();
    const register = definition => {
      try {
        // The executor invokes a stored `execute` function without a receiver.
        const bound = { ...definition, execute: definition.execute.bind(this) };
        this.toolDisposers.push(tools.register(bound));
      } catch (error) {
        this.logger?.warn?.(`DshDataCat: tool ${definition.name} registration failed: ${messageOf(error)}`);
      }
    };

    register({
      name: 'db_list_sources',
      description: 'List configured DshDataCat data sources and their access policies. Use this before db_query when the source name is unknown.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
      output,
      isConcurrencySafe: () => true,
      async execute() {
        return plainJson({
          ok: true,
          sources: this.store.list().map(source => ({
            id: source.id,
            name: source.name,
            kind: source.kind,
            database: source.database,
            hasPassword: source.hasPassword,
            policy: source.policy
          }))
        });
      }
    });

    register({
      name: 'db_list_tables',
      description: 'List databases for a data source, or tables when database is supplied. Applies the source allowlist policy.',
      parameters: {
        type: 'object',
        properties: {
          source: { type: 'string', description: 'Source name or id; optional when only one source exists.' },
          database: { type: 'string', description: 'Database/index name. Omit to list databases.' }
        },
        additionalProperties: false
      },
      output,
      isConcurrencySafe: () => true,
      async execute(args) {
        const source = this.resolveToolSource(args?.source);
        const policy = this.policyFor(source);
        const adapter = this.manager.get(source);
        if (!args?.database) {
          const databases = (await adapter.listDatabases())
            .filter(item => policy.allowedDatabases.length === 0 || policy.allowedDatabases.includes(item.name));
          return plainJson({ ok: true, source: source.name, databases });
        }
        const database = String(args.database);
        this.assertDatabase(source, database);
        return plainJson({ ok: true, source: source.name, database, tables: await adapter.listTables(database) });
      }
    });

    register({
      name: 'db_describe',
      description: 'Describe columns and primary keys for one MySQL/PostgreSQL table.',
      parameters: {
        type: 'object',
        properties: {
          source: { type: 'string', description: 'Source name or id; optional when only one source exists.' },
          database: { type: 'string', description: 'Database name.' },
          table: { type: 'string', description: 'Table name; PostgreSQL may use schema.table.' },
          schema: { type: 'string', description: 'Optional PostgreSQL schema.' }
        },
        required: ['database', 'table'],
        additionalProperties: false
      },
      output,
      isConcurrencySafe: () => true,
      async execute(args) {
        const source = this.resolveToolSource(args?.source);
        if (source.kind !== 'mysql' && source.kind !== 'postgresql') {
          throw new DshCatError('unsupported_describe', 'db_describe 仅支持 MySQL/PostgreSQL。');
        }
        const database = String(args.database);
        this.assertDatabase(source, database);
        const adapter = this.manager.get(source);
        let columns;
        if (source.kind === 'postgresql') {
          const raw = String(args.table);
          const dot = raw.indexOf('.');
          const schema = typeof args.schema === 'string' && args.schema
            ? args.schema
            : dot > 0 ? raw.slice(0, dot) : 'public';
          const table = dot > 0 ? raw.slice(dot + 1) : raw;
          columns = await adapter.columns(database, schema, table);
          return plainJson({ ok: true, source: source.name, database, schema, table, columns });
        }
        columns = await adapter.columns(database, String(args.table));
        return plainJson({ ok: true, source: source.name, database, table: String(args.table), columns });
      }
    });

    register({
      name: 'db_query',
      description: 'Run SQL against a configured DshDataCat source. Read statements use an engine-level read-only transaction; writes trigger the Agent approval seam and are audited. Returns risk, column metadata, and capped rows.',
      parameters: {
        type: 'object',
        properties: {
          source: { type: 'string', description: 'Source name or id; optional when only one source exists.' },
          database: { type: 'string', description: 'Database name.' },
          sql: { type: 'string', description: 'SQL text. Multiple statements are split and executed in one transaction.' }
        },
        required: ['database', 'sql'],
        additionalProperties: false
      },
      output,
      isConcurrencySafe: () => false,
      timeoutMs: 120_000,
      async execute(args, exec) {
        const source = this.resolveToolSource(args?.source);
        const database = String(args.database);
        const sql = String(args.sql || '');
        this.assertDatabase(source, database);
        const value = await this.dispatch({
          action: 'sql.execute',
          id: source.id,
          database,
          sql,
          confirmed: false
        }, { signal: exec.signal, agent: exec.agent });
        if (value?.requiresConfirmation) {
          throw new DshCatError('approval_required', '该 SQL 为写入操作，但当前没有可用的审批通道，未执行。');
        }
        return plainJson({ ok: true, source: source.name, database, ...value });
      }
    });

    register({
      name: 'db_schema_diff',
      description: 'Compare tables, columns, indexes, and constraints between two MySQL or PostgreSQL sources and generate reviewed ALTER statements. Omit table_a to compare only table names. Adds/drops indexes; PostgreSQL constraint differences can generate ADD/DROP CONSTRAINT, while MySQL constraints are reported for review. Never executes the ALTER.',
      parameters: {
        type: 'object',
        properties: {
          source_a: { type: 'string', description: 'Source name or id for the reference side.' },
          database_a: { type: 'string', description: 'Database for the reference side.' },
          table_a: { type: 'string', description: 'Table for the reference side; omit to compare table names only.' },
          schema_a: { type: 'string', description: 'Optional PostgreSQL schema for table_a.' },
          source_b: { type: 'string', description: 'Source name or id for the target side.' },
          database_b: { type: 'string', description: 'Database for the target side.' },
          table_b: { type: 'string', description: 'Target table; defaults to table_a.' },
          schema_b: { type: 'string', description: 'Optional PostgreSQL schema for table_b.' }
        },
        required: ['source_a', 'database_a', 'source_b', 'database_b'],
        additionalProperties: false
      },
      output,
      isConcurrencySafe: () => true,
      async execute(args) {
        return this.schemaDiffTool(args);
      }
    });

    register({
      name: 'db_data_dictionary',
      description: 'Generate a Markdown data dictionary for one table or up to 50 tables in a MySQL/PostgreSQL database and write it inside the Agent workspace. Returns a workspace-relative path suitable for the present tool.',
      parameters: {
        type: 'object',
        properties: {
          source: { type: 'string', description: 'Source name or id; optional when only one source exists.' },
          database: { type: 'string', description: 'Database name.' },
          table: { type: 'string', description: 'Optional table; omit to include up to 50 tables.' },
          schema: { type: 'string', description: 'Optional PostgreSQL schema.' },
          filename: { type: 'string', description: 'Workspace-relative Markdown filename.' }
        },
        required: ['database'],
        additionalProperties: false
      },
      output,
      isConcurrencySafe: () => false,
      async execute(args, exec) {
        const source = this.resolveToolSource(args?.source);
        if (source.kind !== 'mysql' && source.kind !== 'postgresql') {
          throw new DshCatError('unsupported_describe', 'db_data_dictionary 仅支持 MySQL/PostgreSQL。');
        }
        const database = String(args.database);
        this.assertDatabase(source, database);
        const tables = [];
        let truncated = false;
        if (args.table) {
          const info = await this.toolColumns(source, database, args.table, args.schema);
          tables.push(info);
        } else {
          const listed = await this.manager.get(source).listTables(database);
          for (const item of listed.slice(0, 50)) {
            tables.push(await this.toolColumns(source, database, item.name, item.schema));
          }
          truncated = listed.length > 50;
        }
        const escape = value => String(value ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
        const lines = [
          `# Data dictionary — ${source.name} / ${database}`,
          '',
          `Generated: ${new Date().toISOString()}`,
          ''
        ];
        for (const table of tables) {
          lines.push(`## ${table.schema ? `${table.schema}.` : ''}${table.table}`, '');
          lines.push('| Column | Type | Nullable | Key | Default |', '| --- | --- | --- | --- | --- |');
          for (const column of table.columns) {
            lines.push(`| ${escape(column.name)} | ${escape(column.type)} | ${column.nullable ? 'YES' : 'NO'} | ${column.primaryKey ? 'PK' : ''} | ${escape(column.defaultValue)} |`);
          }
          lines.push('');
        }
        if (truncated) lines.push('> Output truncated to the first 50 tables.', '');
        const requested = typeof args.filename === 'string' && args.filename.trim()
          ? args.filename.trim()
          : `dshdata-dictionary-${String(database).replace(/[^A-Za-z0-9._-]+/g, '_')}.md`;
        const written = await this.writeToolWorkspaceFile(exec, requested, `${lines.join('\n')}\n`);
        return plainJson({
          ok: true,
          source: source.name,
          database,
          path: written.path,
          format: 'markdown',
          tables: tables.length,
          truncated,
          bytes: written.bytes
        });
      }
    });

    register({
      name: 'db_export',
      description: 'Run one read-only SQL query and write its first result set as a CSV or XLSX file inside the Agent workspace. Returns a workspace-relative path suitable for the present tool. Use db_query for non-export queries.',
      parameters: {
        type: 'object',
        properties: {
          source: { type: 'string', description: 'Source name or id; optional when only one source exists.' },
          database: { type: 'string', description: 'Database name.' },
          sql: { type: 'string', description: 'Read-only SQL text.' },
          filename: { type: 'string', description: 'Workspace-relative filename, e.g. reports/orders.xlsx.' },
          format: { type: 'string', enum: ['csv', 'xlsx'], description: 'Output format; inferred from the filename extension when omitted.' }
        },
        required: ['database', 'sql'],
        additionalProperties: false
      },
      output,
      isConcurrencySafe: () => false,
      timeoutMs: 120_000,
      async execute(args, exec) {
        const source = this.resolveToolSource(args?.source);
        const database = String(args.database);
        const sql = String(args.sql || '');
        this.assertDatabase(source, database);
        const value = await this.dispatch({
          action: 'sql.execute',
          id: source.id,
          database,
          sql,
          confirmed: false
        }, { signal: exec.signal, agent: exec.agent, denyWrites: true });
        const set = Array.isArray(value.sets) ? value.sets[0] : undefined;
        if (!set || !Array.isArray(set.columns) || set.columns.length === 0) {
          throw new DshCatError('empty_export', '查询没有可导出的结果集。');
        }
        const requestedName = typeof args.filename === 'string' && args.filename.trim()
          ? args.filename.trim()
          : `dshdata-${new Date().toISOString().replace(/[:.]/g, '-')}`;
        const format = args.format === 'xlsx' || (!args.format && /\.xlsx$/i.test(requestedName)) ? 'xlsx' : 'csv';
        let requested = requestedName;
        if (format === 'xlsx' && !/\.xlsx$/i.test(requested)) requested = `${requested.replace(/\.csv$/i, '')}.xlsx`;
        if (format === 'csv' && !/\.csv$/i.test(requested)) requested = `${requested.replace(/\.xlsx$/i, '')}.csv`;
        const payload = format === 'xlsx' ? resultToXlsx(set) : resultToCsv(set);
        const written = await this.writeToolWorkspaceFile(exec, requested, payload);
        return plainJson({
          ok: true,
          source: source.name,
          database,
          path: written.path,
          format,
          rows: set.rowCount ?? set.rows.length,
          bytes: written.bytes
        });
      }
    });
  }

  /** Load local data-source metadata before the route becomes callable. */
  async init() {
    await this.store.load();
    this.registerAgentTools();
    this.credentialOff = this.ctx.on?.('credentials/record-updated', key => {
      const value = String(key || '');
      if (!value.startsWith('dshcat/')) return;
      const sourceId = value.slice('dshcat/'.length);
      if (!this.store.sources.some(source => source.id === sourceId)) return;
      void this.store.refreshPassword(sourceId)
        .then(() => this.manager.invalidate(sourceId))
        .catch(error => this.logger?.warn?.(`DshDataCat: credential refresh failed: ${messageOf(error)}`));
    });
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
      const value = await this.dispatch(body, { signal: request.signal });
      return this.json({ ok: true, value, durationMs: Date.now() - started });
    } catch (error) {
      const internal = !(error instanceof DshCatError) || ['database_error', 'internal_error', 'unknown_error'].includes(error.code);
      const detail = messageOf(error);
      if (internal) {
        this.logger?.warn?.(`DshDataCat: API ${body?.action || 'unknown'} failed: ${detail}`);
        return this.json({ ok: false, error: { code: 'internal_error', message: '操作失败，请查看 Host 日志。' } });
      }
      return this.json({ ok: false, error: { code: error.code, message: error.message } });
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
  async dispatch(body, options = {}) {
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
        const policy = this.policyFor(source);
        const databases = (await adapter.listDatabases())
          .filter(database => policy.allowedDatabases.length === 0 || policy.allowedDatabases.includes(database.name));
        return { source: this.publicSource(source.id), info, databases };
      }
      case 'databases.list': {
        const source = this.store.get(String(body.id || ''));
        const adapter = this.manager.get(source);
        const policy = this.policyFor(source);
        const databases = (await adapter.listDatabases())
          .filter(database => policy.allowedDatabases.length === 0 || policy.allowedDatabases.includes(database.name));
        return { databases };
      }
      case 'databases.create': {
        const source = this.store.get(String(body.id || ''));
        if (source.kind !== 'mysql' && source.kind !== 'postgresql') {
          throw new DshCatError('unsupported_database_management', '当前数据源不支持新建数据库。');
        }
        this.assertWritable(source);
        const name = sanitizeDatabaseName(body.name);
        this.assertDatabase(source, name);
        const adapter = this.manager.get(source);
        return { name, database: await adapter.createDatabase(name) };
      }
      case 'databases.drop': {
        const source = this.store.get(String(body.id || ''));
        if (source.kind !== 'mysql' && source.kind !== 'postgresql') {
          throw new DshCatError('unsupported_database_management', '当前数据源不支持删除数据库。');
        }
        this.assertWritable(source);
        const name = sanitizeDatabaseName(body.name);
        this.assertDatabase(source, name);
        const adapter = this.manager.get(source);
        return { name, database: await adapter.dropDatabase(name) };
      }
      case 'tables.list': {
        const source = this.store.get(String(body.id || ''));
        const database = String(body.database || '');
        if (!database) throw new DshCatError('invalid_database', '请选择数据库。');
        this.assertDatabase(source, database);
        return { tables: await this.manager.get(source).listTables(database) };
      }
      case 'table.data': {
        const source = this.store.get(String(body.id || ''));
        const database = String(body.database || '');
        const table = String(body.table || '');
        if (!database) throw new DshCatError('invalid_database', '请选择数据库。');
        if (!table) throw new DshCatError('invalid_table', '请选择表。');
        this.assertDatabase(source, database);
        const policy = this.policyFor(source);
        const result = await this.manager.get(source).tableData(database, table, {
          schema: typeof body.schema === 'string' ? body.schema : undefined,
          page: body.page,
          pageSize: Math.min(Number(body.pageSize) || 100, policy.maxRows),
          filters: sanitizeFilters(body.filters),
          sort: sanitizeSort(body.sort),
          timeoutMs: policy.statementTimeoutMs
        });
        return { table: { database, schema: body.schema, name: table }, ...result };
      }
      case 'table.count': {
        const source = this.store.get(String(body.id || ''));
        if (source.kind !== 'mysql' && source.kind !== 'postgresql') {
          throw new DshCatError('unsupported_count', '当前数据源不支持精确行数统计。');
        }
        const database = String(body.database || '');
        const table = String(body.table || '');
        if (!database) throw new DshCatError('invalid_database', '请选择数据库。');
        if (!table) throw new DshCatError('invalid_table', '请选择表。');
        this.assertDatabase(source, database);
        const policy = this.policyFor(source);
        return {
          count: await this.manager.get(source).countRows(database, table, {
            schema: typeof body.schema === 'string' ? body.schema : undefined,
            filters: sanitizeFilters(body.filters),
            timeoutMs: policy.statementTimeoutMs
          })
        };
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
        this.assertDatabase(source, database);
        this.assertWritable(source);
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
      case 'table.previewEdits': {
        const source = this.store.get(String(body.id || ''));
        if (source.kind !== 'mysql' && source.kind !== 'postgresql') {
          throw new DshCatError('unsupported_cell_edit', '当前数据源不支持单元格编辑。');
        }
        const database = String(body.database || '');
        const table = String(body.table || '');
        if (!database) throw new DshCatError('invalid_database', '请选择数据库。');
        if (!table) throw new DshCatError('invalid_table', '请选择表。');
        this.assertDatabase(source, database);
        const edits = sanitizeEdits(body.edits);
        const statements = await this.manager.get(source).previewCellEdits(database, table, edits, {
          schema: typeof body.schema === 'string' ? body.schema : undefined
        });
        return { statements, editCount: edits.length };
      }
      case 'table.commitEdits': {
        const source = this.store.get(String(body.id || ''));
        if (source.kind !== 'mysql' && source.kind !== 'postgresql') {
          throw new DshCatError('unsupported_cell_edit', '当前数据源不支持单元格编辑。');
        }
        const database = String(body.database || '');
        const table = String(body.table || '');
        if (!database) throw new DshCatError('invalid_database', '请选择数据库。');
        if (!table) throw new DshCatError('invalid_table', '请选择表。');
        this.assertDatabase(source, database);
        this.assertWritable(source);
        const policy = this.policyFor(source);
        const edits = sanitizeEdits(body.edits);
        // Agent-initiated commits use the official one-shot approval seam;
        // browser commits are already an explicit user action in the pending
        // changes panel.
        await this.requestAgentApproval('write', options.signal, options.agent);
        const started = Date.now();
        try {
          const result = await this.manager.get(source).commitCellEdits(database, table, edits, {
            schema: typeof body.schema === 'string' ? body.schema : undefined,
            timeoutMs: policy.statementTimeoutMs
          });
          await this.audit.append({
            action: 'table.commitEdits',
            sourceId: source.id,
            kind: source.kind,
            database,
            table,
            risk: 'write',
            statementCount: result.statements,
            approved: true,
            outcome: 'ok',
            durationMs: Date.now() - started,
            statementHash: hashStatement(JSON.stringify(edits))
          });
          return { commit: result };
        } catch (error) {
          await this.audit.append({
            action: 'table.commitEdits',
            sourceId: source.id,
            kind: source.kind,
            database,
            table,
            risk: 'write',
            statementCount: edits.length,
            approved: true,
            outcome: 'error',
            errorCode: error?.code || 'error',
            durationMs: Date.now() - started,
            statementHash: hashStatement(JSON.stringify(edits))
          });
          throw error;
        }
      }
      case 'table.export': {
        const source = this.store.get(String(body.id || ''));
        const database = String(body.database || '');
        const table = String(body.table || '');
        const mode = body.mode === 'data' ? 'data' : 'structure';
        if (!database) throw new DshCatError('invalid_database', '请选择数据库。');
        if (!table) throw new DshCatError('invalid_table', '请选择表。');
        this.assertDatabase(source, database);
        const adapter = this.manager.get(source);
        const ref = pgTableName(source.kind, table, body.schema);
        return { export: await adapter.exportTable(database, ref, mode) };
      }
      case 'sql.execute': {
        const source = this.store.get(String(body.id || ''));
        const policy = this.policyFor(source);
        const database = String(body.database || '');
        const sql = typeof body.sql === 'string' ? body.sql.trim() : '';
        if (!sql) throw new DshCatError('empty_sql', '请先输入 SQL。');
        if (sql.length > MAX_SQL_LENGTH) throw new DshCatError('sql_too_long', 'SQL 语句过长。');
        this.assertDatabase(source, database);
        const statements = source.kind === 'mysql' || source.kind === 'postgresql'
          ? splitStatements(source.kind, sql)
          : [sql];
        if (statements.length === 0) throw new DshCatError('empty_sql', '请先输入 SQL。');
        if (statements.length > MAX_STATEMENTS) {
          throw new DshCatError('too_many_statements', `一次最多执行 ${MAX_STATEMENTS} 条语句。`);
        }
        const risks = statements.map(statement => {
          const protectedDb = protectedDatabaseDrop(source.kind, statement);
          if (protectedDb) throw new DshCatError('protected_database', `系统数据库 ${protectedDb} 不允许删除。`);
          const protectedSchema = protectedSchemaDrop(source.kind, statement);
          if (protectedSchema) throw new DshCatError('protected_schema', `受保护的结构 ${protectedSchema} 不允许删除。`);
          if (source.kind === 'elasticsearch' && statement.trim().startsWith('{')) return 'read';
          return classifyRisk(source.kind, statement);
        });
        const risk = risks.includes('danger') ? 'danger' : risks.includes('write') ? 'write' : 'read';
        if (policy.readOnly && risk !== 'read') {
          throw new DshCatError('read_only_source', '该数据源策略不允许执行写入语句。');
        }
        if (options.denyWrites === true && risk !== 'read') {
          throw new DshCatError('read_only_required', '该操作只允许执行只读查询。');
        }
        let approved = body.confirmed === true;
        if (risk !== 'read' && !approved) {
          // Agent-initiated calls use the official one-shot approval seam. A
          // human browser call has no initiating Agent; it uses the in-page
          // confirmation flow below, which is already authenticated.
          approved = await this.requestAgentApproval(risk, options.signal, options.agent);
          if (!approved) return { requiresConfirmation: true, risk, statement: sql, statements };
        }
        const readOnly = risk === 'read';
        const started = Date.now();
        try {
          const adapter = this.manager.get(source);
          const result = await adapter.execute(database, statements, {
            readOnly,
            timeoutMs: policy.statementTimeoutMs,
            signal: options.signal
          });
          const maxRows = Math.min(MAX_RESULT_ROWS, policy.maxRows);
          let setIndex = 0;
          const sets = (Array.isArray(result.sets) ? result.sets : []).flatMap(set => {
            const rows = Array.isArray(set.rows) ? set.rows : [];
            const selected = rows.length <= maxRows
              ? set
              : { ...set, rows: rows.slice(0, maxRows), truncated: true };
            return [{ ...selected, index: setIndex++ }];
          });
          await this.audit.append({
            action: 'sql.execute',
            sourceId: source.id,
            kind: source.kind,
            database,
            risk,
            statementCount: statements.length,
            readOnly,
            approved,
            outcome: 'ok',
            durationMs: Date.now() - started,
            statementHash: hashStatement(statements.join(';\n'))
          });
          this.logger?.info?.(`DshDataCat: executed ${source.kind} statement for source ${source.id} (${risk})`);
          return { risk, statement: sql, statements, readOnly, ...result, sets };
        } catch (error) {
          await this.audit.append({
            action: 'sql.execute',
            sourceId: source.id,
            kind: source.kind,
            database,
            risk,
            statementCount: statements.length,
            readOnly,
            approved,
            outcome: 'error',
            errorCode: error?.code || 'error',
            durationMs: Date.now() - started,
            statementHash: hashStatement(statements.join(';\n'))
          });
          throw error;
        }
      }
      case 'ai.chat': {
        const source = this.store.get(String(body.id || ''));
        const database = String(body.database || '');
        const table = typeof body.table === 'string' ? body.table : '';
        const schemaHint = typeof body.schema === 'string' ? body.schema : '';
        if (!database) throw new DshCatError('invalid_database', '请先选择数据库，再让 AI 执行查询。');
        this.assertDatabase(source, database);
        const policy = this.policyFor(source);
        if (!policy.aiEnabled) throw new DshCatError('ai_disabled', '该数据源策略已禁用 AI 助手。');
        const messages = Array.isArray(body.messages) ? body.messages.slice(-20) : [];
        if (messages.length === 0) throw new DshCatError('invalid_messages', '请输入问题。');
        const adapter = this.manager.get(source);
        const focusTable = table ? pgTableName(source.kind, table, schemaHint) : '';
        const schema = sanitizeAiSchema(await adapter.aiSchema(database, focusTable), policy.aiSampleData);
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
    for (const dispose of this.toolDisposers.splice(0)) {
      try {
        dispose();
      } catch {
        // A tool may already have been unloaded.
      }
    }
    this.credentialOff?.();
    await this.manager.closeAll();
  }
}
