import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { MySqlAdapter } from '../lib/adapters/mysql.js';
import { PostgresAdapter } from '../lib/adapters/postgresql.js';
import {
  classifyRisk, protectedDatabaseDrop, protectedSchemaDrop, splitStatements
} from '../lib/sql.js';
import { DEFAULT_POLICY, normalizePolicy, SourceStore } from '../lib/store.js';

function fakeCredentials() {
  const records = new Map();
  return {
    records,
    async readRecord(key) { return records.get(key); },
    async modifyRecord(key, mutate) {
      const next = await mutate(records.get(key));
      if (next === undefined) records.delete(key);
      else records.set(key, next);
      return next;
    },
    async deleteRecord(key) { records.delete(key); }
  };
}

test('splitStatements keeps quoted semicolons and dollar bodies intact', () => {
  const pg = [
    "SELECT ';' AS a;",
    '-- a semicolon ; in a comment',
    'SELECT $$a;b$$;',
    'DO $tag$ BEGIN PERFORM 1; END $tag$;'
  ].join('\n');
  const statements = splitStatements('postgresql', pg);
  assert.equal(statements.length, 3);
  assert.match(statements[1], /\$\$a;b\$\$/);
  assert.match(statements[2], /DO \$tag\$/);
  assert.equal(splitStatements('mysql', 'SELECT 1; SELECT "a;b"; SELECT 2').length, 3);
});

test('risk classification never labels adversarial writes as read', () => {
  const cases = [
    'WITH x AS (DELETE FROM audit RETURNING *) SELECT * FROM x',
    '/*!50000 DROP TABLE users */',
    'EXPLAIN ANALYZE DELETE FROM users',
    "SELECT LOAD_FILE('/etc/passwd')",
    "COPY users TO PROGRAM 'curl evil'",
    'DROP SCHEMA public CASCADE',
    'SELECT * INTO OUTFILE "/tmp/x" FROM users'
  ];
  for (const sql of cases) assert.notEqual(classifyRisk('postgresql', sql), 'read', sql);
  assert.equal(classifyRisk('postgresql', 'SELECT id FROM users WHERE id = $1'), 'read');
});

test('SELECT aliases containing mutation words stay read-only', () => {
  assert.equal(classifyRisk('mysql', 'SELECT @@version_comment AS comment, 1 AS `set`, 2 AS `delete`'), 'read');
  assert.equal(classifyRisk('postgresql', 'WITH x AS (SELECT 1 AS comment) SELECT * FROM x'), 'read');
  assert.equal(classifyRisk('mysql', 'SELECT 1 AS update_value, 2 AS created_at'), 'read');
});

test('read-only metadata statements are not mistaken for writes', () => {
  for (const sql of [
    'SHOW CREATE TABLE `agent_chat_conversations`',
    'SHOW CREATE DATABASE `dr_research`',
    'SHOW FULL COLUMNS FROM `agent_chat_conversations`',
    'DESCRIBE `agent_chat_conversations`',
    'DESC `agent_chat_conversations`',
    'EXPLAIN SELECT * FROM agent_chat_conversations',
    'EXPLAIN ANALYZE SELECT * FROM agent_chat_conversations',
    'VALUES (1)',
    'TABLE app.users'
  ]) {
    assert.equal(classifyRisk('mysql', sql), 'read', sql);
  }
  assert.equal(classifyRisk('mysql', 'EXPLAIN ANALYZE DELETE FROM app.users'), 'danger');
  assert.equal(classifyRisk('mysql', 'EXPLAIN ANALYZE WITH x AS (DELETE FROM app.users RETURNING *) SELECT * FROM x'), 'danger');
});

test('system database and schema drops are protected', () => {
  assert.equal(protectedDatabaseDrop('mysql', 'DROP DATABASE `mysql`'), 'mysql');
  assert.equal(protectedDatabaseDrop('mysql', 'DROP DATABASE `__recycle_bin__`'), '__recycle_bin__');
  assert.equal(protectedDatabaseDrop('postgresql', 'DROP DATABASE IF EXISTS "postgres"'), 'postgres');
  assert.equal(protectedDatabaseDrop('mysql', "SELECT 'DROP DATABASE mysql'"), null);
  assert.equal(protectedSchemaDrop('postgresql', 'DROP SCHEMA public CASCADE'), 'public');
  assert.equal(protectedSchemaDrop('mysql', 'DROP SCHEMA sys'), 'sys');
});

