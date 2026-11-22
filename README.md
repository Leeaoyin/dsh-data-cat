# DshDataCat

**English** | [简体中文](README.zh.md)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20-339933?logo=node.js&logoColor=white)](#requirements)
[![DSH Plugin](https://img.shields.io/badge/DSH-plugin-5B6CFF)](#installation)
[![Databases](https://img.shields.io/badge/Databases-MySQL%20%7C%20PostgreSQL%20%7C%20Redis%20%7C%20Elasticsearch-4479A1)](#support-matrix)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](#contributing)

DshDataCat is a DeepSeek Harness (DSH) plugin that adds a Navicat-style database workspace to the sidebar. It runs in DSH Web and DeepSeek Harness Desktop (`deepseek-harness-app`) and supports MySQL, PostgreSQL, Redis, and Elasticsearch. It includes sortable table browsing with stable pagination, staged transactional cell editing, database management, SQL Playground, UI and Agent exports, schema diff previews, and a page-scoped AI assistant.

Database connections are made by the DSH Host. The browser calls the Host through DSH's authenticated same-origin session.

## Screenshots

<table>
  <tr>
    <td width="50%" align="center">
      <a href="img/img1.png"><img src="img/img1.png" alt="SQL Playground with the AI assistant" width="100%"></a><br>
      <sub>SQL Playground with the AI assistant</sub>
    </td>
    <td width="50%" align="center">
      <a href="img/img2.png"><img src="img/img2.png" alt="AI assistant generating a read-only query" width="100%"></a><br>
      <sub>AI copilot generating and running a read-only query</sub>
    </td>
  </tr>
  <tr>
    <td width="50%" align="center">
      <a href="img/img3.png"><img src="img/img3.png" alt="New data source dialog with database types" width="100%"></a><br>
      <sub>Connect MySQL, PostgreSQL, Redis, or Elasticsearch</sub>
    </td>
    <td width="50%" align="center">
      <a href="img/img4.png"><img src="img/img4.png" alt="Type-aware cell editor" width="100%"></a><br>
      <sub>Type-aware cell editing with primary-key context</sub>
    </td>
  </tr>
  <tr>
    <td width="50%" align="center">
      <a href="img/img5.png"><img src="img/img5.png" alt="Generated SQL and query results in the playground" width="100%"></a><br>
      <sub>Generated SQL and query results in the playground</sub>
    </td>
    <td width="50%" align="center">
      <a href="img/img6.png"><img src="img/img6.png" alt="Table browser with filters, field types, and pagination" width="100%"></a><br>
      <sub>Table browser with filters, field types, and pagination</sub>
    </td>
  </tr>
</table>

<sub>Screenshots predate the rename and the latest sorting/pending-edit/Agent-tool additions; some UI labels still show the previous name.</sub>

## Highlights

- Sort by any real column, with a primary-key tiebreaker; PostgreSQL `ctid` / MySQL full-column ordering for tables without a primary key.
- Estimated row counts plus an exact-count button, with a 10-second column-metadata cache invalidated after DDL.
- Pending cell-edit batches with generated SQL preview, one-transaction commit, and whole-batch rollback.
- DSH Agent tools for query, metadata discovery, CSV/XLSX export, Markdown data dictionaries, and reviewed schema diff/ALTER previews.

## Features

### Connect and browse

- Add MySQL, PostgreSQL, Redis, and Elasticsearch sources with a connection URL, username, password, and optional default database.
- Browse `instance → database → table`; click a database to expand its tables and click again to collapse.
- Click a column header to sort; use the adjacent funnel icon to target that column in the filter bar. Page through rows with 50, 100, or 200 rows per page.
- Filter tables by name and inspect column types and primary-key information.

### Database management

- Create a database on MySQL/PostgreSQL connections.
  - MySQL: `utf8mb4` with `utf8mb4_unicode_ci`.
  - PostgreSQL: `UTF8`.
- Drop the current database, but only after typing the exact confirmation phrase `确认删除<database-name>`.
- System databases are protected in the UI, the Host API, and SQL Playground:
  - MySQL: `mysql`, `information_schema`, `performance_schema`, `sys`, and Alibaba Cloud RDS `__recycle_bin__`
  - PostgreSQL: `postgres`, `template0`, `template1`

### Table data

- Field filters and pagination. Click a column header to cycle ascending → descending → default; click its funnel icon to seed a filter.
- Sort fields are whitelisted against the table's real columns, and primary-key columns are appended as a stable tiebreaker.
- Tables with a primary key order by that key. PostgreSQL tables without one page by `ctid`; MySQL tables without one use a full-column order. Both show a warning because concurrent writes can still affect offset paging.
- The header shows an estimated row count (`TABLE_ROWS` / `reltuples`) when no filter is active, with an **Exact count** button. Exact counts honor the current filter.
- Column metadata is cached per source/database/table for 10 seconds and invalidated after DDL.
- Double-click a cell in a MySQL/PostgreSQL table to stage an edit:
  - Type-aware editors for numbers, booleans, MySQL enums, dates/times, JSON/arrays, and text.
  - Nullable columns support explicitly setting `NULL`.
  - The editor shows the field type, primary-key marker, and current instance/database/table.
  - Edits first enter a pending-changes panel; the panel shows the exact `UPDATE` SQL that will run.
  - **Commit changes** runs the whole batch in one transaction and rolls back all of it on failure. **Discard** restores the last loaded rows.
  - Primary-key columns cannot be edited in pending mode. Tables without a primary key, views, binary fields, and Redis/Elasticsearch virtual tables remain read-only.

### SQL Playground

- Runs against the current instance and database. With a selection, only the selection runs; otherwise the whole editor runs.
- `Ctrl/Cmd + Enter` runs the statement. The result pane can be resized or minimized.
- SQL syntax highlighting is rendered by an overlay that stays in sync with the native textarea, preserving selection, typing, paste, and IME behavior.
- MySQL/PostgreSQL support a Format button that formats the selection, or the whole editor when there is no selection.
- SQL is split on top-level semicolons; each statement is classified and executed separately inside one transaction, never handed to the driver as one raw multi-statement string. MySQL runs with `multipleStatements: false`.
- Read-only batches use an engine-level read-only transaction (`START TRANSACTION READ ONLY` / `BEGIN TRANSACTION READ ONLY`) with a per-source statement timeout (`15s` by default). Risk classification remains a UX hint, not the safety boundary.
- Risk checks require confirmation before writes, DDL, and Redis delete commands. Result sets are capped by the source policy (2,000 by default).
- Results remember the source instance/database and warn when they are stale for the current context.

### AI assistant

- The AI entry point and chat window appear only inside the DshDataCat page, never on other conversation pages.
- The window can be moved by its title bar and resized from its four corners; on narrow screens it becomes a bottom sheet inside the panel.
- Reads the current database schema to generate queries and explain risk. Sample values are excluded by default; when `aiSampleData` is explicitly enabled, fields such as password, token, email, phone, and secret are masked by column name.
- Read-only queries run automatically and open SQL Playground for results. Writes and other high-risk statements require confirmation.
- When SQL execution fails, the error is added to the AI conversation history as an execution-error event so you can ask follow-up repair questions.
- Uses the current default DSH model.

### Exports

- MySQL/PostgreSQL: export table DDL, or DDL plus data.
- Redis: export a key/value command script.
- Elasticsearch: export mapping JSON or NDJSON.
- Export limits: 50,000 SQL rows, 1,000 Redis keys, and 10,000 Elasticsearch documents. Exported files include a note when a limit is reached.

## Support matrix

| Source | Browse tables/data | Filter and paginate | Cell editing | Create/drop databases | SQL execution | Export |
| --- | --- | --- | --- | --- | --- | --- |
| MySQL | Yes | Yes | Tables with a primary key | Yes | Yes | DDL / DDL + data |
| PostgreSQL | Yes | Yes | Tables with a primary key | Yes | Yes | DDL / DDL + data |
| Redis | Keys virtual table | Key/type filter, pagination | No | No | Redis commands | Command script |
| Elasticsearch | Indices / Documents | Pagination | No | No | SQL / JSON DSL | Mapping / NDJSON |

## Agent tools

DshDataCat registers the same Host operations as DSH tools (DSH tool names use underscores):

- `db_list_sources` — source names, kinds, default databases, password status, and policies.
- `db_list_tables` — databases, or tables for one database; the source allowlist is applied.
- `db_describe` — columns, types, nullability, defaults, and primary keys for MySQL/PostgreSQL.
- `db_query` — split/classify/execute SQL with the same policy, read-only transaction, timeout, result cap, approval, and audit path as the UI.
- `db_data_dictionary` — generate a Markdown data dictionary for one table or up to 50 tables and write it into the Agent workspace.
- `db_export` — run a read-only query and write its first result set as UTF-8 CSV or XLSX into the Agent workspace; returns a relative path that can be passed to `present`.
- `db_schema_diff` — compare table names, columns, indexes, and constraints between two same-engine sources and emit reviewed `ALTER` statements. Omit `table_a` for table-set comparison. Index differences generate `CREATE/DROP INDEX`; PostgreSQL constraint differences can generate `ADD/DROP CONSTRAINT`; MySQL constraints are reported for review. It never executes the ALTER. Triggers are not covered yet.

When only one source exists, `source` may be omitted. `db_query` writes go through the Agent approval seam when an Agent initiated the call; without an available approval channel the call fails instead of writing silently. Exported files stay inside the Agent workspace and path traversal is rejected.

## Requirements

- A DSH Web or DeepSeek Harness Desktop version with Cordis plugin support.
- Node.js 20 or newer on the DSH Host.
- pnpm when installing or developing from source.
- The plugin bundles its database drivers: `mysql2`, `pg`, `redis`, and `@elastic/elasticsearch`, plus `xlsx` for XLSX export.

## Installation

### DeepSeek Harness Desktop (`deepseek-harness-app`)

This is the recommended method for the official DeepSeek Harness Desktop app. No standalone `dsh` command is required.

1. Install and open DeepSeek Harness Desktop.
2. Prepare the plugin directory:

   ```sh
   git clone <repository-url> dshcat
   cd dshcat
   pnpm install
   ```

   If you downloaded a source archive instead, extract it and run `pnpm install` inside the extracted `dshcat` directory.

3. In DeepSeek Harness Desktop, open **Plugins** and click **Add plugin**.
4. Select the `dshcat` directory containing `package.json` and `cordis.patch.yml`, then wait for installation.
5. Confirm that **DshDataCat** is enabled. Enable it from the plugin list if necessary.
6. Start a new session, or refresh/restart the app. **DshDataCat** appears in the sidebar.

Local directory installs are linked, so **do not move or delete the `dshcat` directory** after installation. If you move it, remove and re-add the plugin in Plugins. Run `pnpm install` in the directory after updating dependencies.

### Local directory installation (general)

For DSH Web or a manually managed profile, use **Plugins → Add plugin** and select this directory. The internal bundle name remains `@local/dshcat`; the visible plugin name is **DshDataCat**. Open **DshDataCat** from the sidebar after starting a new session or refreshing the page.

### Updating during development

`client.js` is loaded directly by the DSH Web client; there is no build step.

1. Edit `client.js`, files under `lib/`, or other plugin files.
2. Reload the DshDataCat plugin, or disable and enable it in Plugins.
3. Refresh DSH so the browser loads the new client bundle.

## Quick start

1. Open **DshDataCat → Add data source** in the sidebar.
2. Choose a source type and enter a connection URL:

   ```text
   mysql://localhost:3306/app
   postgresql://localhost:5432/postgres
   redis://localhost:6379/0
   http://localhost:9200
   ```

   Username and password are optional. For Redis, `/0` is the database index, not a path.

3. Save and connect, then choose a database and table.
4. Run SQL in SQL Playground, or open **AI assistant** from the page header and describe what you need.

> Redis uses port **6379** by default. If the connection is refused, confirm that the service is running and the port is correct. DshDataCat now reports the target address and the underlying connection error.

## Data and security

- Non-secret source metadata (URL without credentials, username, default database, policy) is stored on the Host at:

  ```text
  DSH_HOME/dshcat/datasources.json
  ```

  `DSH_HOME` defaults to `~/.dsh`.

- Passwords and URL credentials are stored as opaque records in the DSH credential store (`ctx.credentials`), addressed as `dshcat/<source-id>`. `datasources.json` contains only the source reference, never a plaintext password. Legacy passwords are migrated on the first load and removed from the JSON file.
- The credentials local provider still writes a same-user-readable file (typically `~/.dsh/.credentials.yaml`). This moves secrets out of plugin data and prevents accidental sync/commit leaks; it is not protection against malware running as the same operating-system user.
- The browser receives sanitized source metadata plus a `hasPassword` status; it never receives the password or the credential value.
- AI requests use schema-only context by default. Enabling `aiSampleData` is explicit, and sensitive fields are masked by column name before leaving the Host. Redis key/value previews and Elasticsearch sample documents follow the same policy.
- SQL execution is split and classified per statement. MySQL/PostgreSQL read-only batches use engine-level read-only transactions and statement timeouts; `multipleStatements` is disabled for MySQL.
- Dangerous read-side functions such as `LOAD_FILE`, PostgreSQL file-read functions, `COPY ... PROGRAM`, and `INTO OUTFILE` are classified as danger; `DROP SCHEMA public CASCADE` and protected database drops are rejected or require explicit approval.
- Writes, DDL, and Redis delete commands require confirmation before execution. When a request is initiated by an Agent, the Host uses `ctx.approval` for the one-shot decision; a browser-initiated write uses the authenticated in-page confirmation.
- Every SQL execution writes a secret-free JSONL audit entry to `DSH_HOME/dshcat/audit.jsonl` (source, database, risk, timing, approval state, statement hash). Driver error details are logged on the Host and a generic public error is returned to the browser.

## Per-source policy

Each source can carry a non-secret policy in `datasources.json`:

```json
{
  "readOnly": false,
  "statementTimeoutMs": 15000,
  "maxRows": 2000,
  "allowedDatabases": [],
  "aiEnabled": true,
  "aiSampleData": false
}
```

| Field | Default | Effect |
| --- | --- | --- |
| `readOnly` | `false` | Rejects SQL writes, database management, and cell updates |
| `statementTimeoutMs` | `15000` | Per-statement timeout passed to the engine/driver (1–120s) |
| `maxRows` | `2000` | Caps SQL result sets and table page size (1–10,000) |
| `allowedDatabases` | `[]` | Empty means all; otherwise hides and blocks other databases |
| `aiEnabled` | `true` | Disables the AI assistant for this source |
| `aiSampleData` | `false` | Allows masked sample values in AI context |

Policies are enforced centrally in the Host dispatcher rather than in each adapter.

## Project structure

```text
dshcat/
├── index.js                Host entry: registers /api/dshcat
├── lib/
│   ├── api.js              API dispatch, policy, pending edits, Agent tools, export/schema diff
│   ├── ai.js               AI prompt, schema context, model call
│   ├── audit.js            Secret-free JSONL execution audit
│   ├── store.js            Source metadata + ctx.credentials references/policies
│   ├── sql.js              Identifiers, filters, risk checks, statement splitter
│   ├── url.js              URL parsing, sanitization, connection info
│   └── adapters/           MySQL / PostgreSQL / Redis / Elasticsearch adapters
├── client.js               Web client bundle (UI, store, SQL editor, AI panel)
├── locale/                 Plugin-list metadata (English and Chinese)
├── img/                    README screenshots
├── icon.svg                Sidebar icon
├── cordis.patch.yml        DSH bundle insertion point
├── scripts/check.mjs       Syntax check for all JavaScript files
├── tests/                  Node tests for safety, table layer, and staged edits
├── package.json
├── LICENSE                 MIT license
├── README.md               English README (default)
└── README.zh.md            Chinese README
```

- `client.js` is a single browser bundle using `React.createElement` and plain CSS. It intentionally has no build chain.
- UI copy lives in the `COPY` table in `client.js`; plugin-list metadata lives in `locale/*.json`. New features may require updating both.
- Adapters implement a shared contract and are registered in `lib/adapters/index.js`.
- The browser never imports database drivers; all driver dependencies are used by the Host half.

## Development

```sh
pnpm install
pnpm check
pnpm test
```

`pnpm check` runs `node --check` on every JavaScript file in the repository. `pnpm test` covers statement splitting, adversarial risk classification, protected schemas/databases, policy normalization, credential migration, read-only transactions, query timeouts, table ordering, metadata caching, and staged-edit preview/commit/rollback.

The repository does not include live database integration tests (no testcontainers yet). When changing an adapter, run a manual regression against temporary MySQL, PostgreSQL, Redis, and Elasticsearch instances covering connect, query, staged edit, export, and Agent-tool flows. `db_export` XLSX output additionally depends on the bundled `xlsx` package.

Before committing:

- Do not add `node_modules/`, `.tmp*`, logs, `.env`, or `datasources.json`.
- Keep `client.js` loadable by the browser without Node built-ins (`fs`, `path`, etc.).
- Use DSH theme tokens (`--dsw-*`) for UI styling instead of hard-coded light/dark colors.
- Update this README's security notes when changing credential or source behavior.

## Known limitations

- Cell editing and database creation/deletion are available only for MySQL/PostgreSQL. Cell editing requires a primary key; binary fields and primary-key columns are read-only in pending mode.
- Pending changes live in the current page state and are lost on refresh/plugin reload. Paging, sorting, filtering, and switching tables are blocked until the batch is committed or discarded. Concurrent changes to the same row can still race; the commit transaction does not use optimistic row versions yet.
- The exact-count query can be expensive on very large tables; the estimate avoids that cost until requested.
- PostgreSQL DDL export includes columns, defaults, and primary keys, but not complete foreign keys, triggers, or custom type definitions.
- SQL results are capped by the source policy (2,000 by default). Truncation is applied after the driver returns rows, not via a streaming cursor; very large result sets still consume Host memory before truncation. Export limits are separate.
- MySQL record writes run in one transaction, but MySQL DDL can implicitly commit; a failed DDL batch can leave earlier DDL applied. PostgreSQL DDL is transactional.
- Redis and Elasticsearch have no engine-level read-only transaction. Their read paths are protected by classification, the source `readOnly` policy, and (for Elasticsearch SQL) the engine's read-only API, but they do not get the MySQL/PostgreSQL transaction guarantee.
- Redis reads keys with `SCAN`; page order can change when the keyspace changes. Key filters support contains/equals, and type filtering supports equality.
- Elasticsearch SQL requires the SQL feature to be enabled on the cluster. JSON DSL is also available for the current index.
- Redis displays `db0`, `db1`, … as databases and `Keys` as a virtual table. Elasticsearch displays indices as databases and `Documents` as a virtual table.
- There is no SSH tunnel, certificate-file picker, or connection-pool management UI. SSL options are expressed through the URL using `sslmode` / `tls`.
- The SQL formatter is lightweight and not a complete SQL parser. Review complex statements after formatting.
- The AI assistant is available only inside the DshDataCat page and depends on the configured DSH default model.
- Source policies are enforced by the Host but currently have no dedicated editor in the UI; edit them in `datasources.json` or through the API.
- Browser-initiated writes use the authenticated in-page confirmation. The official `ctx.approval` seam is used when an initiating Agent is present. Agent tools cover query, metadata, CSV/XLSX export, data dictionaries, and schema diff; less common UI operations are not exposed as tools.
- The Web client is still a single `client.js` bundle and loads immediately; the source split/build and streaming-export work is not part of this change.
- Agent tools cover query, metadata discovery, CSV/XLSX export, Markdown data dictionaries, and schema diff for table sets/columns/indexes/constraints. Triggers are not implemented yet, and missing-table migration is report-only. Schema diff output is a reviewable preview and is never executed automatically.
- There are no testcontainers-backed four-engine integration tests yet; the committed suite is unit-level.

## Troubleshooting

### Redis connection refused / `ECONNREFUSED`

Confirm that Redis is running and check the URL port. The default is `6379`, not `3679`. DshDataCat now shows the target address and the underlying connection error.

### Alibaba Cloud RDS `__recycle_bin__` cannot be deleted

`__recycle_bin__` is a system database created by Alibaba Cloud RDS for MySQL's Recycle Bin feature. RDS rejects `DROP DATABASE` even when the account has a global `DROP` grant. DshDataCat marks it as protected and disables the delete action. Do not try to drop it; use the RDS console or `dbms_recycle.purge_table(...)` for tables inside the recycle bin.

### MySQL/PostgreSQL connection failed

Check the Host, port, firewall, credentials, permissions, and whether the default database exists. Leave the default database blank or create it first when needed.

### AI assistant does not appear

The AI entry point is in the DshDataCat header only. Configure the DSH default model and select an instance and database on the page.

### The page does not reflect changes

Reload the DshDataCat plugin in Plugins, then refresh the page. The client bundle is loaded with the page, so reloading the plugin alone may not replace already-loaded JavaScript.

## Contributing

Issues and pull requests are welcome.

- Run `pnpm check` and `pnpm test` before submitting.
- Do not commit `node_modules/`, `.tmp*`, `.env`, or any `datasources.json` / `.credentials.yaml`.
- Update the README security notes when changing database adapters or credential behavior.
- Describe the purpose, affected data sources, and verification scope in a pull request.

## GitHub Topics

Recommended topics for the repository's **About → Topics** section:

```text
dsh
dsh-plugin
deepseek-harness
database-manager
mysql
postgresql
redis
elasticsearch
sql-editor
ai
```

## License

Released under the [MIT License](LICENSE).

```text
Copyright (c) 2026 DshDataCat contributors
```
