import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { DshCatApi } from '../lib/api.js';
import { normalizePolicy } from '../lib/store.js';

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

async function setup() {
  const home = await mkdtemp(path.join(os.tmpdir(), 'dshdata-api-'));
  process.env.DSH_HOME = home;
  const credentials = fakeCredentials();
  const logs = [];
  const api = new DshCatApi({
    credentials,
    logger: { warn: message => logs.push(String(message)), info() {} },
    get() { return undefined; }
  });
  await api.init();
  const source = await api.store.save({
    kind: 'mysql',
    name: 'local',
    url: 'mysql://user@localhost:3306/app'
  });
  return { home, api, source, logs, credentials };
}

function body(action, source, extra = {}) {
  return JSON.stringify({ action, id: source.id, ...extra });
}

async function post(api, action, source, extra = {}) {
  const response = await api.handle(new Request('http://127.0.0.1/api/dshcat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: body(action, source, extra)
  }));
  return response.json();
}

test('read SQL executes as one read-only batch with policy caps and audit', async () => {
  const { home, api, source } = await setup();
  try {
    const calls = [];
    api.manager.get = () => ({
      async execute(database, statements, options) {
        calls.push({ database, statements, options });
        return { sets: [{ rows: [[1], [2]], columns: [{ name: 'id' }], rowCount: 2 }] };
      }
    });
    api.store.sources[0].policy = normalizePolicy({ maxRows: 1 });
    const result = await post(api, 'sql.execute', source, { database: 'app', sql: 'SELECT 1; SELECT 2' });
    assert.equal(result.ok, true);
    assert.equal(result.value.risk, 'read');
    assert.equal(result.value.readOnly, true);
    assert.equal(result.value.sets[0].rows.length, 1);
    assert.equal(result.value.sets[0].truncated, true);
    assert.deepEqual(calls[0].statements, ['SELECT 1', 'SELECT 2']);
    assert.equal(calls[0].options.readOnly, true);
    assert.equal(calls[0].options.timeoutMs, 15_000);
    const audit = await readFile(path.join(home, 'dshcat', 'audit.jsonl'), 'utf8');
    const entry = JSON.parse(audit.trim());
    assert.equal(entry.risk, 'read');
    assert.equal(entry.statementCount, 2);
    assert.equal(entry.outcome, 'ok');
    assert.equal(JSON.stringify(entry).includes('SELECT'), false);
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});

test('write SQL requires confirmation, respects readOnly policy, and audits approval', async () => {
  const { home, api, source } = await setup();
  try {
    let calls = 0;
    api.manager.get = () => ({
      async execute() {
        calls++;
        return { sets: [] };
      }
    });
    const first = await post(api, 'sql.execute', source, { database: 'app', sql: 'UPDATE app.users SET name = 1' });
    assert.equal(first.ok, true);
    assert.equal(first.value.requiresConfirmation, true);
    assert.equal(calls, 0);
    const confirmed = await post(api, 'sql.execute', source, {
      database: 'app', sql: 'UPDATE app.users SET name = 1', confirmed: true
    });
    assert.equal(confirmed.ok, true);
    assert.equal(confirmed.value.readOnly, false);
    assert.equal(calls, 1);

    api.store.sources[0].policy = normalizePolicy({ readOnly: true });
    const blocked = await post(api, 'sql.execute', source, {
      database: 'app', sql: 'UPDATE app.users SET name = 2', confirmed: true
    });
    assert.equal(blocked.ok, false);
    assert.equal(blocked.error.code, 'read_only_source');
    const audit = (await readFile(path.join(home, 'dshcat', 'audit.jsonl'), 'utf8')).trim().split('\n').map(line => JSON.parse(line));
    assert.equal(audit.at(-1).approved, true);
    assert.equal(audit.at(-1).readOnly, false);
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});

test('database allowlists are enforced before adapter calls', async () => {
  const { home, api, source } = await setup();
  try {
    api.store.sources[0].policy = normalizePolicy({ allowedDatabases: ['app_dev'] });
    let called = 0;
    api.manager.get = () => ({ async listTables() { called++; return []; } });
    const result = await post(api, 'tables.list', source, { database: 'app_prod' });
    assert.equal(result.ok, false);
    assert.equal(result.error.code, 'database_not_allowed');
    assert.equal(called, 0);
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});

test('table data accepts whitelisted sort and exact count requests', async () => {
  const { home, api, source } = await setup();
  try {
    let received;
    api.manager.get = () => ({
      async tableData(database, table, options) {
        received = { database, table, options };
        return { columns: [{ name: 'id', primaryKey: true }], rows: [[1]], page: 1, pageSize: 100, hasMore: false, sort: options.sort, estimatedTotal: 10, totalIsEstimate: true, orderStable: true };
      },
      async countRows(database, table, options) {
        received = { database, table, options };
        return { total: 42, filtered: true, durationMs: 3 };
      }
    });
    const sorted = await post(api, 'table.data', source, {
      database: 'app', table: 'users', sort: [{ field: 'id', dir: 'desc' }, { field: 'id', dir: 'asc' }]
    });
    assert.equal(sorted.ok, true);
    assert.deepEqual(received.options.sort, [{ field: 'id', dir: 'desc' }]);
    const counted = await post(api, 'table.count', source, {
      database: 'app', table: 'users', filters: [{ field: 'id', op: 'eq', value: '1' }]
    });
    assert.equal(counted.ok, true);
    assert.equal(counted.value.count.total, 42);
    assert.equal(received.options.filters.length, 1);
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});

test('staged edits preview SQL and commit through one adapter batch', async () => {
  const { home, api, source } = await setup();
  try {
    let previewCalls = 0;
    let commitCalls = 0;
    api.manager.get = () => ({
      async previewCellEdits(database, table, edits, options) {
        previewCalls++;
        assert.equal(table, 'users');
        assert.equal(edits.length, 1);
        assert.equal(edits[0].column, 'name');
        return [{ index: 0, column: 'name', sql: "UPDATE `app`.`users` SET `name` = 'Ada' WHERE `id` = 1 LIMIT 1;" }];
      },
      async commitCellEdits(database, table, edits, options) {
        commitCalls++;
        assert.equal(edits.length, 1);
        assert.equal(edits[0].value, 'Ada');
        assert.equal(edits[0].pk.id, 1);
        return { updated: 1, statements: 1 };
      }
    });
    const payload = { database: 'app', table: 'users', edits: [{ column: 'name', value: 'Ada', pk: { id: 1 } }] };
    const preview = await post(api, 'table.previewEdits', source, payload);
    assert.equal(preview.ok, true);
    assert.match(preview.value.statements[0].sql, /UPDATE/);
    assert.equal(previewCalls, 1);
    const commit = await post(api, 'table.commitEdits', source, payload);
    assert.equal(commit.ok, true);
    assert.equal(commit.value.commit.updated, 1);
    assert.equal(commitCalls, 1);
    const audit = (await readFile(path.join(home, 'dshcat', 'audit.jsonl'), 'utf8')).trim().split('\n').map(line => JSON.parse(line));
    assert.ok(audit.some(entry => entry.action === 'table.commitEdits' && entry.outcome === 'ok'));
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});

test('driver errors are logged but not exposed to the browser', async () => {
  const { home, api, source, logs } = await setup();
  try {
    api.manager.get = () => ({
      async execute() { throw new Error('connect ECONNREFUSED admin:secret@db.internal:3306'); }
    });
    const result = await post(api, 'sql.execute', source, { database: 'app', sql: 'SELECT 1' });
    assert.equal(result.ok, false);
    assert.equal(result.error.code, 'internal_error');
    assert.equal(result.error.message.includes('db.internal'), false);
    assert.ok(logs.some(line => line.includes('db.internal')));
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});