test('policy normalization narrows invalid values to safe bounds', () => {
  const policy = normalizePolicy({
    readOnly: true,
    statementTimeoutMs: 10,
    maxRows: 99_999,
    allowedDatabases: [' app_dev ', 'app_dev', 3],
    aiEnabled: false
  });
  assert.equal(policy.readOnly, true);
  assert.equal(policy.statementTimeoutMs, 1_000);
  assert.equal(policy.maxRows, 10_000);
  assert.deepEqual(policy.allowedDatabases, ['app_dev']);
  assert.equal(policy.aiEnabled, false);
  assert.equal(policy.aiSampleData, false);
  assert.equal(normalizePolicy({}).maxRows, DEFAULT_POLICY.maxRows);
});

test('datasource passwords move to ctx.credentials and never reach JSON', async () => {
  const home = await mkdtemp(path.join(os.tmpdir(), 'dshdata-credentials-'));
  process.env.DSH_HOME = home;
  try {
    const credentials = fakeCredentials();
    const store = new SourceStore({ credentials });
    await store.load();
    const source = await store.save({
      kind: 'mysql',
      name: 'local',
      url: 'mysql://user:urlsecret@localhost:3306/app',
      username: 'user',
      password: 'fieldsecret'
    });
    assert.equal(source.hasPassword, true);
    assert.equal(source.policy.maxRows, 2_000);
    const raw = await readFile(path.join(home, 'dshcat', 'datasources.json'), 'utf8');
    assert.equal(raw.includes('fieldsecret'), false);
    assert.equal(raw.includes('urlsecret'), false);
    assert.equal(raw.includes('password'), false);
    assert.equal(credentials.records.size, 1);
    assert.equal(credentials.records.get(`dshcat/${source.id}`).payload.password, 'fieldsecret');
    assert.equal(store.get(source.id).password, 'fieldsecret');
    assert.equal(store.list()[0].hasPassword, true);

    const reloaded = new SourceStore({ credentials });
    await reloaded.load();
    assert.equal(reloaded.list()[0].hasPassword, true);
    assert.equal(reloaded.get(source.id).password, 'fieldsecret');

    await reloaded.save({ id: source.id, kind: 'mysql', url: 'mysql://user@localhost:3306/app', clearPassword: true });
    assert.equal(credentials.records.size, 0);
    assert.equal(reloaded.list()[0].hasPassword, false);
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});

test('legacy plaintext passwords migrate on load', async () => {
  const home = await mkdtemp(path.join(os.tmpdir(), 'dshdata-migrate-'));
  process.env.DSH_HOME = home;
  try {
    const directory = path.join(home, 'dshcat');
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, 'datasources.json'), JSON.stringify({
      version: 1,
      sources: [{
        id: '22222222-2222-4222-8222-222222222222',
        kind: 'postgresql',
        name: 'legacy',
        url: 'postgresql://localhost:5432/app',
        username: 'postgres',
        password: 'legacy-secret',
        database: 'app'
      }]
    }), 'utf8');
    const credentials = fakeCredentials();
    const store = new SourceStore({ credentials });
    await store.load();
    assert.equal(credentials.records.size, 1);
    assert.equal(store.get('22222222-2222-4222-8222-222222222222').password, 'legacy-secret');
    assert.equal(store.list()[0].hasPassword, true);
    const raw = await readFile(path.join(directory, 'datasources.json'), 'utf8');
    assert.equal(raw.includes('legacy-secret'), false);
    assert.equal(raw.includes('"password"'), false);
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});

