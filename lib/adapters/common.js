/** Shared adapter helpers. */

import { DshCatError } from '../errors.js';
import { normalizeValue } from '../sql.js';

/** Parse a positive integer with a default and clamp. */
export function positiveInt(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(number)));
}

/** Parse a page number (1-based). */
export function pageNumber(value) {
  return positiveInt(value, 1, 1, 1_000_000);
}

/** Parse a page size; the UI default is 100. */
export function pageSize(value) {
  return positiveInt(value, 100, 10, 500);
}

/** Reject identifiers that a driver cannot use safely as a bare segment. */
export function assertIdentifier(value, label) {
  if (typeof value !== 'string' || value === '') throw new DshCatError('invalid_identifier', `缺少${label}。`);
  if (value.includes('\0')) throw new DshCatError('invalid_identifier', `${label}包含无效字符。`);
  return value;
}

/** Split a PostgreSQL qualified table label into schema and relation. */
export function parsePgTable(table, schemaHint) {
  if (typeof schemaHint === 'string' && schemaHint !== '') return { schema: schemaHint, table };
  if (typeof table === 'string' && table.includes('.')) {
    const at = table.indexOf('.');
    return { schema: table.slice(0, at), table: table.slice(at + 1) };
  }
  return { schema: 'public', table };
}

/** Map a driver row object to an ordered array using field metadata. */
export function rowArray(row, fields) {
  if (Array.isArray(row)) return row.map(item => normalizeValue(item));
  if (!row || typeof row !== 'object') return [];
  return fields.map(field => normalizeValue(row[field.name]));
}

/** Normalize a whole row of objects into arrays, with stable column metadata. */
export function normalizeRows(rows, fields) {
  const columns = fields.map(field => ({
    name: field.name,
    type: columnTypeName(field)
  }));
  return {
    columns,
    rows: rows.map(row => rowArray(row, fields))
  };
}

/** Driver-neutral type label for display. */
export function columnTypeName(field) {
  if (!field) return 'unknown';
  if (typeof field.dataType === 'string') return field.dataType;
  if (typeof field.dataTypeID === 'number') return `oid:${field.dataTypeID}`;
  if (typeof field.columnType === 'number') return `type:${field.columnType}`;
  return 'value';
}

/** Convert a count from any driver representation. */
export function toCount(value) {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) && number > 0 ? Math.trunc(number) : 0;
}

/** Build the standard page result. */
export function pageResult(columns, rows, page, size, hasMore, startedAt, extra = {}) {
  return {
    columns,
    rows,
    page,
    pageSize: size,
    hasMore,
    durationMs: Date.now() - startedAt,
    ...extra
  };
}

/** A row count that may be absent for engines without cheap counts. */
export function tableLabel(name, type) {
  return { name, label: name, type };
}

/** Strip a BOM and whitespace from an SQL string. */
export function cleanSql(value) {
  return String(value ?? '').replace(/^\uFEFF/, '').trim();
}

/** If a data source is edited while an adapter lives, the manager closes it. */
export function unchangedSource(source, other) {
  return source && other && source.id === other.id && source.updatedAt === other.updatedAt;
}