test('MySQL tableData applies sort and stable no-primary-key ordering', async () => {
  const adapter = new MySqlAdapter({
    id: 'm3', kind: 'mysql', url: 'mysql://u:p@localhost:3306/app', updatedAt: 'x'
  }, {});
  const sqls = [];
  adapter.columns = async () => [
    { name: 'id', type: 'int', primaryKey: true },
    { name: 'name', type: 'varchar(20)', primaryKey: false }
  ];
  adapter.estimatedRows = async () => 12;
  adapter.pool = {
    async query(input) {
      sqls.push(input.sql);
      return [[[1, 'Ada']], [{ name: 'id' }, { name: 'name' }]];
    }
  };
  const page = await adapter.tableData('app', 'users', {
    page: 1, pageSize: 100, sort: [{ field: 'name', dir: 'desc' }]
  });
  assert.match(sqls[0], /ORDER BY `name` DESC, `id` ASC/);
  assert.equal(page.estimatedTotal, 12);
  assert.equal(page.orderStable, true);

  adapter.columns = async () => [
    { name: 'name', type: 'varchar(20)', primaryKey: false },
    { name: 'email', type: 'varchar(50)', primaryKey: false }
  ];
  sqls.length = 0;
  const noPk = await adapter.tableData('app', 'mail', { page: 1, pageSize: 100 });
  assert.match(sqls[0], /ORDER BY `name` ASC, `email` ASC/);
  assert.equal(noPk.orderHint, 'no_primary_key');
});

test('column metadata is cached for 10 seconds and invalidated on demand', async () => {
  const adapter = new MySqlAdapter({
    id: 'm6', kind: 'mysql', url: 'mysql://u:p@localhost:3306/app', updatedAt: 'x'
  }, {});
  let queries = 0;
  adapter.pool = {
    async query() {
      queries++;
      return [[{
        name: 'id', dataType: 'int', columnType: 'int', nullable: 'NO', columnKey: 'PRI', defaultValue: null, extra: ''
      }], []];
    }
  };
  const first = await adapter.columns('app', 'users');
  const second = await adapter.columns('app', 'users');
  assert.equal(queries, 1);
  assert.equal(first[0].name, 'id');
  assert.equal(second[0].name, 'id');
  adapter.invalidateMetadata();
  await adapter.columns('app', 'users');
  assert.equal(queries, 2);
});

test('MySQL staged edits preview and commit inside one transaction', async () => {
  const adapter = new MySqlAdapter({
    id: 'm4', kind: 'mysql', url: 'mysql://u:p@localhost:3306/app', updatedAt: 'x'
  }, {});
  adapter.columns = async () => [
    { name: 'id', type: 'int', dataType: 'int', primaryKey: true, nullable: false },
    { name: 'name', type: 'varchar(20)', dataType: 'varchar', primaryKey: false, nullable: true }
  ];
  const calls = [];
  const connection = {
    async query(input) {
      calls.push(input);
      if (typeof input === 'string') return [{}, []];
      return [{ affectedRows: 1 }, []];
    },
    release() { calls.push('release'); }
  };
  adapter.pool = { async getConnection() { return connection; } };
  const edits = [{ column: 'name', value: 'Ada', pk: { id: 1 } }];
  const preview = await adapter.previewCellEdits('app', 'users', edits);
  assert.match(preview[0].sql, /UPDATE `app`\.`users` SET `name` = 'Ada' WHERE `id` = 1 LIMIT 1;/);
  const result = await adapter.commitCellEdits('app', 'users', edits, { timeoutMs: 15_000 });
  assert.equal(result.updated, 1);
  assert.ok(calls.some(call => call === 'START TRANSACTION'));
  assert.ok(calls.some(call => typeof call === 'object' && /UPDATE/.test(call.sql)));
  assert.ok(calls.includes('COMMIT'));
  assert.equal(calls.at(-1), 'release');
});

test('MySQL staged edits roll back the whole batch when one update fails', async () => {
  const adapter = new MySqlAdapter({
    id: 'm5', kind: 'mysql', url: 'mysql://u:p@localhost:3306/app', updatedAt: 'x'
  }, {});
  adapter.columns = async () => [
    { name: 'id', type: 'int', dataType: 'int', primaryKey: true, nullable: false },
    { name: 'name', type: 'varchar(20)', dataType: 'varchar', primaryKey: false, nullable: true }
  ];
  const calls = [];
  const connection = {
    async query(input) {
      calls.push(input);
      if (typeof input === 'object' && /UPDATE/.test(input.sql)) {
        const failure = new Error('constraint violation');
        failure.code = 'ER_CHECK_CONSTRAINT_VIOLATED';
        throw failure;
      }
      return [{}, []];
    },
    release() { calls.push('release'); }
  };
  adapter.pool = { async getConnection() { return connection; } };
  await assert.rejects(
    () => adapter.commitCellEdits('app', 'users', [{ column: 'name', value: 'Ada', pk: { id: 1 } }]),
    /constraint violation/
  );
  assert.ok(calls.includes('START TRANSACTION'));
  assert.ok(calls.includes('ROLLBACK'));
  assert.equal(calls.at(-1), 'release');
});

test('PostgreSQL tableData uses ctid for a no-primary-key table', async () => {
  const adapter = new PostgresAdapter({
    id: 'p3', kind: 'postgresql', url: 'postgresql://u:p@localhost:5432/app', updatedAt: 'x'
  }, {});
  const sqls = [];
  adapter.tableMeta = async () => ({ relkind: 'r', estimatedTotal: 7 });
  adapter.columns = async () => [
    { name: 'name', type: 'text', primaryKey: false },
    { name: 'email', type: 'text', primaryKey: false }
  ];
  adapter.poolFor = () => ({
    async query(input) {
      sqls.push(input.text);
      return { rows: [['Ada', 'ada@example.com']], fields: [{ name: 'name' }, { name: 'email' }] };
    }
  });
  const page = await adapter.tableData('app', 'public.people', { page: 1, pageSize: 100 });
  assert.match(sqls[0], /ORDER BY ctid ASC/);
  assert.equal(page.orderHint, 'no_primary_key');
  assert.equal(page.estimatedTotal, 7);
});

test('PostgreSQL staged edits preview and commit inside one transaction', async () => {
  const adapter = new PostgresAdapter({
    id: 'p4', kind: 'postgresql', url: 'postgresql://u:p@localhost:5432/app', updatedAt: 'x'
  }, {});
  adapter.columns = async () => [
    { name: 'id', type: 'integer', primaryKey: true, nullable: false },
    { name: 'name', type: 'text', primaryKey: false, nullable: true }
  ];
  const calls = [];
  const client = {
    async query(input) {
      calls.push(input);
      if (typeof input === 'string') return { rowCount: null, rows: [] };
      return { rowCount: 1, rows: [{ '?column?': 1 }] };
    },
    release(mode) { calls.push(`release:${mode}`); }
  };
  adapter.poolFor = () => ({ async connect() { return client; } });
  const edits = [{ column: 'name', value: 'Ada', pk: { id: 1 } }];
  const preview = await adapter.previewCellEdits('app', 'public.users', edits);
  assert.match(preview[0].sql, /UPDATE "public"\."users" SET "name" = 'Ada' WHERE "id" = 1;/);
  const result = await adapter.commitCellEdits('app', 'public.users', edits, { timeoutMs: 15_000 });
  assert.equal(result.updated, 1);
  assert.ok(calls.includes('BEGIN'));
  assert.ok(calls.some(call => typeof call === 'object' && /SET "name" = \$1/.test(call.text)));
  assert.ok(calls.includes('COMMIT'));
  assert.ok(calls.some(call => call === 'release:undefined'));
});

test('MySQL execute uses a read-only transaction, per-query timeout, and rollback', async () => {
  const calls = [];
  const adapter = new MySqlAdapter({
    id: 'm1', kind: 'mysql', url: 'mysql://u:p@localhost:3306/app', updatedAt: 'x'
  }, {});
  const connection = {
    released: 0,
    destroyed: 0,
    async query(input) {
      calls.push(input);
      if (typeof input === 'string' && /^START TRANSACTION|^SET SESSION|^ROLLBACK|^COMMIT|^USE/.test(input)) return [{}, []];
      assert.equal(input.timeout, 15_000);
      return [[{ value: 1 }], [{ name: 'value', type: 3 }]];
    },
    release() { this.released++; },
    destroy() { this.destroyed++; }
  };
  adapter.pool = { async getConnection() { return connection; } };
  adapter.resultSets = () => [{ columns: [{ name: 'value' }], rows: [[1]], rowCount: 1 }];
  const result = await adapter.execute('app', ['SELECT 1', 'SELECT 2'], { readOnly: true, timeoutMs: 15_000 });
  assert.equal(result.sets.length, 2);
  assert.ok(calls.some(call => String(call).includes('START TRANSACTION READ ONLY')));
  assert.ok(calls.some(call => String(call).includes('ROLLBACK')));
  assert.equal(connection.released, 1);
  assert.equal(connection.destroyed, 0);
});

test('MySQL query timeout destroys the connection instead of returning it to the pool', async () => {
  const adapter = new MySqlAdapter({
    id: 'm2', kind: 'mysql', url: 'mysql://u:p@localhost:3306/app', updatedAt: 'x'
  }, {});
  const connection = {
    released: 0,
    destroyed: 0,
    async query(input) {
      if (typeof input === 'object' && input.sql.startsWith('SELECT')) {
        const failure = new Error('Query inactivity timeout');
        failure.code = 'PROTOCOL_SEQUENCE_TIMEOUT';
        throw failure;
      }
      return [{}, []];
    },
    release() { this.released++; },
    destroy() { this.destroyed++; }
  };
  adapter.pool = { async getConnection() { return connection; } };
  await assert.rejects(
    () => adapter.execute('app', ['SELECT SLEEP(600)'], { readOnly: true, timeoutMs: 15_000 }),
    error => error.code === 'query_timeout'
  );
  assert.equal(connection.destroyed, 1);
  assert.equal(connection.released, 0);
});

test('PostgreSQL statement timeout discards the client and reports query_timeout', async () => {
  const adapter = new PostgresAdapter({
    id: 'p2', kind: 'postgresql', url: 'postgresql://u:p@localhost:5432/app', updatedAt: 'x'
  }, {});
  const client = {
    released: null,
    async query(input) {
      if (String(input).startsWith('SELECT')) {
        const failure = new Error('canceling statement due to statement timeout');
        failure.code = '57014';
        throw failure;
      }
      return { fields: [], rows: [], rowCount: null };
    },
    release(mode) { this.released = mode; }
  };
  adapter.poolFor = () => ({ async connect() { return client; } });
  await assert.rejects(
    () => adapter.execute('app', ['SELECT pg_sleep(600)'], { readOnly: true, timeoutMs: 15_000 }),
    error => error.code === 'query_timeout'
  );
  assert.equal(client.released, true);
});

test('PostgreSQL execute uses a read-only transaction and statement timeout', async () => {
  const calls = [];
  const adapter = new PostgresAdapter({
    id: 'p1', kind: 'postgresql', url: 'postgresql://u:p@localhost:5432/app', updatedAt: 'x'
  }, {});
  const client = {
    released: null,
    async query(input) {
      calls.push(input);
      if (String(input).startsWith('BEGIN') || String(input).startsWith('SET LOCAL') || String(input) === 'ROLLBACK' || String(input) === 'COMMIT') {
        return { fields: [], rows: [], rowCount: null };
      }
      return { fields: [{ name: 'value', dataTypeID: 23 }], rows: [{ value: 1 }], rowCount: 1 };
    },
    release(mode) { this.released = mode; }
  };
  adapter.poolFor = () => ({ async connect() { return client; } });
  const result = await adapter.execute('app', ['SELECT 1', 'SELECT 2'], { readOnly: true, timeoutMs: 15_000 });
  assert.equal(result.sets.length, 2);
  assert.ok(calls.includes('BEGIN TRANSACTION READ ONLY'));
  assert.ok(calls.some(call => String(call).includes('SET LOCAL statement_timeout = 15000')));
  assert.ok(calls.includes('ROLLBACK'));
  assert.equal(client.released, undefined);
});
