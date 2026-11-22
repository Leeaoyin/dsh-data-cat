/**
 * DshDataCat Web client bundle.
 *
 * Loaded directly by the DSH Web ModuleLoader; there is intentionally no build
 * step. The file contains the page UI, client store, authenticated Host API
 * client, SQL editor/highlighter, and page-scoped AI assistant.
 */
window.__ModuleLoader__.load({
  id: '@local/dshcat',
  factory(require) {
    'use strict';

    const React = require('react');
    const h = React.createElement;
    const PKG = '@local/dshcat';
    const PANEL_ID = 'dshcat';
    const LOCALE_NS = 'dshcat';
    const API_PATH = '/api/dshcat';
    const PAGE_SIZE = 100;

    // ---------------------------------------------------------------------
    // Copy. One table builds both dictionaries; the slot registrations supply
    // the page's `t` seat from this namespace.
    // ---------------------------------------------------------------------
    const COPY = {
      'panel.label': ['DshDataCat', 'DshDataCat'],
      'panel.subtitle': ['数据库工作台', 'Database workspace'],
      'tabs.browse': ['数据浏览', 'Browse'],
      'tabs.sql': ['SQL Playground', 'SQL Playground'],

      'common.add': ['新建', 'New'],
      'common.edit': ['编辑', 'Edit'],
      'common.delete': ['删除', 'Delete'],
      'common.save': ['保存', 'Save'],
      'common.saveAndConnect': ['保存并连接', 'Save and connect'],
      'common.saving': ['保存中…', 'Saving…'],
      'common.cancel': ['取消', 'Cancel'],
      'common.close': ['关闭', 'Close'],
      'common.test': ['测试连接', 'Test connection'],
      'common.testing': ['连接中…', 'Connecting…'],
      'common.refresh': ['刷新', 'Refresh'],
      'common.loading': ['加载中…', 'Loading…'],
      'common.retry': ['重试', 'Retry'],
      'common.search': ['搜索', 'Search'],
      'common.filter': ['筛选', 'Filter'],
      'common.clear': ['清除', 'Clear'],
      'common.apply': ['应用', 'Apply'],
      'common.back': ['返回', 'Back'],
      'common.none': ['无', 'None'],
      'common.more': ['更多', 'More'],
      'common.dismiss': ['关闭提示', 'Dismiss'],
      'common.unknown': ['未知', 'Unknown'],
      'common.rows': ['{count} 行', '{count} rows'],
      'common.keys': ['{count} 个键', '{count} keys'],
      'common.docs': ['{count} 条文档', '{count} docs'],
      'common.ms': ['{count} ms', '{count} ms'],

      'source.title': ['数据源', 'Data sources'],
      'source.emptyTitle': ['连接你的第一个数据源', 'Connect your first data source'],
      'source.emptyText': ['填写实例 URL、用户名和密码即可开始浏览数据库、表和记录。', 'Enter the instance URL, username, and password to browse databases, tables, and rows.'],
      'source.emptyStep1': ['1. 添加数据源', '1. Add a data source'],
      'source.emptyStep2': ['2. 点击数据库加载表', '2. Open a database to load tables'],
      'source.emptyStep3': ['3. 点击表查看数据，或让 AI 帮你查询', '3. Open a table, or ask the AI copilot'],
      'source.add': ['添加数据源', 'Add data source'],
      'source.new': ['新建数据源', 'New data source'],
      'source.editTitle': ['编辑数据源', 'Edit data source'],
      'source.name': ['名称', 'Name'],
      'source.namePlaceholder': ['例如：本地开发库', 'For example: local dev'],
      'source.kind': ['数据库类型', 'Database type'],
      'source.url': ['连接 URL', 'Connection URL'],
      'source.urlPlaceholder': ['mysql://localhost:3306', 'mysql://localhost:3306'],
      'source.urlPlaceholderPostgres': ['postgresql://localhost:5432/postgres', 'postgresql://localhost:5432/postgres'],
      'source.urlPlaceholderRedis': ['redis://localhost:6379/0', 'redis://localhost:6379/0'],
      'source.urlPlaceholderEs': ['http://localhost:9200', 'http://localhost:9200'],
      'source.urlHint': ['可包含协议和端口；也可以直接写 host:port。', 'A scheme and port are supported; host:port also works.'],
      'source.username': ['用户名', 'Username'],
      'source.usernamePlaceholder': ['可选', 'Optional'],
      'source.password': ['密码', 'Password'],
      'source.passwordPlaceholder': ['可选', 'Optional'],
      'source.passwordSaved': ['密码已保存在 DSH 凭据服务；留空保持不变。', 'A password is saved in the DSH credential store; leave blank to keep it.'],
      'source.clearPassword': ['清除已保存的密码', 'Clear the saved password'],
      'source.database': ['默认数据库', 'Default database'],
      'source.databasePlaceholder': ['可选，例如 postgres 或 db0', 'Optional, for example postgres or db0'],
      'source.databaseHint': ['连接后会自动选中；也可以留空。', 'Selected automatically after connecting; optional.'],
      'source.testSuccess': ['连接成功：{version} · {latency} ms', 'Connected: {version} · {latency} ms'],
      'source.testFailed': ['连接失败', 'Connection failed'],
      'source.storageNote': ['数据源元数据保存在 DSH_HOME/dshcat/datasources.json；密码由 DSH 凭据服务托管。', 'Source metadata is stored in DSH_HOME/dshcat/datasources.json; passwords are managed by the DSH credential store.'],
      'source.deleteTitle': ['删除数据源', 'Delete data source'],
      'source.deleteText': ['确定删除“{name}”吗？已保存的密码也会被移除。', 'Delete “{name}”? Its saved password will also be removed.'],
      'source.deleteConfirm': ['删除', 'Delete'],
      'source.connected': ['已连接', 'Connected'],
      'source.connecting': ['连接中…', 'Connecting…'],
      'source.connectionFailed': ['连接失败', 'Connection failed'],

      'tree.databases': ['数据库', 'Databases'],
      'tree.tables': ['表', 'Tables'],
      'tree.keys': ['键', 'Keys'],
      'tree.noDatabases': ['没有可用数据库', 'No databases'],
      'db.databases': ['数据库', 'Databases'],
      'db.create': ['新建数据库', 'New database'],
      'db.createTitle': ['新建数据库', 'New database'],
      'db.createHint': ['将在当前连接实例中创建一个空数据库。', 'Create an empty database on the connected instance.'],
      'db.charsetNote': ['MySQL 默认字符集 utf8mb4（utf8mb4_unicode_ci）；PostgreSQL 使用 UTF8。', 'MySQL uses utf8mb4 (utf8mb4_unicode_ci); PostgreSQL uses UTF8.'],
      'db.name': ['数据库名', 'Database name'],
      'db.namePlaceholder': ['例如 analytics', 'e.g. analytics'],
      'db.nameHint': ['最多 63 个字符，不能包含控制字符、斜杠或反斜杠。', 'Up to 63 characters; control characters, slashes and backslashes are not allowed.'],
      'db.invalidName': ['数据库名无效：请使用 1–63 个字符，且不要包含控制字符、斜杠或反斜杠。', 'Invalid database name: use 1–63 characters without control characters, slashes or backslashes.'],
      'db.createSubmit': ['创建', 'Create'],
      'db.drop': ['删除数据库', 'Drop database'],
      'db.dropTitle': ['删除数据库', 'Drop database'],
      'db.dropText': ['数据库 {name} 及其中的全部表和数据将被永久删除，且无法恢复。', 'Database {name} and all of its tables and data will be permanently deleted. This cannot be undone.'],
      'db.dropConfirmHint': ['请输入下方完整内容以确认删除：', 'Type the exact phrase below to confirm:'],
      'db.dropInput': ['确认删除 + 数据库名', '确认删除 + database name'],
      'db.dropSubmit': ['永久删除', 'Delete permanently'],
      'db.system': ['系统库', 'System'],
      'db.systemProtected': ['系统数据库不允许删除', 'System databases cannot be deleted'],
      'tree.noTables': ['没有表', 'No tables'],
      'tree.filterTables': ['筛选表名', 'Filter tables'],
      'tree.system': ['系统', 'system'],
      'tree.empty': ['暂无对象', 'Nothing here'],
      'tree.loadingTables': ['正在加载表…', 'Loading tables…'],

      'browse.welcomeTitle': ['欢迎使用 DshDataCat', 'Welcome to DshDataCat'],
      'browse.welcomeText': ['连接 MySQL、PostgreSQL、Redis 或 Elasticsearch，然后从左侧浏览数据库与表。', 'Connect MySQL, PostgreSQL, Redis, or Elasticsearch, then browse databases and tables on the left.'],
      'browse.selectTable': ['从左侧选择一张表开始查看数据。', 'Choose a table on the left to inspect its rows.'],
      'browse.tablesTitle': ['表', 'Tables'],
      'browse.tablesSubtitle': ['{count} 个对象 · 点击查看数据', '{count} objects · click to open'],
      'browse.noTables': ['这个数据库还没有表。', 'This database has no tables.'],
      'browse.noTablesHint': ['创建表后刷新，或换一个数据库。', 'Create a table and refresh, or choose another database.'],
      'browse.selectSource': ['从左侧选择一个数据源', 'Choose a data source on the left'],
      'browse.selectSourceHint': ['从左侧列表选择一个实例，或点击“添加数据源”新建连接。', 'Choose an instance from the left, or add a new connection.'],
      'browse.tableCaption': ['数据行', 'Data rows'],
      'browse.noDatabase': ['请选择一个数据库。', 'Choose a database.'],
      'browse.noDatabaseHint': ['从左侧树中选择数据库以加载表。', 'Select a database in the tree to load its tables.'],
      'browse.loading': ['正在加载…', 'Loading…'],
      'browse.page': ['第 {page} 页', 'Page {page}'],
      'browse.pageSize': ['每页', 'Per page'],
      'browse.prev': ['上一页', 'Previous'],
      'browse.next': ['下一页', 'Next'],
      'browse.records': ['本页 {count} 条', '{count} on this page'],
      'browse.morePages': ['还有更多记录', 'More rows available'],
      'browse.emptyRows': ['没有符合条件的记录。', 'No rows match the current filter.'],
      'browse.filterField': ['筛选字段', 'Field'],
      'browse.filterOp': ['条件', 'Operator'],
      'browse.filterValue': ['值', 'Value'],
      'browse.filterAll': ['所有字段', 'All fields'],
      'browse.filterHint': ['输入值后按 Enter 应用筛选', 'Press Enter to apply the filter'],
      'browse.filterActive': ['已筛选：{field} {op} {value}', 'Filtered: {field} {op} {value}'],
      'browse.columnFilterHint': ['点击列头排序，点击漏斗筛选此字段', 'Click a column header to sort, or the funnel to filter by this field'],
      'browse.sortHint': ['点击列头排序：升序 → 降序 → 恢复默认', 'Click a header to sort: ascending → descending → default'],
      'browse.noPkPaging': ['该表没有主键，分页顺序依赖数据库物理顺序；并发写入时可能漏行或重复。', 'This table has no primary key; paging depends on physical order and can miss or repeat rows during concurrent writes.'],
      'browse.estimatedRows': ['约 {count} 行', '~{count} rows'],
      'browse.exactCount': ['精确计数', 'Exact count'],
      'browse.counting': ['统计中…', 'Counting…'],
      'browse.pendingCount': ['待提交 {count} 处修改', '{count} pending change(s)'],
      'browse.pendingHint': ['所有修改会在一个事务中提交，失败整体回滚。', 'All changes commit in one transaction and roll back together on failure.'],
      'browse.pendingSql': ['将执行的 SQL', 'SQL to execute'],
      'browse.pendingPreview': ['正在生成 SQL diff…', 'Generating SQL diff…'],
      'browse.commitEdits': ['提交修改', 'Commit changes'],
      'browse.discardEdits': ['放弃', 'Discard'],
      'browse.committing': ['提交中…', 'Committing…'],
      'browse.pendingBlocked': ['请先提交或放弃待提交的修改。', 'Commit or discard pending changes first.'],
      'browse.editPkUnsupported': ['待提交模式不支持修改主键字段。', 'Primary-key columns cannot be edited in pending mode.'],
      'browse.pendingCommitted': ['已提交 {count} 处修改', 'Committed {count} change(s)'],
      'browse.pendingCommitFailed': ['提交失败，修改已回滚', 'Commit failed; all changes were rolled back'],
      'browse.pendingLeave': ['有未提交的修改，离开将放弃这些修改。继续？', 'You have uncommitted changes. Leave and discard them?'],
      'browse.exportStructure': ['导出结构 SQL', 'Export DDL'],
      'browse.exportData': ['导出结构 + 数据', 'Export DDL + data'],
      'browse.exportRedisStructure': ['导出结构脚本', 'Export structure script'],
      'browse.exportRedisData': ['导出键值脚本', 'Export key script'],
      'browse.exportEsStructure': ['导出映射 JSON', 'Export mapping JSON'],
      'browse.exportEsData': ['导出 NDJSON', 'Export NDJSON'],
      'browse.exportBusy': ['正在生成导出…', 'Preparing export…'],
      'browse.exportDone': ['已开始下载 {name}', 'Downloading {name}'],
      'browse.refresh': ['刷新数据', 'Refresh rows'],
      'browse.closeTable': ['返回表概览', 'Back to tables'],
      'browse.null': ['NULL', 'NULL'],
      'browse.cellHint': ['点击列头筛选', 'Click the header to filter'],
      'browse.editCellHint': ['双击单元格编辑；修改先进入待提交区，再一次性提交', 'Double-click a cell to edit; changes stage first, then commit together'],
      'browse.editCellTitle': ['编辑单元格', 'Edit cell'],
      'browse.editNoPk': ['该表没有主键，无法安全编辑单元格。', 'This table has no primary key, so cells cannot be edited safely.'],
      'browse.unsupportedEdit': ['当前数据源暂不支持单元格编辑。', 'Cell editing is not supported for this data source.'],
      'browse.binaryNotEditable': ['二进制字段不支持编辑。', 'Binary fields cannot be edited.'],
      'browse.cellSaved': ['单元格已保存', 'Cell saved'],
      'browse.undo': ['撤销', 'Undo'],
      'browse.undoHint': ['撤销最近一次单元格修改（本表还可撤销 {count} 次）', 'Undo the latest cell edit ({count} left for this table)'],
      'browse.cellUndone': ['已撤销 {field} 的修改', 'Undid the edit to {field}'],
      'browse.undoFailed': ['撤销失败', 'Undo failed'],
      'browse.setNull': ['设为 NULL', 'Set NULL'],
      'browse.fieldType': ['字段类型', 'Field type'],
      'browse.primaryField': ['主键字段', 'Primary key'],
      'browse.invalidJson': ['请输入有效 JSON', 'Enter valid JSON'],
      'browse.invalidNumber': ['请输入有效数字', 'Enter a valid number'],
      'browse.enterValue': ['请输入值', 'Enter a value'],
      'browse.editPrimaryWarning': ['这是主键字段，修改后会改变该行的定位值。', 'This is a primary-key field; changing it changes how the row is identified.'],
      'browse.duration': ['{count} ms', '{count} ms'],
      'browse.truncatedScan': ['Redis 键扫描已达到上限，结果可能不完整。', 'The Redis key scan reached its limit; results may be incomplete.'],
      'browse.docs': ['文档', 'Documents'],
      'browse.keys': ['Keys', 'Keys'],

      'op.equals': ['等于', 'equals'],
      'op.notEquals': ['不等于', 'not equals'],
      'op.contains': ['包含', 'contains'],
      'op.gt': ['大于', 'greater than'],
      'op.gte': ['大于等于', 'at least'],
      'op.lt': ['小于', 'less than'],
      'op.lte': ['小于等于', 'at most'],
      'op.isNull': ['为空', 'is null'],
      'op.notNull': ['不为空', 'is not null'],

      'sql.title': ['SQL Playground', 'SQL Playground'],
      'sql.subtitle': ['在选中实例与数据库中执行 SQL；未选中文本时执行全部内容。', 'Run SQL against the selected instance and database. With no selection, the whole editor runs.'],
      'sql.run': ['执行', 'Run'],
      'sql.running': ['执行中…', 'Running…'],
      'sql.format': ['格式化', 'Format'],
      'sql.formatHint': ['格式化选中内容；未选中时格式化全部 SQL', 'Format the selection, or all SQL when nothing is selected'],
      'sql.placeholder': ['输入 SQL…\nCtrl/Cmd + Enter 执行', 'Enter SQL…\nCtrl/Cmd + Enter to run'],
      'sql.placeholderRedis': ['输入 Redis 命令，一行一条…\n例如 GET user:1', 'Enter Redis commands, one per line…\nFor example: GET user:1'],
      'sql.placeholderEs': ['输入 Elasticsearch SQL，或 JSON 查询 DSL…\n例如 SELECT * FROM "my-index" LIMIT 10', 'Enter Elasticsearch SQL or JSON query DSL…\nFor example: SELECT * FROM "my-index" LIMIT 10'],
      'sql.selectionHint': ['选中文本时只执行选中部分', 'Selected text runs alone'],
      'sql.result': ['执行结果', 'Results'],
      'sql.noResult': ['执行一条语句后，结果显示在这里。', 'Run a statement to see results here.'],
      'sql.minimize': ['最小化结果', 'Minimize results'],
      'sql.expand': ['展开结果', 'Expand results'],
      'sql.empty': ['请先输入 SQL 或选中要执行的文本。', 'Enter SQL or select text to run.'],
      'sql.noContext': ['请先选择数据源和数据库。', 'Choose a data source and database first.'],
      'sql.confirmTitle': ['确认执行高危操作', 'Confirm high-risk statement'],
      'sql.confirmText': ['以下语句会修改数据或结构，请确认目标实例和数据库后再执行。', 'This statement changes data or schema. Confirm the target instance and database before running.'],
      'sql.confirmTarget': ['目标：{source} / {database}', 'Target: {source} / {database}'],
      'sql.confirmDanger': ['这是不可逆或破坏性操作，请格外小心。', 'This is destructive or hard to reverse. Be careful.'],
      'sql.confirmWrite': ['这是写入操作，建议先确认范围。', 'This writes data; check the scope first.'],
      'sql.confirmRun': ['确认执行', 'Run anyway'],
      'sql.affected': ['影响 {count} 行', '{count} rows affected'],
      'sql.tabs': ['结果 {index}', 'Result {index}'],
      'sql.aiHint': ['AI 生成的 SQL 会填入编辑区，执行后自动打开本页。', 'AI-generated SQL fills this editor; running jumps here automatically.'],
      'sql.minimized': ['结果已最小化', 'Results minimized'],
      'sql.resize': ['调整结果区高度', 'Resize the results pane'],
      'sql.restorePrevious': ['恢复之前的 SQL', 'Restore previous SQL'],
      'sql.resultContext': ['{source} / {database}', '{source} / {database}'],
      'sql.staleResult': ['当前结果来自 {source} / {database}，与当前选择不同。', 'These results came from {source} / {database}, not the current selection.'],
      'sql.truncated': ['结果过大，仅显示前 {count} 行。', 'The result is large; only the first {count} rows are shown.'],
      'sql.error': ['执行失败', 'Execution failed'],
      'sql.statement': ['语句', 'Statement'],
      'sql.duration': ['耗时 {count} ms', '{count} ms'],

      'ai.title': ['DshDataCat AI', 'DshDataCat AI'],
      'ai.subtitle': ['数据库助手', 'Database copilot'],
      'ai.button': ['AI 助手', 'AI copilot'],
      'ai.open': ['展开 AI 助手', 'Open AI copilot'],
      'ai.close': ['关闭 AI 助手', 'Close AI copilot'],
      'ai.collapse': ['收起', 'Collapse'],
      'ai.drag': ['拖动对话框', 'Drag dialog'],
      'ai.resize': ['拖动边角调整大小', 'Drag a corner to resize'],
      'ai.context': ['查询上下文', 'Context'],
      'ai.instance': ['实例', 'Instance'],
      'ai.database': ['数据库', 'Database'],
      'ai.selectSource': ['选择实例', 'Choose instance'],
      'ai.selectDatabase': ['选择数据库', 'Choose database'],
      'ai.placeholder': ['描述你想查询或修改的内容…', 'Describe what you want to query or change…'],
      'ai.placeholderFull': ['描述你想查询或修改的内容…\nEnter 发送，Shift+Enter 换行', 'Describe what you want to query or change…\nEnter to send, Shift+Enter for a new line'],
      'ai.send': ['发送', 'Send'],
      'ai.thinking': ['AI 正在思考…', 'AI is thinking…'],
      'ai.emptyTitle': ['从当前数据库开始', 'Start with the current database'],
      'ai.emptyText': ['描述你想查询或修改的内容。AI 会读取当前库的结构和少量样例值；只读查询自动执行，写入需确认。', 'Describe what you want to query or change. The AI reads the current schema and a few sample values; reads run automatically and writes need confirmation.'],
      'ai.suggestion.tables': ['列出当前数据库的表', 'List tables in this database'],
      'ai.suggestion.rows': ['查看当前表的前 100 行', 'Show the first 100 rows'],
      'ai.suggestion.design': ['帮我设计一张用户表', 'Design a users table'],
      'ai.composerHint': ['Enter 发送 · Shift+Enter 换行', 'Enter to send · Shift+Enter for a new line'],
      'ai.openPanel': ['打开 DshDataCat', 'Open DshDataCat'],
      'ai.noSource': ['先选择一个数据源和数据库，AI 才能读取结构并生成查询。', 'Choose a data source and database so the AI can read the schema.'],
      'ai.noSourceAction': ['在左侧数据源树中添加或连接一个实例。', 'Add or connect an instance in the data-source tree on the left.'],
      'ai.you': ['你', 'You'],
      'ai.assistant': ['DshDataCat AI', 'DshDataCat AI'],
      'ai.plan': ['建议执行的语句', 'Proposed statement'],
      'ai.riskRead': ['只读', 'Read-only'],
      'ai.riskWrite': ['写入', 'Write'],
      'ai.riskDanger': ['高危', 'Danger'],
      'ai.needsConfirm': ['此操作需要确认', 'Confirmation required'],
      'ai.writeWarning': ['这会修改数据库，请确认实例、数据库和语句。', 'This changes the database. Confirm the instance, database, and statement.'],
      'ai.confirmRun': ['确认执行', 'Confirm and run'],
      'ai.cancel': ['取消', 'Cancel'],
      'ai.cancelled': ['已取消', 'Cancelled'],
      'ai.running': ['执行中…', 'Running…'],
      'ai.autoRunning': ['只读查询已自动执行中…', 'Running the read-only query automatically…'],
      'ai.autoDone': ['只读查询已自动执行', 'Read-only query ran automatically'],
      'ai.done': ['已执行', 'Executed'],
      'ai.failed': ['执行失败', 'Failed'],
      'ai.autoRead': ['只读查询已自动执行，并切换到 SQL Playground。', 'The read-only query ran automatically and opened SQL Playground.'],
      'ai.viewResult': ['查看结果', 'View results'],
      'ai.sqlError': ['SQL 执行失败', 'SQL execution failed'],
      'ai.contextChanged': ['实例或数据库已变化，请重新生成这条语句。', 'The instance or database changed. Generate the statement again.'],
      'ai.error': ['AI 请求失败', 'AI request failed'],
      'ai.retry': ['重试', 'Retry'],
      'ai.cleared': ['对话已清空', 'Conversation cleared'],
      'ai.clear': ['清空对话', 'Clear conversation'],
      'ai.model': ['模型：{model}', 'Model: {model}'],
      'ai.contextLabel': ['{source} / {database}', '{source} / {database}'],
      'ai.idle': ['就绪', 'Ready'],
      'ai.busy': ['工作中', 'Working'],
      'ai.collapsed': ['AI 助手', 'AI'],

      'errors.generic': ['操作失败', 'Something went wrong'],
      'errors.connection': ['无法连接 DshDataCat Host API。', 'Could not reach the DshDataCat Host API.'],
      'errors.unauthorized': ['页面会话已失效，请刷新页面后重试。', 'The page session expired. Refresh and try again.'],
      'errors.timeout': ['请求超时，请稍后重试。', 'The request timed out. Try again.'],
      'errors.copy': ['复制失败', 'Copy failed'],
      'errors.export': ['导出失败', 'Export failed'],
      'empty.noData': ['暂无数据', 'No data'],
      'aria.loading': ['加载中', 'Loading'],
      'aria.closeDialog': ['关闭对话框', 'Close dialog'],
      'aria.moreActions': ['更多操作', 'More actions']
    };

    /** Build both dictionaries from the single copy table. */
    function dictionaries() {
      const out = { zh: {}, en: {} };
      for (const key of Object.keys(COPY)) {
        const pair = COPY[key];
        out.zh[key] = pair[0];
        out.en[key] = pair[1];
      }
      return out;
    }

    const NUMBER = new Intl.NumberFormat();
    const NARROW = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });
    function num(value) {
      const n = Number(value);
      return Number.isFinite(n) ? NUMBER.format(n) : String(value ?? '');
    }

    function messageOf(error) {
      if (error instanceof Error && error.message) return error.message;
      if (typeof error === 'string' && error) return error;
      return 'Unknown error';
    }

    function uniqueId() {
      return `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
    }

    // ---------------------------------------------------------------------
    // Icons. All are plain inline SVG; they inherit currentColor and never use
    // external assets.
    // ---------------------------------------------------------------------
    const ICON_PATHS = {
      plus: ['M12 5v14', 'M5 12h14'],
      edit: ['M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3', 'M13.5 6.5l4 4'],
      trash: ['M4 7h16', 'M9 7V4h6v3', 'M6.5 7l.8 13h9.4l.8-13', 'M10 11v5', 'M14 11v5'],
      refresh: ['M20 11a8 8 0 1 0-2.3 5.7', 'M20 4v7h-7'],
      download: ['M12 4v11', 'M8 11l4 4 4-4', 'M5 19h14'],
      play: ['M8 5v14l11-7Z'],
      search: ['M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z', 'M16 16l4 4'],
      chevronRight: ['M9 6l6 6-6 6'],
      chevronDown: ['M6 9l6 6 6-6'],
      close: ['M6 6l12 12', 'M18 6 6 18'],
      minimize: ['M5 12h14'],
      maximize: ['M5 12h14', 'M12 5v14'],
      table: ['M4 5h16v14H4Z', 'M4 10h16', 'M10 5v14'],
      columns: ['M4 5h16v14H4Z', 'M10 5v14', 'M15 5v14'],
      filter: ['M4 5h16l-6 7v6l-4 2v-8Z'],
      send: ['M4 4l16 8-16 8 4-8Z'],
      undo: ['M9 14 4 9l5-5', 'M4 9h9a6 6 0 0 1 0 12h-3'],
      resize: ['M4 20 20 4', 'M12 20 20 12', 'M17 20 20 17'],
      format: ['M4 6h16', 'M4 12h11', 'M4 18h14'],
      grip: ['M9 6h.01', 'M15 6h.01', 'M9 12h.01', 'M15 12h.01', 'M9 18h.01', 'M15 18h.01'],
      alert: ['M12 4 3 20h18Z', 'M12 9v5', 'M12 17h.01'],
      check: ['M4 12l5 5L20 6'],
      database: ['M5 6c0-1.7 3.1-3 7-3s7 1.3 7 3-3.1 3-7 3-7-1.3-7-3Z', 'M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6', 'M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6'],
      key: ['M14 7a4 4 0 1 1-3.5 5.9L5 18.4V21H3v-3l6-5.5A4 4 0 0 1 14 7Z', 'M16 5h.01'],
      sparkles: ['M12 3l1.4 4.6L18 9l-4.6 1.4L12 15l-1.4-4.6L6 9l4.6-1.4Z', 'M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8Z'],
      terminal: ['M4 5h16v14H4Z', 'M7 10l3 2-3 2', 'M13 14h4'],
      info: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'M12 11v5', 'M12 8h.01']
    };

    function Icon({ name, size = 16, className }) {
      const paths = ICON_PATHS[name] || ICON_PATHS.info;
      return h('svg', {
        className: className,
        width: size,
        height: size,
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.8,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': 'true',
        focusable: 'false'
      }, paths.map((d, index) => h('path', { key: index, d })));
    }

    /** The sidebar icon: a database cylinder with small cat ears. */
    function SidebarIcon({ size = 16, active = false }) {
      const color = active ? 'var(--dsw-alias-brand-primary)' : 'currentColor';
      return h('svg', {
        width: size,
        height: size,
        viewBox: '0 0 24 24',
        fill: 'none',
        color: color,
        'aria-hidden': 'true',
        focusable: 'false'
      },
      h('path', { d: 'M4.6 6.7 6.9 2.8 9.1 5.6Z', fill: 'currentColor', opacity: 0.85 }),
      h('path', { d: 'M14.9 5.6 17.1 2.8 19.4 6.7Z', fill: 'currentColor', opacity: 0.85 }),
      h('path', { d: 'M4.5 7c0-1.5 3.4-2.7 7.5-2.7s7.5 1.2 7.5 2.7v11c0 1.5-3.4 2.7-7.5 2.7S4.5 19.5 4.5 18Z', stroke: 'currentColor', strokeWidth: 1.7 }),
      h('ellipse', { cx: 12, cy: 7, rx: 7.5, ry: 2.7, stroke: 'currentColor', strokeWidth: 1.7 }),
      h('path', { d: 'M4.5 12.3c0 1.5 3.4 2.7 7.5 2.7s7.5-1.2 7.5-2.7', stroke: 'currentColor', strokeWidth: 1.3, opacity: 0.55 }));
    }

    // ---------------------------------------------------------------------
    // Store and API. Everything is closure-local so two page loads never share
    // a cache, and closing the in-page copilot never discards its messages.
    // ---------------------------------------------------------------------
    let store = null;
    let actions = null;
    let api = null;
    let currentContext = null;

    function createStore() {
      let state = {
        loaded: false,
        sourcesLoading: false,
        sources: [],
        sourceId: null,
        source: null,
        sourceInfo: null,
        sourceBusy: false,
        databases: [],
        database: null,
        tables: [],
        tablesBusy: false,
        tablesError: null,
        table: null,
        view: 'browse',
        tableData: {
          columns: [],
          rows: [],
          page: 1,
          pageSize: PAGE_SIZE,
          hasMore: false,
          loading: false,
          filters: [],
          sort: [],
          durationMs: null,
          total: null,
          estimatedTotal: null,
          totalIsEstimate: false,
          exactTotal: null,
          orderHint: null,
          truncatedScan: false,
          pendingEdits: [],
          pendingSql: [],
          pendingLoading: false
        },
        playground: {
          sql: '',
          previousSql: '',
          sets: [],
          activeSet: 0,
          minimized: false,
          running: false,
          error: null,
          durationMs: null,
          risk: null,
          lastStatement: '',
          context: null
        },
        ai: {
          messages: [],
          busy: false,
          error: null,
          open: false,
          draft: '',
          model: null,
          provider: null
        },
        cellHistory: {},
        error: null
      };
      const listeners = new Set();
      return {
        get: () => state,
        set(patch) {
          state = typeof patch === 'function' ? patch(state) : { ...state, ...patch };
          for (const listener of [...listeners]) listener();
        },
        subscribe(listener) {
          listeners.add(listener);
          return () => { listeners.delete(listener); };
        }
      };
    }

    function useStore() {
      const [, force] = React.useState(0);
      React.useEffect(() => store.subscribe(() => force(value => value + 1)), []);
      return store.get();
    }

    class ApiError extends Error {
      constructor(message, code) {
        super(message);
        this.name = 'ApiError';
        this.code = code;
      }
    }

    async function request(action, payload, timeoutMs = 120_000) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      let response;
      try {
        response = await fetch(API_PATH, {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ action, ...(payload || {}) }),
          signal: controller.signal
        });
      } catch (error) {
        if (error && error.name === 'AbortError') throw new ApiError('请求超时，请稍后重试。', 'timeout');
        throw new ApiError('无法连接 DshDataCat Host API，请确认插件 Host 半已加载。', 'network');
      } finally {
        clearTimeout(timer);
      }
      let body = null;
      try {
        body = await response.json();
      } catch (error) {
        body = null;
      }
      if (response.status === 401) throw new ApiError('页面会话已失效，请刷新页面后重试。', 'unauthorized');
      if (!response.ok) {
        throw new ApiError(body?.error?.message || `DshDataCat API 返回 HTTP ${response.status}`, body?.error?.code || 'http_error');
      }
      if (!body || body.ok !== true) {
        throw new ApiError(body?.error?.message || 'DshDataCat 请求失败。', body?.error?.code || 'request_failed');
      }
      return body.value;
    }

    function tableKey(table) {
      return table ? `${table.schema || ''}.${table.name}` : '';
    }

    /** Localize the virtual objects Redis and Elasticsearch expose. */
    function tableLabelFor(table, kind, t) {
      if (!table) return '';
      if (kind === 'redis' && table.name === 'keys') return t('browse.keys');
      if (kind === 'elasticsearch' && table.name === '_docs') return t('browse.docs');
      return table.label || table.name;
    }

    const MYSQL_SYSTEM_DATABASES = new Set(['mysql', 'information_schema', 'performance_schema', 'sys', '__recycle_bin__']);
    const PG_SYSTEM_DATABASES = new Set(['postgres', 'template0', 'template1']);

    /** System databases are readable but never deletable from the UI. */
    function isSystemDatabase(kind, name) {
      const normalized = String(name || '').toLowerCase();
      if (kind === 'mysql') return MYSQL_SYSTEM_DATABASES.has(normalized);
      if (kind === 'postgresql') return PG_SYSTEM_DATABASES.has(normalized);
      return false;
    }

    /** Choose the editor primitive from the driver's column type text. */
    function cellEditorKind(column) {
      const type = String(column?.type || '').toLowerCase();
      if (/\[\]$/.test(type)) return 'array';
      if (/\bjsonb?\b/.test(type)) return 'json';
      if (/^(bool|boolean)$/.test(type) || /^tinyint\(1\)/.test(type)) return 'boolean';
      if (/(binary|varbinary|tinyblob|blob|mediumblob|longblob|bytea|\bbit\b)/.test(type)) return 'binary';
      if (/^enum\(/.test(type)) return 'enum';
      if (/\b(tinyint|smallint|mediumint|int|integer|bigint|decimal|numeric|float|double|real|money|year)\b/.test(type)) return 'number';
      if (/\b(timestamp|datetime|date|time)\b/.test(type)) return 'date';
      return 'text';
    }

    /** Parse MySQL enum values for a select control. */
    function enumChoices(column) {
      const match = /^enum\((.*)\)$/i.exec(String(column?.type || ''));
      if (!match) return [];
      const values = [];
      const pattern = /'((?:[^']|'')*)'/g;
      let item;
      while ((item = pattern.exec(match[1])) !== null) values.push(item[1].replace(/''/g, "'"));
      return values;
    }

    /** Transport-safe copy of a cell value for the local undo history. */
    function cellHistoryValue(value) {
      if (value === null || value === undefined) return null;
      if (typeof value === 'object') {
        try {
          return JSON.stringify(value);
        } catch {
          return String(value);
        }
      }
      if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'string') return value;
      return String(value);
    }

    /** Text shown in the editor for a raw cell value. */
    function cellEditorText(value, kind) {
      if (value === null || value === undefined) return '';
      if (typeof value === 'object') {
        try {
          return kind === 'date' ? String(value) : JSON.stringify(value, null, 2);
        } catch {
          return String(value);
        }
      }
      if (typeof value === 'boolean') return value ? 'true' : 'false';
      return String(value);
    }

    function errorText(error, fallback) {
      return messageOf(error) || fallback || '操作失败';
    }

    function createActions(t) {
      let connectSeq = 0;
      let tableSeq = 0;
      let dataSeq = 0;

      function openPanel() {
        try {
          currentContext.layout.selectPanel(PANEL_ID);
        } catch (error) {
          console.warn('[dshcat] could not open panel', error);
        }
      }

      function reportError(message) {
        store.set({ error: typeof message === 'string' ? message : errorText(message) });
      }

      function clearError() {
        store.set({ error: null });
      }

      async function loadSources() {
        if (store.get().sourcesLoading) return;
        store.set({ sourcesLoading: true });
        try {
          const result = await request('sources.list', {});
          store.set({ sources: Array.isArray(result.sources) ? result.sources : [], sourcesLoading: false, loaded: true, error: null });
        } catch (error) {
          store.set({ sourcesLoading: false, loaded: false });
          reportError(error);
        }
      }

      async function connect(sourceId, options = {}) {
        if (!sourceId) return;
        if (store.get().playground.running) return;
        if (store.get().tableData.pendingEdits?.length > 0 && window.confirm(t('browse.pendingLeave')) !== true) return;
        const seq = ++connectSeq;
        tableSeq += 1;
        dataSeq += 1;
        const source = store.get().sources.find(item => item.id === sourceId)
          || (store.get().source && store.get().source.id === sourceId ? store.get().source : null);
        store.set(state => ({
          ...state,
          sourceId,
          source: source || state.source,
          sourceBusy: true,
          sourceInfo: null,
          databases: [],
          database: null,
          tables: [],
          tablesError: null,
          table: null,
          error: null,
          tableData: { ...state.tableData, columns: [], rows: [], page: 1, hasMore: false, filters: [], sort: [], loading: false, durationMs: null, total: null, estimatedTotal: null, totalIsEstimate: false, exactTotal: null, orderHint: null, truncatedScan: false, pendingEdits: [], pendingSql: [], pendingLoading: false }
        }));
        try {
          const result = await request('sources.connect', { id: sourceId });
          if (seq !== connectSeq) return;
          const databases = Array.isArray(result.databases) ? result.databases : [];
          const preferred = options.database || source?.database || source?.databaseName;
          const selected = databases.find(item => item.name === preferred) || databases[0] || null;
          store.set(state => ({
            ...state,
            source: result.source || source,
            sourceInfo: result.info || null,
            sourceBusy: false,
            databases,
            database: selected ? selected.name : null,
            tables: [],
            table: null,
            error: null
          }));
          if (selected) await loadTables(selected.name, seq);
        } catch (error) {
          if (seq !== connectSeq) return;
          store.set({ sourceBusy: false, databases: [], database: null, tables: [], table: null });
          reportError(error);
          if (options.throwOnError === true) throw error;
        }
      }

      async function loadTables(databaseName, expectedConnectSeq) {
        const state = store.get();
        const sourceId = state.sourceId;
        if (!sourceId || !databaseName) return;
        const seq = ++tableSeq;
        store.set({ tablesBusy: true, tables: [], tablesError: null, table: null });
        try {
          const result = await request('tables.list', { id: sourceId, database: databaseName });
          if (seq !== tableSeq || (expectedConnectSeq !== undefined && expectedConnectSeq !== connectSeq)) return;
          const tables = (Array.isArray(result.tables) ? result.tables : []).map(table => ({ ...table, key: tableKey(table) }));
          store.set({ tablesBusy: false, tables, tablesError: null, error: null });
        } catch (error) {
          if (seq !== tableSeq) return;
          store.set({ tablesBusy: false, tables: [], tablesError: messageOf(error) });
          reportError(error);
        }
      }

      async function selectDatabase(databaseName) {
        if (!databaseName) return;
        if (!store.get().sourceId) return;
        if (store.get().playground.running) return;
        if (store.get().tableData.pendingEdits?.length > 0 && window.confirm(t('browse.pendingLeave')) !== true) return;
        tableSeq += 1;
        dataSeq += 1;
        store.set(state => ({
          ...state,
          database: databaseName,
          table: null,
          tables: [],
          tablesError: null,
          tablesBusy: true,
          tableData: { ...state.tableData, columns: [], rows: [], page: 1, hasMore: false, filters: [], sort: [], loading: false, durationMs: null, total: null, estimatedTotal: null, totalIsEstimate: false, exactTotal: null, orderHint: null, truncatedScan: false, pendingEdits: [], pendingSql: [], pendingLoading: false }
        }));
        await loadTables(databaseName);
      }

      async function createDatabase(name) {
        const state = store.get();
        if (!state.sourceId) throw new ApiError('请先连接数据源。', 'no_source');
        if (state.playground.running) throw new ApiError('请等待当前 SQL 执行完成。', 'busy');
        await request('databases.create', { id: state.sourceId, name }, 60_000);
        await connect(state.sourceId, { database: name });
        return { name };
      }

      async function dropDatabase(name) {
        const state = store.get();
        if (!state.sourceId) throw new ApiError('请先连接数据源。', 'no_source');
        if (state.playground.running) throw new ApiError('请等待当前 SQL 执行完成。', 'busy');
        if (isSystemDatabase(state.source?.kind, name)) {
          throw new ApiError('系统数据库不允许删除。', 'protected_database');
        }
        await request('databases.drop', { id: state.sourceId, name }, 60_000);
        await connect(state.sourceId);
        return { name };
      }

      async function selectTable(table) {
        const current = store.get();
        if (current.tableData.pendingEdits?.length > 0 && window.confirm(t('browse.pendingLeave')) !== true) return;
        dataSeq += 1;
        store.set(state => ({
          ...state,
          table,
          view: 'browse',
          tableData: {
            ...state.tableData,
            columns: [],
            rows: [],
            page: 1,
            hasMore: false,
            filters: [],
            sort: [],
            loading: true,
            durationMs: null,
            total: null,
            estimatedTotal: null,
            totalIsEstimate: false,
            exactTotal: null,
            orderHint: null,
            truncatedScan: false,
            pendingEdits: [],
            pendingSql: [],
            pendingLoading: false
          }
        }));
        await loadTableData({ page: 1, filters: [] });
      }

      async function loadTableData(overrides = {}) {
        const state = store.get();
        const table = overrides.table || state.table;
        if (!state.sourceId || !state.database || !table) return;
        if (overrides.force !== true && state.tableData.pendingEdits?.length > 0) {
          reportError(new ApiError(t('browse.pendingBlocked'), 'pending_edits'));
          return;
        }
        const seq = ++dataSeq;
        const page = overrides.page || state.tableData.page || 1;
        const pageSize = overrides.pageSize || state.tableData.pageSize || PAGE_SIZE;
        const filters = overrides.filters !== undefined ? overrides.filters : state.tableData.filters;
        const sort = overrides.sort !== undefined ? overrides.sort : state.tableData.sort || [];
        store.set(state => ({
          ...state,
          tableData: { ...state.tableData, page, pageSize, filters, sort, loading: true }
        }));
        try {
          const result = await request('table.data', {
            id: state.sourceId,
            database: state.database,
            table: table.name,
            schema: table.schema,
            page,
            pageSize,
            filters,
            sort
          }, 60_000);
          if (seq !== dataSeq) return;
          store.set(state => ({
            ...state,
            tableData: {
              ...state.tableData,
              columns: result.columns || [],
              rows: result.rows || [],
              page: result.page || page,
              pageSize: result.pageSize || pageSize,
              hasMore: Boolean(result.hasMore),
              loading: false,
              filters,
              sort: result.sort || sort,
              durationMs: result.durationMs ?? null,
              total: result.total ?? null,
              estimatedTotal: result.estimatedTotal ?? null,
              totalIsEstimate: Boolean(result.totalIsEstimate),
              exactTotal: null,
              orderHint: result.orderHint || null,
              truncatedScan: Boolean(result.truncatedScan)
            },
            error: null
          }));
        } catch (error) {
          if (seq !== dataSeq) return;
          store.set(state => ({ ...state, tableData: { ...state.tableData, loading: false } }));
          reportError(error);
        }
      }

      async function countTableRows() {
        const state = store.get();
        if (!state.sourceId || !state.database || !state.table) return;
        try {
          const result = await request('table.count', {
            id: state.sourceId,
            database: state.database,
            table: state.table.name,
            schema: state.table.schema,
            filters: state.tableData.filters || []
          }, 60_000);
          store.set(state => ({
            ...state,
            tableData: {
              ...state.tableData,
              exactTotal: result.count?.total ?? null,
              totalIsEstimate: false
            }
          }));
        } catch (error) {
          reportError(error);
        }
      }

      async function previewCellEdits(edits) {
        const state = store.get();
        if (!state.sourceId || !state.database || !state.table) return [];
        const result = await request('table.previewEdits', {
          id: state.sourceId,
          database: state.database,
          table: state.table.name,
          schema: state.table.schema,
          edits
        }, 30_000);
        return Array.isArray(result.statements) ? result.statements : [];
      }

      async function stageCellEdit(edit) {
        const state = store.get();
        if (!state.sourceId || !state.database || !state.table) return;
        const key = `${edit.rowIndex}\0${edit.column}`;
        const existing = (state.tableData.pendingEdits || []).find(item => `${item.rowIndex}\0${item.column}` === key);
        const nextEdit = {
          ...edit,
          beforeValue: existing ? existing.beforeValue : edit.beforeValue
        };
        const pending = [...(state.tableData.pendingEdits || []).filter(item => `${item.rowIndex}\0${item.column}` !== key), nextEdit];
        const columns = state.tableData.columns || [];
        const columnIndex = columns.findIndex(column => column.name === edit.column);
        const rows = state.tableData.rows.map((row, rowIndex) => {
          if (rowIndex !== edit.rowIndex) return row;
          if (Array.isArray(row)) {
            const copy = [...row];
            copy[columnIndex] = edit.value;
            return copy;
          }
          return { ...row, [edit.column]: edit.value };
        });
        store.set(state => ({
          ...state,
          tableData: {
            ...state.tableData,
            rows,
            pendingEdits: pending,
            pendingSql: [],
            pendingLoading: true
          }
        }));
        const seq = ++dataSeq;
        try {
          const statements = await previewCellEdits(pending);
          if (seq !== dataSeq) return;
          store.set(state => ({ ...state, tableData: { ...state.tableData, pendingSql: statements, pendingLoading: false } }));
        } catch (error) {
          if (seq !== dataSeq) return;
          store.set(state => ({ ...state, tableData: { ...state.tableData, pendingLoading: false } }));
          reportError(error);
        }
      }

      async function discardCellEdits() {
        const state = store.get();
        if (!state.table) return;
        dataSeq += 1;
        store.set(state => ({
          ...state,
          tableData: {
            ...state.tableData,
            pendingEdits: [],
            pendingSql: [],
            pendingLoading: false,
            rows: []
          }
        }));
        await loadTableData({ page: state.tableData.page, force: true });
      }

      async function commitCellEdits() {
        const state = store.get();
        if (!state.sourceId || !state.database || !state.table || !(state.tableData.pendingEdits || []).length) return null;
        dataSeq += 1;
        const edits = state.tableData.pendingEdits.map(item => ({
          column: item.column,
          value: item.value,
          pk: item.pk
        }));
        const result = await request('table.commitEdits', {
          id: state.sourceId,
          database: state.database,
          table: state.table.name,
          schema: state.table.schema,
          edits
        }, 120_000);
        const count = result.commit?.updated ?? edits.length;
        store.set(state => ({
          ...state,
          tableData: {
            ...state.tableData,
            pendingEdits: [],
            pendingSql: [],
            pendingLoading: false
          }
        }));
        await loadTableData({ page: 1, force: true });
        return { ...result, count };
      }

      async function refreshTables() {
        const state = store.get();
        if (state.database) await loadTables(state.database);
      }

      async function saveSource(form) {
        const result = await request('sources.save', { source: form }, 60_000);
        const source = result.source;
        const sources = Array.isArray(result.sources) ? result.sources : store.get().sources;
        store.set({ sources, source: source && store.get().source?.id === source.id ? { ...store.get().source, ...source } : store.get().source });
        try {
          await connect(source.id, { throwOnError: true });
          return { source, connected: true, error: null };
        } catch (error) {
          return { source, connected: false, error: errorText(error) };
        }
      }

      async function testSource(form) {
        const result = await request('sources.test', { source: form }, 30_000);
        return result.info;
      }

      async function deleteSource(id) {
        const result = await request('sources.delete', { id });
        const sources = Array.isArray(result.sources) ? result.sources : [];
        if (store.get().sourceId === id) {
          connectSeq += 1;
          tableSeq += 1;
          dataSeq += 1;
          store.set(state => ({
            ...state,
            sources,
            sourceId: null,
            source: null,
            sourceInfo: null,
            databases: [],
            database: null,
            tables: [],
            tablesError: null,
            table: null,
            sourceBusy: false,
            tableData: { ...state.tableData, columns: [], rows: [], page: 1, hasMore: false, filters: [], sort: [], exactTotal: null, orderHint: null, pendingEdits: [], pendingSql: [], pendingLoading: false }
          }));
        } else {
          store.set({ sources });
        }
      }

      async function updateCell(column, value, pk) {
        const state = store.get();
        if (!state.sourceId || !state.database || !state.table) throw new ApiError('请先选择表。', 'no_table');
        const result = await request('table.updateCell', {
          id: state.sourceId,
          database: state.database,
          table: state.table.name,
          schema: state.table.schema,
          column,
          value,
          pk
        }, 60_000);
        return result.update;
      }

      async function exportTable(mode) {
        const state = store.get();
        if (!state.sourceId || !state.database || !state.table) throw new ApiError('请先选择表。', 'no_table');
        const result = await request('table.export', {
          id: state.sourceId,
          database: state.database,
          table: state.table.name,
          schema: state.table.schema,
          mode
        }, 120_000);
        return result.export;
      }

      function setView(view) {
        store.set({ view });
      }

      function closeTable() {
        store.set(state => ({
          ...state,
          table: null,
          view: 'browse',
          tableData: {
            ...state.tableData,
            pendingEdits: [],
            pendingSql: [],
            pendingLoading: false
          }
        }));
      }

      function setPlaygroundSql(sql) {
        store.set(state => ({ ...state, playground: { ...state.playground, sql } }));
      }

      function restorePreviousSql() {
        store.set(state => ({
          ...state,
          playground: {
            ...state.playground,
            sql: state.playground.previousSql,
            previousSql: ''
          }
        }));
      }

      function setActiveSet(index) {
        store.set(state => ({ ...state, playground: { ...state.playground, activeSet: index } }));
      }

      function togglePlaygroundMinimized() {
        store.set(state => ({ ...state, playground: { ...state.playground, minimized: !state.playground.minimized } }));
      }

      async function executeSql(sql, options = {}) {
        const state = store.get();
        const sourceId = options.sourceId || state.sourceId;
        const database = options.database || state.database;
        if (!sourceId || !database) throw new ApiError('请先选择数据源和数据库。', 'no_context');
        const result = await request('sql.execute', {
          id: sourceId,
          database,
          sql,
          confirmed: options.confirmed === true
        }, 120_000);
        if (result.requiresConfirmation) return result;
        const sets = Array.isArray(result.sets) ? result.sets : [];
        const firstTable = sets.findIndex(set => Array.isArray(set.columns) && set.columns.length > 0);
        const owner = state.sources.find(item => item.id === sourceId) || state.source;
        store.set(state => {
          const updateSql = options.updateSql === true;
          const previousDraft = state.playground.sql;
          const backup = updateSql && previousDraft.trim() && previousDraft !== sql
            ? (state.playground.previousSql || previousDraft)
            : state.playground.previousSql;
          return {
            ...state,
            view: 'sql',
            error: null,
            playground: {
              ...state.playground,
              sql: updateSql ? sql : state.playground.sql,
              previousSql: backup,
              sets,
              activeSet: firstTable >= 0 ? firstTable : 0,
              minimized: false,
              running: false,
              error: null,
              durationMs: result.durationMs ?? null,
              risk: result.risk || null,
              lastStatement: sql,
              context: {
                sourceId,
                sourceName: owner?.name || sourceId,
                database
              }
            }
          };
        });
        if (options.jump !== false) openPanel();
        return result;
      }

      async function runPlayground(sql, confirmed = false) {
        const state = store.get();
        if (!state.sourceId || !state.database) throw new ApiError('请先选择数据源和数据库。', 'no_context');
        if (state.playground.running) return { ignored: true };
        store.set(state => ({ ...state, playground: { ...state.playground, running: true, error: null } }));
        try {
          const result = await executeSql(sql, { confirmed, updateSql: false });
          if (result.requiresConfirmation) {
            store.set(state => ({ ...state, playground: { ...state.playground, running: false } }));
            return result;
          }
          return result;
        } catch (error) {
          appendSqlError(sql, error);
          store.set(state => ({
            ...state,
            playground: { ...state.playground, running: false, error: errorText(error) },
            error: errorText(error)
          }));
          throw error;
        }
      }

      function updateAiMessage(id, patch) {
        store.set(state => ({
          ...state,
          ai: {
            ...state.ai,
            messages: state.ai.messages.map(message => message.id === id ? { ...message, ...patch } : message)
          }
        }));
      }

      function updatePlan(id, patch) {
        store.set(state => ({
          ...state,
          ai: {
            ...state.ai,
            messages: state.ai.messages.map(message => message.id === id && message.plan
              ? { ...message, plan: { ...message.plan, ...patch } }
              : message)
          }
        }));
      }

      function recordCellEdit(key, entry) {
        if (!key) return;
        store.set(state => {
          const previous = state.cellHistory[key] || [];
          return {
            ...state,
            cellHistory: {
              ...state.cellHistory,
              [key]: [...previous, entry].slice(-3)
            }
          };
        });
      }

      function dropCellEdit(key) {
        store.set(state => {
          const previous = state.cellHistory[key] || [];
          if (previous.length === 0) return state;
          const next = previous.slice(0, -1);
          const cellHistory = { ...state.cellHistory };
          if (next.length > 0) cellHistory[key] = next;
          else delete cellHistory[key];
          return { ...state, cellHistory };
        });
      }

      /** Record an execution failure in the AI transcript so a later repair
       * request is grounded in the actual database error. */
      function appendSqlError(sql, error) {
        store.set(state => ({
          ...state,
          ai: {
            ...state.ai,
            messages: [...state.ai.messages, {
              id: uniqueId(),
              role: 'system',
              systemKind: 'sql-error',
              sql,
              error: errorText(error)
            }]
          }
        }));
      }

      function planSummary(result) {
        const sets = Array.isArray(result.sets) ? result.sets : [];
        const rows = sets.reduce((sum, set) => sum + (Number(set.rowCount) || 0), 0);
        const affected = sets.reduce((sum, set) => sum + (Number(set.affectedRows) || 0), 0);
        return {
          rows,
          affected,
          durationMs: Number.isFinite(Number(result.durationMs)) ? Number(result.durationMs) : null
        };
      }

      async function runPlan(messageId, confirmed) {
        const state = store.get();
        const message = state.ai.messages.find(item => item.id === messageId);
        const plan = message && message.plan;
        if (!plan) return;
        if (plan.status === 'running' || plan.status === 'done') return;
        if (plan.sourceId !== state.sourceId || plan.database !== state.database) {
          updatePlan(messageId, { status: 'error', errorCode: 'context_changed', error: null });
          return;
        }
        updatePlan(messageId, { status: 'running', error: null });
        store.set(state => ({ ...state, playground: { ...state.playground, running: true } }));
        try {
          const result = await executeSql(plan.sql, {
            confirmed: confirmed === true,
            sourceId: plan.sourceId,
            database: plan.database,
            jump: true,
            updateSql: true
          });
          if (result.requiresConfirmation) {
            updatePlan(messageId, { status: 'pending', risk: result.risk || plan.risk });
            return;
          }
          updatePlan(messageId, {
            status: 'done',
            risk: result.risk || plan.risk,
            summary: planSummary(result),
            error: null
          });
        } catch (error) {
          updatePlan(messageId, { status: 'error', error: errorText(error) });
          reportError(error);
        } finally {
          if (store.get().playground.running) {
            store.set(state => ({ ...state, playground: { ...state.playground, running: false } }));
          }
        }
      }

      async function aiSend(text) {
        const clean = String(text || '').trim();
        if (!clean) return;
        if (store.get().ai.busy) return;
        const state = store.get();
        if (!state.sourceId || !state.database) {
          store.set(state => ({ ...state, ai: { ...state.ai, error: '请先选择数据源和数据库。' } }));
          return;
        }
        const userMessage = { id: uniqueId(), role: 'user', text: clean };
        const prior = state.ai.messages.filter(message => message.role === 'user' || message.role === 'assistant' || message.role === 'system');
        const apiMessages = prior.map(message => {
          if (message.role === 'system') {
            return {
              role: 'user',
              content: `[SQL 执行器系统事件]\nSQL:\n${message.sql || ''}\n执行错误:\n${message.error || ''}`
            };
          }
          let content = message.text;
          if (message.plan?.sql) {
            content += `\nSQL: ${message.plan.sql}`;
            if (message.plan.status === 'done') {
              content += `\n执行结果: 成功${message.plan.summary
                ? ` (${message.plan.summary.rows} rows, ${message.plan.summary.affected} affected, ${message.plan.summary.durationMs} ms)`
                : ''}`;
            } else if (message.plan.status === 'error') {
              content += `\n执行结果: 失败\n执行错误: ${message.plan.error || message.plan.errorCode || 'unknown error'}`;
            }
          }
          return { role: message.role, content };
        });
        apiMessages.push({ role: 'user', content: clean });
        store.set(state => ({
          ...state,
          ai: { ...state.ai, messages: [...state.ai.messages, userMessage], busy: true, error: null }
        }));
        try {
          const result = await request('ai.chat', {
            id: state.sourceId,
            database: state.database,
            table: state.table?.name || '',
            schema: state.table?.schema || '',
            messages: apiMessages
          }, 180_000);
          const plan = result.sql ? {
            sql: result.sql,
            risk: result.risk || 'write',
            status: 'pending',
            sourceId: state.sourceId,
            sourceName: state.source?.name || state.sourceId,
            database: state.database,
            auto: result.risk === 'read',
            summary: null,
            error: null
          } : null;
          const assistantMessage = {
            id: uniqueId(),
            role: 'assistant',
            text: result.reply || '已生成查询。',
            plan
          };
          store.set(state => ({
            ...state,
            ai: {
              ...state.ai,
              messages: [...state.ai.messages, assistantMessage],
              busy: false,
              error: null,
              model: result.model || state.ai.model,
              provider: result.provider || state.ai.provider
            }
          }));
          if (plan && plan.risk === 'read') await runPlan(assistantMessage.id, false);
        } catch (error) {
          store.set(state => ({
            ...state,
            ai: {
              ...state.ai,
              busy: false,
              error: errorText(error),
              messages: [...state.ai.messages, {
                id: uniqueId(),
                role: 'assistant',
                text: `AI 请求失败：${errorText(error)}`,
                error: true,
                retry: clean
              }]
            }
          }));
        }
      }

      async function confirmPlan(messageId) {
        await runPlan(messageId, true);
      }

      function cancelPlan(messageId) {
        updatePlan(messageId, { status: 'cancelled' });
      }

      function setAiOpen(open) {
        store.set(state => ({ ...state, ai: { ...state.ai, open: open === true } }));
      }

      function setAiDraft(draft) {
        store.set(state => ({ ...state, ai: { ...state.ai, draft } }));
      }

      function clearAi() {
        store.set(state => ({ ...state, ai: { ...state.ai, messages: [], error: null, model: null, provider: null } }));
      }

      return {
        loadSources,
        connect,
        createDatabase,
        dropDatabase,
        selectDatabase,
        selectTable,
        loadTableData,
        countTableRows,
        stageCellEdit,
        discardCellEdits,
        commitCellEdits,
        refreshTables,
        saveSource,
        testSource,
        deleteSource,
        updateCell,
        exportTable,
        setView,
        closeTable,
        setPlaygroundSql,
        restorePreviousSql,
        setActiveSet,
        togglePlaygroundMinimized,
        runPlayground,
        executeSql,
        aiSend,
        runPlan,
        confirmPlan,
        cancelPlan,
        setAiOpen,
        setAiDraft,
        clearAi,
        recordCellEdit,
        dropCellEdit,
        reportError,
        clearError,
        openPanel
      };
    }

    // ---------------------------------------------------------------------
    // Small presentational primitives.
    // ---------------------------------------------------------------------
    function cx(...values) {
      return values.filter(Boolean).join(' ');
    }

    function Button({ children, onClick, kind = 'secondary', size = 'md', title, disabled, type = 'button', className, ariaLabel, ariaExpanded }) {
      return h('button', {
        type,
        className: cx('dc-btn', `dc-btn-${kind}`, `dc-btn-${size}`, className),
        onClick,
        title,
        disabled,
        'aria-label': ariaLabel,
        'aria-expanded': ariaExpanded
      }, children);
    }

    function IconButton({ label, icon, onClick, disabled, className, size = 16 }) {
      return h('button', {
        type: 'button',
        className: cx('dc-icon-btn', className),
        onClick,
        title: label,
        'aria-label': label,
        disabled
      }, h(Icon, { name: icon, size }));
    }

    function Spinner({ size = 14, label }) {
      return h('span', { className: 'dc-spinner', role: 'status', 'aria-label': label || 'Loading', style: { width: size, height: size } });
    }

    function Field({ label, children, hint, className }) {
      return h('label', { className: cx('dc-field', className) },
        h('span', { className: 'dc-field-label' }, label),
        children,
        hint ? h('span', { className: 'dc-field-hint' }, hint) : null);
    }

    function TypeBadge({ kind }) {
      const short = { mysql: 'MY', postgresql: 'PG', redis: 'RD', elasticsearch: 'ES' }[kind] || 'DB';
      return h('span', { className: cx('dc-kind', `dc-kind-${kind}`), 'aria-hidden': 'true' }, short);
    }

    function EmptyState({ title, text, children, icon = 'database' }) {
      return h('div', { className: 'dc-empty' },
        h('div', { className: 'dc-empty-icon' }, h(Icon, { name: icon, size: 26 })),
        title ? h('h3', { className: 'dc-empty-title' }, title) : null,
        text ? h('p', { className: 'dc-empty-text' }, text) : null,
        children ? h('div', { className: 'dc-empty-actions' }, children) : null);
    }

    function RiskBadge({ risk, t }) {
      const label = risk === 'danger' ? t('ai.riskDanger') : risk === 'write' ? t('ai.riskWrite') : t('ai.riskRead');
      return h('span', { className: cx('dc-risk', `dc-risk-${risk}`) }, label);
    }

    function sourceUrlLabel(source) {
      if (!source) return '';
      return source.displayUrl || source.url || '';
    }

    function downloadText(filename, content, mime) {
      const blob = new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      anchor.rel = 'noopener';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4_000);
    }

    // ---------------------------------------------------------------------
    // Modal: host-theme surface, Escape close, focus trap, scroll lock.
    // ---------------------------------------------------------------------
    function Modal({ title, children, footer, onClose, wide }) {
      const dialog = React.useRef(null);
      const titleId = React.useId();
      const closeRef = React.useRef(onClose);
      closeRef.current = onClose;
      React.useEffect(() => {
        const previous = document.activeElement;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const timer = setTimeout(() => {
          const root = dialog.current;
          if (!root) return;
          const target = root.querySelector('input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])');
          if (target) target.focus();
        }, 0);
        const onKey = event => {
          if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            closeRef.current();
            return;
          }
          if (event.key !== 'Tab' || !dialog.current) return;
          const focusable = [...dialog.current.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')]
            .filter(element => element.offsetParent !== null);
          if (focusable.length === 0) return;
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        };
        document.addEventListener('keydown', onKey, true);
        return () => {
          clearTimeout(timer);
          document.removeEventListener('keydown', onKey, true);
          document.body.style.overflow = previousOverflow;
          if (previous && typeof previous.focus === 'function') previous.focus();
        };
      }, []);
      return h('div', {
        className: 'dc-modal-backdrop',
        onMouseDown: event => {
          if (event.target === event.currentTarget) onClose();
        }
      },
      h('div', {
        ref: dialog,
        className: cx('dc-modal', wide && 'dc-modal-wide'),
        role: 'dialog',
        'aria-modal': 'true',
        'aria-labelledby': titleId,
        onMouseDown: event => event.stopPropagation()
      },
      h('div', { className: 'dc-modal-head' },
        h('h2', { id: titleId, className: 'dc-modal-title' }, title),
        h(IconButton, { label: 'Close', icon: 'close', onClick: onClose })),
      h('div', { className: 'dc-modal-body' }, children),
      footer ? h('div', { className: 'dc-modal-foot' }, footer) : null));
    }

    function ConfirmDialog({ title, message, detail, confirmLabel, busy, danger, onCancel, onConfirm, cancelLabel = '取消', busyLabel = '执行中…' }) {
      return h(Modal, {
        title,
        onClose: busy ? () => {} : onCancel,
        footer: h(React.Fragment, null,
          h(Button, { kind: 'ghost', onClick: onCancel, disabled: busy }, cancelLabel),
          h(Button, { kind: danger ? 'danger' : 'primary', onClick: onConfirm, disabled: busy }, busy ? h(React.Fragment, null, h(Spinner, { size: 13 }), ` ${busyLabel}`) : confirmLabel))
      },
      h('div', { className: 'dc-confirm-body' },
        h('div', { className: cx('dc-confirm-icon', danger && 'dc-confirm-icon-danger') }, h(Icon, { name: 'alert', size: 20 })),
        h('div', { className: 'dc-confirm-copy' },
          h('p', { className: 'dc-confirm-message' }, message),
          detail ? h('pre', { className: 'dc-confirm-detail' }, detail) : null)));
    }

    // ---------------------------------------------------------------------
    // Data-source form.
    // ---------------------------------------------------------------------
    const BLANK_SOURCE = {
      kind: 'mysql',
      name: '',
      url: '',
      username: '',
      password: '',
      database: '',
      clearPassword: false
    };

    const KIND_OPTIONS = [
      { value: 'mysql', label: 'MySQL', placeholder: 'mysql://localhost:3306' },
      { value: 'postgresql', label: 'PostgreSQL', placeholder: 'postgresql://localhost:5432/postgres' },
      { value: 'redis', label: 'Redis', placeholder: 'redis://localhost:6379/0' },
      { value: 'elasticsearch', label: 'Elasticsearch', placeholder: 'http://localhost:9200' }
    ];

    function SourceFormModal({ open, initial, t, onClose, onSave, onTest }) {
      const initialKey = initial ? `${initial.id}:${initial.updatedAt || ''}` : 'new';
      const [form, setForm] = React.useState(BLANK_SOURCE);
      const [busy, setBusy] = React.useState(false);
      const [testing, setTesting] = React.useState(false);
      const [testResult, setTestResult] = React.useState(null);
      const [error, setError] = React.useState(null);

      React.useEffect(() => {
        if (!open) return;
        setError(null);
        setTestResult(null);
        setBusy(false);
        setTesting(false);
        setForm(initial ? {
          id: initial.id,
          kind: initial.kind || 'mysql',
          name: initial.name || '',
          url: initial.url || '',
          username: initial.username || '',
          password: '',
          database: initial.database || '',
          clearPassword: false
        } : { ...BLANK_SOURCE });
      }, [open, initialKey]);

      if (!open) return null;
      const kindOption = KIND_OPTIONS.find(option => option.value === form.kind) || KIND_OPTIONS[0];
      const update = (key, value) => {
        setForm(previous => ({ ...previous, [key]: value }));
        setTestResult(null);
        setError(null);
      };
      const submit = async () => {
        setError(null);
        if (!form.url.trim()) {
          setError('请填写连接 URL。');
          return;
        }
        setBusy(true);
        try {
          const saved = await onSave(form);
          if (saved?.source?.id && saved.source.id !== form.id) {
            setForm(previous => ({ ...previous, id: saved.source.id }));
          }
          if (saved && saved.connected === false) {
            setError(saved.error || '数据源已保存，但连接失败。');
            return;
          }
          onClose();
        } catch (failure) {
          setError(messageOf(failure));
        } finally {
          setBusy(false);
        }
      };
      const test = async () => {
        setError(null);
        setTestResult(null);
        if (!form.url.trim()) {
          setError('请填写连接 URL。');
          return;
        }
        setTesting(true);
        try {
          const info = await onTest(form);
          setTestResult(info);
        } catch (failure) {
          setError(messageOf(failure));
        } finally {
          setTesting(false);
        }
      };

      return h(Modal, {
        title: initial ? t('source.editTitle') : t('source.new'),
        onClose: busy ? () => {} : onClose,
        wide: true,
        footer: h(React.Fragment, null,
          h('span', { className: 'dc-modal-foot-note' }, t('source.storageNote')),
          h('span', { className: 'dc-modal-foot-spacer' }),
          h(Button, { kind: 'ghost', onClick: test, disabled: testing || busy }, testing ? h(React.Fragment, null, h(Spinner, { size: 13 }), ` ${t('common.testing')}`) : t('common.test')),
          h(Button, { kind: 'primary', onClick: submit, disabled: busy || testing }, busy ? h(React.Fragment, null, h(Spinner, { size: 13 }), ` ${t('common.saving')}`) : t('common.saveAndConnect')))
      },
      h('div', { className: 'dc-form-grid' },
        h(Field, { label: t('source.name') },
          h('input', {
            className: 'dc-input',
            value: form.name,
            placeholder: t('source.namePlaceholder'),
            onChange: event => update('name', event.target.value)
          })),
        h(Field, { label: t('source.kind') },
          h('select', {
            className: 'dc-input',
            value: form.kind,
            onChange: event => {
              update('kind', event.target.value);
              setTestResult(null);
              setError(null);
            }
          }, KIND_OPTIONS.map(option => h('option', { key: option.value, value: option.value }, option.label)))),
        h(Field, { label: t('source.url'), className: 'dc-span-2', hint: t('source.urlHint') },
          h('input', {
            className: 'dc-input dc-mono',
            value: form.url,
            placeholder: kindOption.placeholder,
            spellCheck: false,
            onChange: event => update('url', event.target.value)
          })),
        h(Field, { label: t('source.username') },
          h('input', {
            className: 'dc-input',
            value: form.username,
            placeholder: t('source.usernamePlaceholder'),
            autoComplete: 'username',
            onChange: event => update('username', event.target.value)
          })),
        h(Field, {
          label: t('source.password'),
          hint: initial?.hasPassword ? t('source.passwordSaved') : null
        },
        h('input', {
          className: 'dc-input',
          type: 'password',
          value: form.password,
          placeholder: initial?.hasPassword ? '••••••••' : t('source.passwordPlaceholder'),
          autoComplete: 'new-password',
          onChange: event => {
            const value = event.target.value;
            setForm(previous => ({ ...previous, password: value, clearPassword: value ? false : previous.clearPassword }));
            setTestResult(null);
            setError(null);
          }
        })),
        h(Field, { label: t('source.database'), hint: t('source.databaseHint') },
          h('input', {
            className: 'dc-input',
            value: form.database,
            placeholder: t('source.databasePlaceholder'),
            onChange: event => update('database', event.target.value)
          })),
        initial?.hasPassword ? h('label', { className: 'dc-check dc-check-spaced' },
          h('input', {
            type: 'checkbox',
            checked: form.clearPassword,
            onChange: event => update('clearPassword', event.target.checked)
          }),
          h('span', null, t('source.clearPassword'))) : h('span', null),
        testResult ? h('div', { className: 'dc-inline-success dc-span-2' },
          h(Icon, { name: 'check', size: 15 }),
          h('span', null, t('source.testSuccess', { version: testResult.version || '', latency: testResult.latencyMs ?? '—' }))) : null,
        error ? h('div', { className: 'dc-inline-error dc-span-2' },
          h(Icon, { name: 'alert', size: 15 }),
          h('span', null, error)) : null));
    }

    function ConfirmSourceDelete({ source, busy, t, onCancel, onConfirm }) {
      if (!source) return null;
      return h(ConfirmDialog, {
        title: t('source.deleteTitle'),
        message: t('source.deleteText', { name: source.name || source.displayUrl || source.id }),
        confirmLabel: t('source.deleteConfirm'),
        busy,
        danger: true,
        cancelLabel: t('common.cancel'),
        busyLabel: t('common.loading'),
        onCancel,
        onConfirm
      });
    }

    function CreateDatabaseModal({ sourceName, t, onClose, onCreate }) {
      const [name, setName] = React.useState('');
      const [busy, setBusy] = React.useState(false);
      const [error, setError] = React.useState(null);
      const validName = value => {
        const clean = value.trim();
        return clean.length > 0 && clean.length <= 63 && clean !== '.' && clean !== '..'
          && !/[\u0000-\u001f\u007f/\\]/.test(clean);
      };
      const submit = async () => {
        if (busy) return;
        if (!validName(name)) {
          setError(t('db.invalidName'));
          return;
        }
        setBusy(true);
        setError(null);
        try {
          await onCreate(name.trim());
          onClose();
        } catch (failure) {
          setError(messageOf(failure));
        } finally {
          setBusy(false);
        }
      };
      return h(Modal, {
        title: t('db.createTitle'),
        onClose: busy ? () => {} : onClose,
        footer: h(React.Fragment, null,
          h(Button, { kind: 'ghost', onClick: onClose, disabled: busy }, t('common.cancel')),
          h(Button, { kind: 'primary', onClick: () => { void submit(); }, disabled: busy || !name.trim() },
            busy ? h(Spinner, { size: 13 }) : h(Icon, { name: 'plus', size: 14 }), ` ${t('db.createSubmit')}`))
      }, h('div', { className: 'dc-db-form' },
        h('p', { className: 'dc-db-form-note' }, t('db.createHint')),
        sourceName ? h('p', { className: 'dc-db-form-target' }, sourceName) : null,
        h('label', { className: 'dc-field' },
          h('span', { className: 'dc-field-label' }, t('db.name')),
          h('input', {
            className: 'dc-input dc-mono',
            value: name,
            maxLength: 63,
            autoComplete: 'off',
            spellCheck: false,
            placeholder: t('db.namePlaceholder'),
            onChange: event => { setName(event.target.value); setError(null); },
            onKeyDown: event => {
              if (event.key === 'Enter') {
                event.preventDefault();
                void submit();
              }
            }
          }),
          h('span', { className: 'dc-field-hint' }, t('db.nameHint'))),
        h('div', { className: 'dc-db-charset' }, h(Icon, { name: 'info', size: 13 }), h('span', null, t('db.charsetNote'))),
        error ? h('div', { className: 'dc-inline-error' }, h(Icon, { name: 'alert', size: 14 }), h('span', null, error)) : null));
    }

    function DropDatabaseModal({ database, sourceName, t, onClose, onDrop }) {
      const required = `确认删除${database}`;
      const [phrase, setPhrase] = React.useState('');
      const [busy, setBusy] = React.useState(false);
      const [error, setError] = React.useState(null);
      const matches = phrase.trim() === required;
      const submit = async () => {
        if (busy || !matches) return;
        setBusy(true);
        setError(null);
        try {
          await onDrop(database);
          onClose();
        } catch (failure) {
          setError(messageOf(failure));
        } finally {
          setBusy(false);
        }
      };
      return h(Modal, {
        title: t('db.dropTitle'),
        onClose: busy ? () => {} : onClose,
        footer: h(React.Fragment, null,
          h(Button, { kind: 'ghost', onClick: onClose, disabled: busy }, t('common.cancel')),
          h(Button, { kind: 'danger', onClick: () => { void submit(); }, disabled: busy || !matches },
            busy ? h(Spinner, { size: 13 }) : h(Icon, { name: 'trash', size: 14 }), ` ${t('db.dropSubmit')}`))
      }, h('div', { className: 'dc-db-drop' },
        h('div', { className: 'dc-confirm-icon dc-confirm-icon-danger' }, h(Icon, { name: 'alert', size: 20 })),
        h('p', { className: 'dc-confirm-message' }, t('db.dropText', { name: database })),
        sourceName ? h('p', { className: 'dc-confirm-target' }, sourceName) : null,
        h('p', { className: 'dc-db-drop-hint' }, t('db.dropConfirmHint')),
        h('code', { className: 'dc-db-drop-phrase' }, required),
        h('input', {
          className: 'dc-input dc-mono',
          value: phrase,
          autoComplete: 'off',
          spellCheck: false,
          placeholder: t('db.dropInput'),
          'aria-label': t('db.dropConfirmHint'),
          onChange: event => { setPhrase(event.target.value); setError(null); },
          onKeyDown: event => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void submit();
            }
          }
        }),
        error ? h('div', { className: 'dc-inline-error' }, h(Icon, { name: 'alert', size: 14 }), h('span', null, error)) : null));
    }

    // ---------------------------------------------------------------------
    // Source / database / table tree.
    // ---------------------------------------------------------------------
    function SourceTree({ state, actions, t, onAdd, onEdit, onDelete, onCreateDatabase, canManageDatabases }) {
      const [tableFilter, setTableFilter] = React.useState('');
      const [expandedDatabase, setExpandedDatabase] = React.useState(state.database || null);
      React.useEffect(() => setTableFilter(''), [state.sourceId, state.database]);
      React.useEffect(() => setExpandedDatabase(state.database || null), [state.sourceId, state.database]);
      const filteredTables = state.tables.filter(table => {
        if (!tableFilter.trim()) return true;
        const needle = tableFilter.trim().toLowerCase();
        return String(table.name).toLowerCase().includes(needle) || String(table.label || '').toLowerCase().includes(needle);
      });
      return h('aside', { className: 'dc-tree', 'aria-label': t('source.title') },
        h('div', { className: 'dc-tree-head' },
          h('span', { className: 'dc-tree-title' }, t('source.title')),
          h(IconButton, { label: t('source.add'), icon: 'plus', onClick: onAdd })),
        h('div', { className: 'dc-source-list' },
          state.sourcesLoading && state.sources.length === 0 ? h('div', { className: 'dc-tree-loading' }, h(Spinner, { label: t('common.loading') }), t('common.loading')) : null,
          !state.sourcesLoading && state.sources.length === 0 ? h('div', { className: 'dc-tree-empty' },
            h('p', null, t('browse.welcomeText')),
            h(Button, { kind: 'primary', size: 'sm', onClick: onAdd }, h(Icon, { name: 'plus', size: 14 }), ` ${t('source.add')}`),
            state.error ? h('div', { className: 'dc-tree-empty-actions' },
              h(Button, { kind: 'ghost', size: 'sm', onClick: () => { void actions.loadSources(); }, disabled: state.sourcesLoading }, t('common.retry'))) : null) : null,
          state.sources.map(source => {
            const active = state.sourceId === source.id;
            const connected = active && Boolean(state.sourceInfo) && !state.sourceBusy;
            return h('div', { key: source.id, className: cx('dc-source', active && 'dc-source-active') },
              h('div', { className: 'dc-source-row' },
                h('button', {
                  type: 'button',
                  className: 'dc-source-main',
                  onClick: () => { void actions.connect(source.id); },
                  title: sourceUrlLabel(source)
                },
                h(TypeBadge, { kind: source.kind }),
                h('span', { className: 'dc-source-copy' },
                  h('span', { className: 'dc-source-name' }, source.name || source.displayUrl || source.id),
                  h('span', { className: 'dc-source-url' }, sourceUrlLabel(source))),
                h('span', {
                  className: cx('dc-source-dot', connected && 'dc-source-dot-on', active && state.sourceBusy && 'dc-source-dot-busy'),
                  title: connected ? t('source.connected') : active && state.sourceBusy ? t('source.connecting') : ''
                })),
                h('span', { className: 'dc-source-actions' },
                  h(IconButton, { label: t('common.edit'), icon: 'edit', size: 14, onClick: () => onEdit(source) }),
                  h(IconButton, { label: t('common.delete'), icon: 'trash', size: 14, onClick: () => onDelete(source) }))),
              active ? h('div', { className: 'dc-tree-branch' },
                state.sourceBusy ? h('div', { className: 'dc-tree-loading dc-tree-loading-indent' }, h(Spinner, { label: t('source.connecting') }), t('source.connecting')) : null,
                canManageDatabases ? h('div', { className: 'dc-db-section' },
                  h('span', { className: 'dc-db-section-label' }, t('db.databases')),
                  h(IconButton, {
                    label: t('db.create'),
                    icon: 'plus',
                    size: 12,
                    onClick: onCreateDatabase,
                    disabled: state.sourceBusy
                  })) : null,
                state.databases.map(database => {
                  const dbActive = state.database === database.name;
                  const dbExpanded = dbActive && expandedDatabase === database.name;
                  return h('div', { key: database.name, className: 'dc-db' },
                    h('button', {
                      type: 'button',
                      className: cx('dc-db-row', dbActive && 'dc-db-row-active'),
                      'aria-expanded': dbExpanded ? 'true' : 'false',
                      onClick: () => {
                        if (dbExpanded) {
                          setExpandedDatabase(null);
                          return;
                        }
                        setExpandedDatabase(database.name);
                        if (!dbActive) void actions.selectDatabase(database.name);
                      },
                      title: database.detail || database.name
                    },
                    h('span', { className: 'dc-chevron' }, h(Icon, { name: dbExpanded ? 'chevronDown' : 'chevronRight', size: 13 })),
                    h(Icon, { name: 'database', size: 14, className: 'dc-db-icon' }),
                    h('span', { className: 'dc-db-name' }, database.name),
                    database.detail ? h('span', { className: 'dc-db-detail' }, database.detail) : null),
                    dbExpanded ? h('div', { className: 'dc-table-branch' },
                      h('div', { className: 'dc-table-filter' },
                        h(Icon, { name: 'search', size: 13 }),
                        h('input', {
                          className: 'dc-mini-input',
                          value: tableFilter,
                          placeholder: t('tree.filterTables'),
                          'aria-label': t('tree.filterTables'),
                          onChange: event => setTableFilter(event.target.value)
                        })),
                      state.tablesBusy ? h('div', { className: 'dc-tree-loading dc-tree-loading-indent' }, h(Spinner, { label: t('tree.loadingTables') }), t('tree.loadingTables')) : null,
                      !state.tablesBusy && filteredTables.length === 0 ? h('div', { className: 'dc-tree-note' }, tableFilter ? t('tree.noTables') : t('browse.noTables')) : null,
                      filteredTables.map(table => {
                        const selected = state.table?.key === table.key;
                        return h('button', {
                          type: 'button',
                          key: table.key || `${table.schema}.${table.name}`,
                          className: cx('dc-table-row', selected && 'dc-table-row-active'),
                          title: table.detail || table.label || table.name,
                          onClick: () => { void actions.selectTable(table); }
                        },
                        h('span', { className: 'dc-table-glyph' }, h(Icon, { name: table.type === 'view' || table.type === 'materialized view' ? 'columns' : 'table', size: 13 })),
                        h('span', { className: 'dc-table-name' }, tableLabelFor(table, source.kind, t)),
                        table.schema && source.kind === 'postgresql' ? h('span', { className: 'dc-table-schema' }, table.schema) : null);
                      })) : null);
                }),
                !state.sourceBusy && state.databases.length === 0 ? h('div', { className: 'dc-tree-note dc-tree-loading-indent' }, t('tree.noDatabases')) : null) : null);
          })));
    }

    // ---------------------------------------------------------------------
    // Browse: filter bar, result table, paging, table browser.
    // ---------------------------------------------------------------------
    const OPS = ['contains', 'equals', 'notEquals', 'gt', 'gte', 'lt', 'lte', 'isNull', 'notNull'];
    const NO_VALUE_OPS = new Set(['isNull', 'notNull']);

    function FilterBar({ columns, activeFilters, t, onApply, seed, seedField }) {
      const available = columns.filter(column => column.filterable !== false);
      const initial = Array.isArray(activeFilters) && activeFilters.length > 0 ? activeFilters[0] : null;
      const [field, setField] = React.useState(initial?.field || available[0]?.name || '');
      const [op, setOp] = React.useState(initial?.op || 'contains');
      const [value, setValue] = React.useState(initial?.value || '');
      const input = React.useRef(null);
      const selected = available.find(column => column.name === field) || available[0] || null;
      const allowed = Array.isArray(selected?.ops) && selected.ops.length > 0 ? selected.ops : OPS;
      React.useEffect(() => {
        if (!field && available.length > 0) setField(available[0].name);
      }, [available.length, field]);
      React.useEffect(() => {
        if (!allowed.includes(op)) setOp(allowed[0] || 'contains');
      }, [field, allowed.join(',')]);
      React.useEffect(() => {
        if (!seed) return;
        const nextField = seedField || available[0]?.name || '';
        const nextColumn = available.find(column => column.name === nextField);
        setField(nextField);
        setOp(nextColumn?.ops?.[0] || 'contains');
        setValue('');
        const timer = setTimeout(() => input.current?.focus(), 0);
        return () => clearTimeout(timer);
      }, [seed, seedField]);
      const effectiveOp = allowed.includes(op) ? op : (allowed[0] || 'contains');
      const apply = () => {
        if (!field) {
          onApply([]);
          return;
        }
        const needsValue = !NO_VALUE_OPS.has(effectiveOp);
        if (needsValue && value.trim() === '') {
          onApply([]);
          return;
        }
        onApply([{ field, op: effectiveOp, value: needsValue ? value : '' }]);
      };
      const clear = () => {
        setValue('');
        setOp(allowed[0] || 'contains');
        onApply([]);
      };
      return h('div', { className: 'dc-filter-bar' },
        h('span', { className: 'dc-filter-label' }, h(Icon, { name: 'filter', size: 14 }), t('common.filter')),
        h('select', {
          className: 'dc-input dc-select-sm',
          value: field,
          'aria-label': t('browse.filterField'),
          onChange: event => {
            const nextField = event.target.value;
            const nextColumn = available.find(column => column.name === nextField);
            setField(nextField);
            setOp(nextColumn?.ops?.[0] || 'contains');
            setValue('');
          }
        }, available.length === 0
          ? h('option', { value: '' }, t('common.none'))
          : available.map(column => h('option', { key: column.name, value: column.name }, `${column.name}${column.type ? ` · ${column.type}` : ''}`))),
        h('select', {
          className: 'dc-input dc-select-sm',
          value: effectiveOp,
          'aria-label': t('browse.filterOp'),
          onChange: event => setOp(event.target.value)
        }, allowed.map(option => h('option', { key: option, value: option }, t(`op.${option}`)))),
        h('input', {
          ref: input,
          className: 'dc-input dc-filter-value',
          value: value,
          disabled: NO_VALUE_OPS.has(effectiveOp),
          placeholder: NO_VALUE_OPS.has(effectiveOp) ? t('common.none') : t('browse.filterValue'),
          'aria-label': t('browse.filterValue'),
          onChange: event => setValue(event.target.value),
          onKeyDown: event => { if (event.key === 'Enter') { event.preventDefault(); apply(); } }
        }),
        h(Button, { kind: 'secondary', size: 'sm', onClick: apply }, t('common.apply')),
        h(Button, { kind: 'ghost', size: 'sm', onClick: clear }, t('common.clear')));
    }

    function CellValue({ value, t }) {
      if (value === null || value === undefined) return h('span', { className: 'dc-null' }, t('browse.null'));
      if (typeof value === 'object') {
        let printed;
        try {
          printed = JSON.stringify(value);
        } catch {
          printed = String(value);
        }
        return h('code', { className: 'dc-json', title: printed }, printed);
      }
      if (typeof value === 'boolean') return h('span', { className: 'dc-bool' }, value ? 'true' : 'false');
      const text = String(value);
      return h('span', { className: 'dc-cell-text', title: text }, text);
    }

    function DataTable({ columns, rows, t, onHeaderClick, onSort, sort = [], onEditCell, editedCells, emptyText }) {
      if (!Array.isArray(columns) || columns.length === 0) {
        return h('div', { className: 'dc-grid-empty' }, emptyText || t('browse.emptyRows'));
      }
      const activeSort = Array.isArray(sort) ? sort[0] : null;
      return h('div', { className: 'dc-grid-scroll' },
        h('table', { className: 'dc-grid' },
          h('caption', { className: 'dc-sr-only' }, t('browse.tableCaption')),
          h('thead', null, h('tr', null,
            h('th', { className: 'dc-grid-rownum', scope: 'col' }, '#'),
            columns.map((column, columnIndex) => {
              const active = activeSort?.field === column.name ? activeSort.dir : null;
              const content = [
                h('span', { key: 'name', className: 'dc-col-name' }, column.name),
                column.type ? h('span', { key: 'type', className: 'dc-col-type' }, column.type) : null
              ];
              return h('th', {
                key: `${column.name}-${columnIndex}`,
                scope: 'col',
                className: onSort || onHeaderClick ? 'dc-grid-th-action' : undefined,
                title: onSort ? t('browse.sortHint') : onHeaderClick ? t('browse.columnFilterHint') : undefined
              }, onSort || onHeaderClick ? h('div', { className: 'dc-grid-th-inner' },
                onSort ? h('button', {
                  type: 'button',
                  className: 'dc-grid-th-button',
                  onClick: () => onSort(column)
                }, h('span', { className: 'dc-grid-th-labels' }, content),
                active ? h('span', { className: 'dc-sort-mark' }, active === 'asc' ? '↑' : '↓') : null) : content,
                onHeaderClick ? h('button', {
                  type: 'button',
                  className: 'dc-grid-th-filter',
                  title: t('browse.columnFilterHint'),
                  'aria-label': t('browse.columnFilterHint'),
                  onClick: event => {
                    event.stopPropagation();
                    onHeaderClick(column);
                  }
                }, h(Icon, { name: 'filter', size: 11 })) : null
              ) : content);
            }))),
          h('tbody', null,
            rows && rows.length > 0 ? rows.map((row, rowIndex) => h('tr', { key: rowIndex },
              h('td', { className: 'dc-grid-rownum' }, rowIndex + 1),
              columns.map((column, columnIndex) => h('td', {
                key: `${column.name}-${columnIndex}`,
                className: cx(
                  onEditCell ? 'dc-cell-editable' : null,
                  editedCells?.has(`${rowIndex}\0${column.name}`) ? 'dc-cell-pending' : null
                ),
                onDoubleClick: onEditCell ? () => onEditCell(column, row, rowIndex) : undefined
              }, h(CellValue, { value: Array.isArray(row) ? row[columnIndex] : row?.[column.name], t })))))
              : h('tr', null, h('td', { className: 'dc-grid-empty-cell', colSpan: columns.length + 1 }, emptyText || t('browse.emptyRows'))))));
    }

    function Pager({ page, pageSize, hasMore, rowCount, loading, t, onPage, onPageSize }) {
      return h('div', { className: 'dc-pager' },
        h('span', { className: 'dc-pager-meta' }, t('browse.page', { page }), ' · ', t('browse.records', { count: rowCount }),
          hasMore ? ` · ${t('browse.morePages')}` : ''),
        h('span', { className: 'dc-pager-spacer' }),
        h('label', { className: 'dc-pager-size' },
          h('span', null, t('browse.pageSize')),
          h('select', {
            className: 'dc-input dc-select-xs',
            value: pageSize,
            onChange: event => onPageSize(Number(event.target.value)),
            'aria-label': t('browse.pageSize')
          }, [50, 100, 200].map(size => h('option', { key: size, value: size }, String(size))))),
        h(Button, { kind: 'ghost', size: 'sm', disabled: loading || page <= 1, onClick: () => onPage(page - 1) }, t('browse.prev')),
        h(Button, { kind: 'ghost', size: 'sm', disabled: loading || !hasMore, onClick: () => onPage(page + 1) }, t('browse.next')));
    }

    function CellEditorModal({ edit, t, onClose, onSave }) {
      const column = edit.column;
      const kind = cellEditorKind(column);
      const choices = kind === 'enum' ? enumChoices(column) : [];
      const initialText = kind === 'boolean'
        ? (edit.value === true || edit.value === 1 || edit.value === '1' || edit.value === 'true' ? 'true' : 'false')
        : cellEditorText(edit.value, kind);
      const [text, setText] = React.useState(initialText);
      const [isNull, setIsNull] = React.useState(edit.value === null);
      const [busy, setBusy] = React.useState(false);
      const [error, setError] = React.useState(null);
      const canNull = column.nullable === true;

      const submit = async () => {
        setError(null);
        let next = null;
        if (!isNull) {
          let value = text;
          if (kind === 'number') {
            value = value.trim();
            if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(value)) {
              setError(t('browse.invalidNumber'));
              return;
            }
          } else if (kind === 'json' || kind === 'array') {
            if (value.trim() === '') {
              setError(t('browse.invalidJson'));
              return;
            }
            try {
              JSON.parse(value);
            } catch {
              setError(t('browse.invalidJson'));
              return;
            }
          } else if (kind === 'boolean') {
            if (!['true', 'false'].includes(value)) {
              setError(t('browse.enterValue'));
              return;
            }
          } else if (kind === 'date' || kind === 'enum') {
            if (value.trim() === '') {
              setError(t('browse.enterValue'));
              return;
            }
          }
          next = value;
        }
        setBusy(true);
        try {
          await onSave(next);
        } catch (failure) {
          setError(messageOf(failure));
        } finally {
          setBusy(false);
        }
      };

      let control;
      if (kind === 'boolean') {
        control = h('select', {
          className: 'dc-input dc-mono',
          value: isNull ? '' : text,
          disabled: isNull,
          onChange: event => setText(event.target.value)
        }, h('option', { value: 'true' }, 'true'), h('option', { value: 'false' }, 'false'));
      } else if (kind === 'enum') {
        const values = choices.includes(initialText) ? choices : [initialText, ...choices];
        control = h('select', {
          className: 'dc-input dc-mono',
          value: isNull ? '' : text,
          disabled: isNull,
          onChange: event => setText(event.target.value)
        }, values.map(value => h('option', { key: value, value }, value)));
      } else if (kind === 'json' || kind === 'array') {
        control = h('textarea', {
          className: 'dc-input dc-mono dc-cell-textarea',
          rows: 6,
          value: isNull ? '' : text,
          disabled: isNull,
          spellCheck: false,
          placeholder: kind === 'array' ? '[1, 2, 3]' : '{\n  "key": "value"\n}',
          onChange: event => setText(event.target.value)
        });
      } else if (kind === 'number') {
        control = h('input', {
          className: 'dc-input dc-mono',
          type: 'text',
          inputMode: 'decimal',
          value: isNull ? '' : text,
          disabled: isNull,
          placeholder: column.type || '0',
          onChange: event => setText(event.target.value)
        });
      } else if (kind === 'date') {
        control = h('input', {
          className: 'dc-input dc-mono',
          value: isNull ? '' : text,
          disabled: isNull,
          placeholder: column.type || 'YYYY-MM-DD HH:mm:ss',
          onChange: event => setText(event.target.value)
        });
      } else if (kind === 'binary') {
        control = h('div', { className: 'dc-inline-warn' }, t('browse.binaryNotEditable'));
      } else {
        control = h('textarea', {
          className: 'dc-input dc-cell-textarea',
          rows: 3,
          value: isNull ? '' : text,
          disabled: isNull,
          onChange: event => setText(event.target.value)
        });
      }

      return h(Modal, {
        title: t('browse.editCellTitle'),
        onClose: busy ? () => {} : onClose,
        footer: h(React.Fragment, null,
          h(Button, { kind: 'ghost', onClick: onClose, disabled: busy }, t('common.cancel')),
          h(Button, {
            kind: 'primary',
            onClick: () => { void submit(); },
            disabled: busy || kind === 'binary'
          }, busy ? h(Spinner, { size: 13 }) : h(Icon, { name: 'check', size: 14 }), ` ${t('common.save')}`))
      },
      h('div', { className: 'dc-cell-editor' },
        h('div', { className: 'dc-cell-editor-head' },
          h('div', null,
            h('strong', { className: 'dc-cell-editor-field' }, column.name),
            edit.context ? h('span', { className: 'dc-cell-editor-context' }, edit.context) : null),
          h('div', { className: 'dc-cell-editor-badges' },
            h('span', { className: 'dc-type-pill' }, column.type || kind),
            column.primaryKey ? h('span', { className: 'dc-type-pill dc-type-pill-key' }, t('browse.primaryField')) : null)),
        column.primaryKey ? h('div', { className: 'dc-inline-warn' }, t('browse.editPrimaryWarning')) : null,
        h('label', { className: 'dc-field' },
          h('span', { className: 'dc-field-label' }, t('browse.fieldType')),
          control),
        canNull ? h('label', { className: 'dc-check' },
          h('input', {
            type: 'checkbox',
            checked: isNull,
            disabled: busy,
            onChange: event => setIsNull(event.target.checked)
          }),
          h('span', null, t('browse.setNull'))) : null,
        error ? h('div', { className: 'dc-inline-error' }, h(Icon, { name: 'alert', size: 14 }), h('span', null, error)) : null));
    }

    function TableBrowser({ state, actions, t }) {
      const data = state.tableData;
      const table = state.table;
      const kind = state.source?.kind;
      const [exporting, setExporting] = React.useState(null);
      const [notice, setNotice] = React.useState(null);
      const [filterSeed, setFilterSeed] = React.useState(0);
      const [seedField, setSeedField] = React.useState('');
      const [cellEdit, setCellEdit] = React.useState(null);
      const [pendingBusy, setPendingBusy] = React.useState(false);
      const [countBusy, setCountBusy] = React.useState(false);
      const filterKey = table?.key || '';
      const editableSource = kind === 'mysql' || kind === 'postgresql';
      const primaryColumns = (data.columns || []).filter(column => column.primaryKey);
      const pendingEdits = data.pendingEdits || [];
      const pendingCells = new Set(pendingEdits.map(edit => `${edit.rowIndex}\0${edit.column}`));
      const totalText = data.exactTotal !== null && data.exactTotal !== undefined
        ? t('common.rows', { count: num(data.exactTotal) })
        : data.estimatedTotal !== null && data.estimatedTotal !== undefined
          ? t('browse.estimatedRows', { count: num(data.estimatedTotal) })
          : null;
      const editHint = !editableSource
        ? t('browse.unsupportedEdit')
        : primaryColumns.length > 0
          ? t('browse.editCellHint')
          : t('browse.editNoPk');
      const structureLabel = kind === 'redis'
        ? t('browse.exportRedisStructure')
        : kind === 'elasticsearch'
          ? t('browse.exportEsStructure')
          : t('browse.exportStructure');
      const dataLabel = kind === 'redis'
        ? t('browse.exportRedisData')
        : kind === 'elasticsearch'
          ? t('browse.exportEsData')
          : t('browse.exportData');

      const doExport = async mode => {
        setExporting(mode);
        setNotice(null);
        try {
          const result = await actions.exportTable(mode);
          downloadText(result.filename, result.content, result.mime);
          setNotice({ text: t('browse.exportDone', { name: result.filename }), error: false });
        } catch (error) {
          setNotice({ text: messageOf(error), error: true });
        } finally {
          setExporting(null);
        }
      };
      const seedFilter = column => {
        setSeedField(column.name);
        setFilterSeed(value => value + 1);
      };
      const openCell = (column, row, rowIndex) => {
        if (!editableSource) {
          actions.reportError(t('browse.unsupportedEdit'));
          return;
        }
        if (primaryColumns.length === 0) {
          actions.reportError(t('browse.editNoPk'));
          return;
        }
        if (column.primaryKey) {
          actions.reportError(t('browse.editPkUnsupported'));
          return;
        }
        if (cellEditorKind(column) === 'binary') {
          actions.reportError(t('browse.binaryNotEditable'));
          return;
        }
        const value = Array.isArray(row) ? row[data.columns.indexOf(column)] : row?.[column.name];
        setCellEdit({
          column,
          row,
          rowIndex,
          value,
          context: [state.source?.name, state.database, tableLabelFor(table, kind, t)].filter(Boolean).join(' / ')
        });
      };
      const saveCell = async nextValue => {
        if (!cellEdit) return;
        const pk = {};
        for (const keyColumn of primaryColumns) {
          const index = data.columns.findIndex(column => column.name === keyColumn.name);
          const value = Array.isArray(cellEdit.row) ? cellEdit.row[index] : cellEdit.row?.[keyColumn.name];
          if (value === null || value === undefined) throw new Error(`主键字段 ${keyColumn.name} 的值为空，无法定位这一行。`);
          pk[keyColumn.name] = value;
        }
        await actions.stageCellEdit({
          column: cellEdit.column.name,
          value: nextValue,
          pk,
          rowIndex: cellEdit.rowIndex,
          beforeValue: cellHistoryValue(cellEdit.value)
        });
        setCellEdit(null);
        setNotice({ text: t('browse.pendingCount', { count: pendingEdits.length + 1 }), error: false });
      };
      const cycleSort = column => {
        const current = (data.sort || [])[0];
        let next = [{ field: column.name, dir: 'asc' }];
        if (current?.field === column.name) {
          next = current.dir === 'asc' ? [{ field: column.name, dir: 'desc' }] : [];
        }
        void actions.loadTableData({ page: 1, sort: next });
      };
      const countRows = async () => {
        if (countBusy) return;
        setCountBusy(true);
        setNotice(null);
        try {
          await actions.countTableRows();
        } catch (error) {
          setNotice({ text: messageOf(error), error: true });
        } finally {
          setCountBusy(false);
        }
      };
      const commitPending = async () => {
        if (pendingBusy || pendingEdits.length === 0) return;
        setPendingBusy(true);
        setNotice(null);
        try {
          const result = await actions.commitCellEdits();
          setNotice({ text: t('browse.pendingCommitted', { count: num(result?.count ?? pendingEdits.length) }), error: false });
        } catch (error) {
          setNotice({ text: `${t('browse.pendingCommitFailed')}: ${messageOf(error)}`, error: true });
        } finally {
          setPendingBusy(false);
        }
      };
      const discardPending = async () => {
        if (pendingBusy) return;
        setPendingBusy(true);
        setNotice(null);
        try {
          await actions.discardCellEdits();
        } catch (error) {
          setNotice({ text: messageOf(error), error: true });
        } finally {
          setPendingBusy(false);
        }
      };
      const closeTable = () => {
        if (pendingEdits.length > 0 && window.confirm(t('browse.pendingLeave')) !== true) return;
        actions.closeTable();
      };

      return h('section', { className: 'dc-content', 'aria-label': table?.label || table?.name || 'Table' },
        h('div', { className: 'dc-content-head' },
          h('div', { className: 'dc-breadcrumb' },
            h('span', null, state.source?.name || ''),
            h(Icon, { name: 'chevronRight', size: 12 }),
            h('span', null, state.database || ''),
            h(Icon, { name: 'chevronRight', size: 12 }),
            h('strong', null, tableLabelFor(table, kind, t))),
          h('div', { className: 'dc-content-actions' },
            editableSource ? h(Button, {
              kind: 'ghost',
              size: 'sm',
              onClick: () => { void countRows(); },
              disabled: countBusy || data.loading || pendingEdits.length > 0,
              title: t('browse.exactCount')
            }, countBusy ? h(Spinner, { size: 13 }) : h(Icon, { name: 'table', size: 14 }), ` ${countBusy ? t('browse.counting') : t('browse.exactCount')}`) : null,
            h(IconButton, { label: t('browse.refresh'), icon: 'refresh', onClick: () => { void actions.loadTableData({ page: data.page }); } }),
            h(Button, {
              kind: 'secondary',
              size: 'sm',
              onClick: () => { void doExport('structure'); },
              disabled: exporting !== null || pendingEdits.length > 0
            }, exporting === 'structure' ? h(Spinner, { size: 13 }) : h(Icon, { name: 'download', size: 14 }), ` ${structureLabel}`),
            h(Button, {
              kind: 'primary',
              size: 'sm',
              onClick: () => { void doExport('data'); },
              disabled: exporting !== null || pendingEdits.length > 0
            }, exporting === 'data' ? h(Spinner, { size: 13 }) : h(Icon, { name: 'download', size: 14 }), ` ${dataLabel}`))),
        notice ? h('div', { className: notice.error ? 'dc-inline-error' : 'dc-inline-note' },
          notice.error ? h(Icon, { name: 'alert', size: 14 }) : null,
          h('span', null, notice.text)) : null,
        h('div', { className: 'dc-table-headline' },
          h('div', null,
            h('h2', { className: 'dc-content-title' }, tableLabelFor(table, kind, t)),
            h('p', { className: 'dc-content-sub' },
              [table?.type, table?.schema, totalText, data.durationMs !== null ? t('sql.duration', { count: num(data.durationMs) }) : null]
                .filter(Boolean).join(' · '))),
          h('div', { className: 'dc-table-headline-actions' },
            data.columns?.length > 0 ? h('span', { className: 'dc-hint-inline' }, editHint) : null,
            h('button', {
              type: 'button',
              className: 'dc-link-btn',
              onClick: closeTable
            }, t('browse.closeTable')))),
        h(FilterBar, {
          key: filterKey,
          columns: data.columns || [],
          activeFilters: data.filters || [],
          t,
          seed: filterSeed,
          seedField,
          onApply: filters => { void actions.loadTableData({ page: 1, filters }); }
        }),
        data.orderHint === 'no_primary_key' ? h('div', { className: 'dc-inline-warn' },
          h(Icon, { name: 'info', size: 14 }), h('span', null, t('browse.noPkPaging'))) : null,
        pendingEdits.length > 0 ? h('div', { className: 'dc-pending-bar' },
          h('div', { className: 'dc-pending-head' },
            h('div', { className: 'dc-pending-title' },
              h(Icon, { name: 'edit', size: 14 }),
              h('strong', null, t('browse.pendingCount', { count: num(pendingEdits.length) })),
              h('span', { className: 'dc-pending-hint' }, t('browse.pendingHint'))),
            h('div', { className: 'dc-pending-actions' },
              h(Button, {
                kind: 'ghost',
                size: 'sm',
                onClick: () => { void discardPending(); },
                disabled: pendingBusy
              }, t('browse.discardEdits')),
              h(Button, {
                kind: 'primary',
                size: 'sm',
                onClick: () => { void commitPending(); },
                disabled: pendingBusy || data.pendingLoading
              }, pendingBusy ? h(Spinner, { size: 13 }) : h(Icon, { name: 'check', size: 13 }),
                ` ${pendingBusy ? t('browse.committing') : t('browse.commitEdits')}`))),
          h('details', { className: 'dc-pending-sql', open: true },
            h('summary', null, t('browse.pendingSql'), data.pendingLoading ? ` · ${t('browse.pendingPreview')}` : ''),
            h('pre', null, (data.pendingSql || []).map(item => item.sql).join('\n\n') || t('browse.pendingPreview')))) : null,
        h('div', { className: 'dc-grid-card', 'aria-busy': data.loading ? 'true' : 'false' },
          data.loading ? h('div', { className: 'dc-grid-loading' }, h(Spinner, { size: 18, label: t('browse.loading') }), t('browse.loading')) : null,
          h(DataTable, {
            columns: data.columns || [],
            rows: data.rows || [],
            t,
            onHeaderClick: seedFilter,
            onSort: editableSource ? column => { void cycleSort(column); } : undefined,
            sort: data.sort || [],
            editedCells: pendingCells,
            onEditCell: editableSource && !data.loading ? openCell : undefined,
            emptyText: t('browse.emptyRows')
          })),
        data.truncatedScan ? h('div', { className: 'dc-inline-warn' }, t('browse.truncatedScan')) : null,
        h(Pager, {
          page: data.page || 1,
          pageSize: data.pageSize || PAGE_SIZE,
          hasMore: Boolean(data.hasMore),
          rowCount: (data.rows || []).length,
          loading: data.loading,
          t,
          onPage: page => { void actions.loadTableData({ page }); },
          onPageSize: pageSize => { void actions.loadTableData({ page: 1, pageSize }); }
        }),
        cellEdit ? h(CellEditorModal, {
          key: `${cellEdit.rowIndex}-${cellEdit.column.name}`,
          edit: cellEdit,
          t,
          onClose: () => setCellEdit(null),
          onSave: saveCell
        }) : null);
    }

    function DatabaseOverview({ state, actions, t, canManageDatabases, onCreateDatabase, onDeleteDatabase }) {
      const [query, setQuery] = React.useState('');
      React.useEffect(() => setQuery(''), [state.sourceId, state.database]);
      const tables = state.tables.filter(table => {
        if (!query.trim()) return true;
        const needle = query.trim().toLowerCase();
        return String(table.name).toLowerCase().includes(needle) || String(table.label || '').toLowerCase().includes(needle);
      });
      const systemDatabase = isSystemDatabase(state.source?.kind, state.database);
      return h('section', { className: 'dc-content', 'aria-label': t('browse.tablesTitle') },
        h('div', { className: 'dc-content-head' },
          h('div', { className: 'dc-breadcrumb' },
            h('span', null, state.source?.name || ''),
            h(Icon, { name: 'chevronRight', size: 12 }),
            h('strong', null, state.database || '')),
          h('div', { className: 'dc-content-actions' },
            canManageDatabases ? h(Button, {
              kind: 'ghost',
              size: 'sm',
              onClick: onCreateDatabase,
              disabled: state.sourceBusy
            }, h(Icon, { name: 'plus', size: 13 }), ` ${t('db.create')}`) : null,
            canManageDatabases ? h(Button, {
              kind: 'ghost',
              size: 'sm',
              className: 'dc-danger-text',
              onClick: () => onDeleteDatabase(state.database),
              disabled: state.sourceBusy || !state.database || systemDatabase,
              title: systemDatabase ? t('db.systemProtected') : t('db.drop')
            }, h(Icon, { name: 'trash', size: 13 }), ` ${t('db.drop')}`) : null,
            h(IconButton, { label: t('common.refresh'), icon: 'refresh', onClick: () => { void actions.refreshTables(); } }))),
        h('div', { className: 'dc-overview-head' },
          h('div', null,
            h('h2', { className: 'dc-content-title' }, state.database || t('browse.noDatabase'),
              systemDatabase ? h('span', { className: 'dc-system-pill' }, t('db.system')) : null),
            h('p', { className: 'dc-content-sub' }, t('browse.tablesSubtitle', { count: num(state.tables.length) }))),
          h('label', { className: 'dc-search-box' },
            h(Icon, { name: 'search', size: 14 }),
            h('input', {
              className: 'dc-mini-input',
              value: query,
              placeholder: t('common.search'),
              'aria-label': t('common.search'),
              onChange: event => setQuery(event.target.value)
            }))),
        state.tablesBusy ? h('div', { className: 'dc-overview-loading' }, h(Spinner, { size: 18 }), t('tree.loadingTables')) : null,
        !state.tablesBusy && state.tablesError ? h('div', { className: 'dc-overview-error' },
          h('div', { className: 'dc-inline-error' }, h(Icon, { name: 'alert', size: 15 }), h('span', null, state.tablesError)),
          h(Button, { kind: 'secondary', size: 'sm', onClick: () => { void actions.refreshTables(); } }, t('common.retry'))) : null,
        !state.tablesBusy && !state.tablesError && state.tables.length === 0 ? h(EmptyState, {
          title: t('browse.noTables'),
          text: t('browse.noTablesHint'),
          icon: 'table'
        }) : null,
        !state.tablesBusy && state.tables.length > 0 && tables.length === 0 ? h('div', { className: 'dc-grid-empty' }, t('browse.emptyRows')) : null,
        h('div', { className: 'dc-table-cards' },
          tables.map(table => h('button', {
            key: table.key || `${table.schema}.${table.name}`,
            type: 'button',
            className: 'dc-table-card',
            onClick: () => { void actions.selectTable(table); }
          },
          h('span', { className: 'dc-table-card-icon' }, h(Icon, { name: table.type === 'view' || table.type === 'materialized view' ? 'columns' : 'table', size: 18 })),
          h('span', { className: 'dc-table-card-copy' },
            h('span', { className: 'dc-table-card-name' }, tableLabelFor(table, state.source?.kind, t)),
            h('span', { className: 'dc-table-card-meta' }, [table.schema, table.type, table.detail].filter(Boolean).join(' · '))),
          h(Icon, { name: 'chevronRight', size: 14 })))));
    }

    function WelcomeView({ sources, t, onAdd, hasSource }) {
      return h('section', { className: 'dc-content dc-welcome' },
        h('div', { className: 'dc-welcome-mark' }, h(SidebarIcon, { size: 52, active: true })),
        h('h1', { className: 'dc-welcome-title' }, hasSource ? t('browse.selectSource') : t('browse.welcomeTitle')),
        h('p', { className: 'dc-welcome-text' }, hasSource ? t('browse.selectSourceHint') : t('browse.welcomeText')),
        !hasSource ? h(Button, { kind: 'primary', onClick: onAdd }, h(Icon, { name: 'plus', size: 15 }), ` ${t('source.add')}`) : null,
        h('div', { className: 'dc-welcome-steps' },
          h('div', { className: 'dc-welcome-step' }, h(Icon, { name: 'database', size: 16 }), t('source.emptyStep1')),
          h('div', { className: 'dc-welcome-step' }, h(Icon, { name: 'table', size: 16 }), t('source.emptyStep2')),
          h('div', { className: 'dc-welcome-step' }, h(Icon, { name: 'sparkles', size: 16 }), t('source.emptyStep3'))));
    }

    // ---------------------------------------------------------------------
    // SQL playground.
    // ---------------------------------------------------------------------
    function ResultTable({ columns, rows, t }) {
      if (!Array.isArray(columns) || columns.length === 0) return null;
      return h('div', { className: 'dc-result-scroll' },
        h('table', { className: 'dc-grid dc-grid-result' },
          h('caption', { className: 'dc-sr-only' }, t('sql.result')),
          h('thead', null, h('tr', null,
            h('th', { className: 'dc-grid-rownum', scope: 'col' }, '#'),
            columns.map(column => h('th', { key: column.name, scope: 'col' },
              h('span', { className: 'dc-col-name' }, column.name),
              column.type ? h('span', { className: 'dc-col-type' }, column.type) : null)))),
          h('tbody', null,
            rows && rows.length > 0 ? rows.map((row, rowIndex) => h('tr', { key: rowIndex },
              h('td', { className: 'dc-grid-rownum' }, rowIndex + 1),
              columns.map((column, columnIndex) => h('td', { key: `${column.name}-${columnIndex}` },
                h(CellValue, { value: Array.isArray(row) ? row[columnIndex] : row?.[column.name], t })))))
              : h('tr', null, h('td', { className: 'dc-grid-empty-cell', colSpan: columns.length + 1 }, t('browse.emptyRows'))))));
    }

    const SQL_KEYWORDS = new Set(`
      SELECT FROM WHERE GROUP BY ORDER HAVING LIMIT OFFSET UNION ALL EXCEPT INTERSECT
      INSERT INTO VALUES UPDATE SET DELETE JOIN LEFT RIGHT INNER OUTER FULL CROSS STRAIGHT_JOIN
      ON AS AND OR NOT NULL IS IN LIKE ILIKE BETWEEN EXISTS CASE WHEN THEN ELSE END DISTINCT
      ASC DESC WITH RECURSIVE RETURNING CONFLICT DO NOTHING OVER PARTITION WINDOW ROWS RANGE
      PRECEDING FOLLOWING CURRENT ROW FETCH FIRST NEXT ONLY FOR SHARE NOWAIT SKIP LOCKED
      CREATE TABLE ALTER DROP INDEX VIEW DATABASE SCHEMA PRIMARY KEY FOREIGN REFERENCES UNIQUE
      CHECK DEFAULT CONSTRAINT IF EXISTS CASCADE RESTRICT TRUNCATE RENAME ADD COLUMN TYPE USING
      NATURAL LATERAL MATERIALIZED EXPLAIN ANALYZE DESCRIBE SHOW USE GRANT REVOKE BEGIN COMMIT
      ROLLBACK TRANSACTION SAVEPOINT RELEASE TRUE FALSE UNKNOWN ANY SOME ESCAPE SIMILAR OVER
      FILTER WITHIN TABLESAMPLE REGEXP RLIKE UNSIGNED ZEROFILL CURRENT_TIMESTAMP CURRENT_DATE
      CURRENT_TIME LOCALTIME LOCALTIMESTAMP
    `.trim().split(/\s+/));

    const SQL_TYPES = new Set(`
      INT INTEGER SMALLINT BIGINT TINYINT MEDIUMINT DECIMAL NUMERIC FLOAT DOUBLE REAL BOOLEAN BOOL
      CHAR VARCHAR CHARACTER TEXT TINYTEXT MEDIUMTEXT LONGTEXT BLOB TINYBLOB MEDIUMBLOB LONGBLOB
      BINARY VARBINARY BYTEA DATE DATETIME TIMESTAMP TIME TIMETZ TIMESTAMPTZ INTERVAL JSON JSONB
      UUID XML MONEY SERIAL BIGSERIAL SMALLSERIAL ENUM SET BIT VARBIT
    `.trim().split(/\s+/));

    const SQL_JOIN_MODIFIERS = new Set(['LEFT', 'RIGHT', 'INNER', 'OUTER', 'FULL', 'CROSS']);
    const SQL_NEWLINE_CLAUSES = new Set(['where', 'having', 'on']);
    const SQL_COMMA_CLAUSES = new Set(['select', 'from', 'set', 'group', 'order']);

    /** Tokenize enough SQL to color and reformat without changing tokens. */
    function tokenizeSql(sql, dialect) {
      const text = String(sql || '');
      const tokens = [];
      const push = (type, value) => tokens.push({ type, value });
      const hashComment = dialect === 'mysql';
      let index = 0;
      while (index < text.length) {
        const char = text[index];
        if (/\s/.test(char)) {
          let end = index + 1;
          while (end < text.length && /\s/.test(text[end])) end++;
          push('whitespace', text.slice(index, end));
          index = end;
          continue;
        }
        if (char === '-' && text[index + 1] === '-') {
          let end = text.indexOf('\n', index + 2);
          if (end < 0) end = text.length;
          push('comment', text.slice(index, end));
          index = end;
          continue;
        }
        if (char === '#' && hashComment) {
          let end = text.indexOf('\n', index + 1);
          if (end < 0) end = text.length;
          push('comment', text.slice(index, end));
          index = end;
          continue;
        }
        if (char === '/' && text[index + 1] === '*') {
          const close = text.indexOf('*/', index + 2);
          const end = close < 0 ? text.length : close + 2;
          push('comment', text.slice(index, end));
          index = end;
          continue;
        }
        if (char === "'" || char === '"' || char === '`') {
          let end = index + 1;
          while (end < text.length) {
            if (text[end] === '\\' && char !== '`') {
              end += 2;
              continue;
            }
            if (text[end] === char) {
              if (text[end + 1] === char) {
                end += 2;
                continue;
              }
              end++;
              break;
            }
            end++;
          }
          push(char === "'" ? 'string' : 'identifier', text.slice(index, Math.min(end, text.length)));
          index = Math.min(end, text.length);
          continue;
        }
        if (char === '$') {
          const rest = text.slice(index);
          const dollar = /^\$([A-Za-z_][A-Za-z0-9_]*)?\$/.exec(rest);
          if (dollar) {
            const tag = dollar[0];
            const close = text.indexOf(tag, index + tag.length);
            const end = close < 0 ? text.length : close + tag.length;
            push('string', text.slice(index, end));
            index = end;
            continue;
          }
          const param = /^\$[0-9]+/.exec(rest);
          if (param) {
            push('parameter', param[0]);
            index += param[0].length;
            continue;
          }
        }
        if (char === ':' && text[index + 1] === ':') {
          push('operator', '::');
          index += 2;
          continue;
        }
        if (char === ':' && /[A-Za-z_]/.test(text[index + 1] || '')) {
          let end = index + 2;
          while (end < text.length && /[A-Za-z0-9_]/.test(text[end])) end++;
          push('parameter', text.slice(index, end));
          index = end;
          continue;
        }
        if (char === '@' && /[A-Za-z0-9_@$]/.test(text[index + 1] || '')) {
          let end = index + 1;
          while (end < text.length && /[A-Za-z0-9_@$]/.test(text[end])) end++;
          push('parameter', text.slice(index, end));
          index = end;
          continue;
        }
        if (/[0-9]/.test(char) || (char === '.' && /[0-9]/.test(text[index + 1] || ''))) {
          const match = /^(?:0[xX][0-9a-fA-F]+|\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/.exec(text.slice(index));
          if (match) {
            push('number', match[0]);
            index += match[0].length;
            continue;
          }
        }
        if (/[A-Za-z_]/.test(char)) {
          // E'...', N'...', X'...', B'...', U&'...' and MySQL charset
          // introducers must stay glued to their string literal.
          const prefix = /^(?:[EeNnXxBb]|[Uu]&|_[A-Za-z0-9]+)(?=['"])/.exec(text.slice(index));
          if (prefix) {
            const quote = text[index + prefix[0].length];
            let end = index + prefix[0].length + 1;
            while (end < text.length) {
              if (text[end] === '\\' && quote === "'") {
                end += 2;
                continue;
              }
              if (text[end] === quote) {
                if (text[end + 1] === quote) {
                  end += 2;
                  continue;
                }
                end++;
                break;
              }
              end++;
            }
            push(quote === "'" ? 'string' : 'identifier', text.slice(index, Math.min(end, text.length)));
            index = Math.min(end, text.length);
            continue;
          }
          const match = /^[A-Za-z_][A-Za-z0-9_$]*/.exec(text.slice(index));
          const word = match[0];
          let look = index + word.length;
          while (look < text.length && /\s/.test(text[look])) look++;
          const upper = word.toUpperCase();
          const type = SQL_KEYWORDS.has(upper)
            ? 'keyword'
            : SQL_TYPES.has(upper)
              ? 'type'
              : text[look] === '(' ? 'function' : 'plain';
          push(type, word);
          index += word.length;
          continue;
        }
        const operator = /^(?:<=>|->>|->|#>>|#>|#-|@>|<@|@\?|@@|!~\*|!~|~\*|\?\||\?&|::|:=|=>|<=|>=|<>|!=|\|\||&&|[-+*/%<>=!~^&|?#@])/.exec(text.slice(index));
        if (operator) {
          push('operator', operator[0]);
          index += operator[0].length;
          continue;
        }
        if (',;.()[]{}'.includes(char)) {
          push('punctuation', char);
          index++;
          continue;
        }
        push('plain', char);
        index++;
      }
      return tokens;
    }

    /** Conservative SQL pretty-printer: tokens never change, only whitespace
     * and the case of unquoted keywords/types. */
    function formatSql(sql, dialect) {
      const tokens = tokenizeSql(sql, dialect).filter(token => token.type !== 'whitespace');
      if (tokens.length === 0) return '';
      let out = '';
      let parenDepth = 0;
      let bracketDepth = 0;
      let clause = null;
      let clauseDepth = 0;
      const clauseStack = [];
      let prev = null;
      let previousWord = '';

      const trimEnd = () => { out = out.replace(/[ \t]+$/, ''); };
      const atLineStart = () => out.length === 0 || /(^|\n)[ \t]*$/.test(out);
      const newline = (level = 0) => {
        if (!out) return;
        trimEnd();
        if (!out.endsWith('\n')) out += '\n';
        out += '  '.repeat(Math.max(0, level));
      };
      const space = () => {
        if (!out || /[ \t\n]$/.test(out)) return;
        out += ' ';
      };
      const write = value => { out += value; };
      const nextWord = index => tokens[index + 1]?.value?.toUpperCase() || '';

      for (let index = 0; index < tokens.length; index++) {
        const token = tokens[index];
        const value = token.value;
        const upper = value.toUpperCase();

        if (token.type === 'comment') {
          if (value.startsWith('--') || value.startsWith('#')) {
            if (out && !atLineStart()) newline(parenDepth);
            write(value);
            if (index < tokens.length - 1) newline(parenDepth);
          } else {
            if (!atLineStart()) space();
            write(value);
            if (index < tokens.length - 1) space();
          }
          prev = token;
          continue;
        }

        if (token.type === 'punctuation') {
          if (value === '(') {
            if (prev && !atLineStart() && !['(', '.', '[', '::'].includes(prev.value)
              && (prev.type === 'keyword' || prev.type === 'type' || prev.type === 'operator' || prev.value === ')')) {
              space();
            }
            clauseStack.push({ clause, clauseDepth });
            write('(');
            parenDepth++;
          } else if (value === ')') {
            trimEnd();
            write(')');
            parenDepth = Math.max(0, parenDepth - 1);
            const restored = clauseStack.pop();
            if (restored) {
              clause = restored.clause;
              clauseDepth = restored.clauseDepth;
            }
          } else if (value === ',') {
            trimEnd();
            write(',');
            if (clause && SQL_COMMA_CLAUSES.has(clause) && bracketDepth === 0 && parenDepth === clauseDepth) {
              newline(parenDepth + 1);
            } else {
              space();
            }
          } else if (value === ';') {
            trimEnd();
            write(';');
            parenDepth = 0;
            bracketDepth = 0;
            clause = null;
            clauseDepth = 0;
            clauseStack.length = 0;
            if (index < tokens.length - 1) out += '\n\n';
          } else if (value === '.') {
            trimEnd();
            write('.');
          } else if (value === '[') {
            write('[');
            bracketDepth++;
          } else if (value === ']') {
            trimEnd();
            write(']');
            bracketDepth = Math.max(0, bracketDepth - 1);
          } else if (value === '{' || value === '}') {
            write(value);
          } else {
            write(value);
          }
          prev = token;
          previousWord = '';
          continue;
        }

        if (token.type === 'operator') {
          if (value === '::') {
            trimEnd();
            write('::');
          } else if (value === '*') {
            if (!out || atLineStart() || (prev && ['(', '.', '::'].includes(prev.value))) {
              write('*');
            } else {
              space();
              write('*');
              space();
            }
          } else {
            if (prev && !atLineStart() && !['(', '.', '::', '['].includes(prev.value)) space();
            write(value);
            if (index < tokens.length - 1 && !atLineStart()) space();
          }
          prev = token;
          previousWord = '';
          continue;
        }

        if (token.type === 'keyword' || token.type === 'type') {
          const word = upper;
          const isJoinModifier = SQL_JOIN_MODIFIERS.has(word)
            && (nextWord(index) === 'JOIN' || (nextWord(index) === 'OUTER' && tokens[index + 2]?.value?.toUpperCase() === 'JOIN'));

          if (word === 'SELECT') {
            newline(parenDepth);
            write('SELECT');
            clause = 'select';
            clauseDepth = parenDepth;
            newline(parenDepth + 1);
          } else if (word === 'FROM') {
            if (previousWord === 'DELETE') space();
            else newline(parenDepth);
            write('FROM');
            clause = 'from';
            clauseDepth = parenDepth;
          } else if (word === 'WHERE' || word === 'HAVING') {
            newline(parenDepth);
            write(word);
            clause = word.toLowerCase();
            clauseDepth = parenDepth;
          } else if (word === 'GROUP' || word === 'ORDER') {
            newline(parenDepth);
            write(word);
            clause = word.toLowerCase();
            clauseDepth = parenDepth;
          } else if (word === 'LIMIT' || word === 'OFFSET' || word === 'RETURNING') {
            newline(parenDepth);
            write(word);
            clause = word.toLowerCase();
            clauseDepth = parenDepth;
          } else if (word === 'UNION' || word === 'EXCEPT' || word === 'INTERSECT') {
            newline(parenDepth);
            write(word);
            clause = null;
          } else if (word === 'SET') {
            newline(parenDepth);
            write('SET');
            clause = 'set';
            clauseDepth = parenDepth;
            newline(parenDepth + 1);
          } else if (word === 'VALUES') {
            newline(parenDepth);
            write('VALUES');
            clause = 'values';
            clauseDepth = parenDepth;
          } else if (word === 'WITH') {
            newline(parenDepth);
            write(word);
            clause = null;
          } else if (word === 'JOIN') {
            if (SQL_JOIN_MODIFIERS.has(previousWord)) space();
            else newline(parenDepth);
            write('JOIN');
            clause = 'join';
            clauseDepth = parenDepth;
          } else if (isJoinModifier) {
            if (SQL_JOIN_MODIFIERS.has(previousWord)) space();
            else newline(parenDepth);
            write(word);
            clause = 'join';
            clauseDepth = parenDepth;
          } else if (word === 'ON') {
            if (!atLineStart()) space();
            write('ON');
            clause = 'on';
            clauseDepth = parenDepth;
          } else if (word === 'AND' || word === 'OR') {
            if (SQL_NEWLINE_CLAUSES.has(clause || '') && !atLineStart()) newline(parenDepth + 1);
            else space();
            write(word);
          } else {
            if (!atLineStart() && prev && !['(', '.', '[', '::'].includes(prev.value)) space();
            write(word);
          }
          prev = { ...token, value: word };
          previousWord = word;
          continue;
        }

        if (!atLineStart() && prev && !['(', '.', '[', '::'].includes(prev.value)) space();
        write(value);
        prev = token;
        previousWord = '';
      }

      return out.trim();
    }

    function PlaygroundView({ state, actions, t }) {
      const playground = state.playground;
      const editor = React.useRef(null);
      const highlight = React.useRef(null);
      const splitBox = React.useRef(null);
      const [split, setSplit] = React.useState(44);
      const [resizing, setResizing] = React.useState(false);
      const [confirm, setConfirm] = React.useState(null);
      const [confirmBusy, setConfirmBusy] = React.useState(false);
      const kind = state.source?.kind;
      const isSqlKind = kind !== 'redis' && kind !== 'elasticsearch';
      const highlightedSql = React.useMemo(() => tokenizeSql(playground.sql, kind), [playground.sql, kind]);
      const placeholder = kind === 'redis'
        ? t('sql.placeholderRedis')
        : kind === 'elasticsearch'
          ? t('sql.placeholderEs')
          : t('sql.placeholder');
      const activeSet = (playground.sets || [])[playground.activeSet] || (playground.sets || [])[0] || null;
      const staleResult = Boolean(playground.context
        && (playground.context.sourceId !== state.sourceId || playground.context.database !== state.database));

      const syncScroll = () => {
        const area = editor.current;
        const layer = highlight.current;
        if (!area || !layer) return;
        layer.scrollTop = area.scrollTop;
        layer.scrollLeft = area.scrollLeft;
      };
      React.useEffect(() => {
        syncScroll();
      }, [playground.sql]);
      const formatEditor = () => {
        if (!isSqlKind) return;
        const node = editor.current;
        const text = playground.sql || '';
        const start = node ? node.selectionStart : text.length;
        const end = node ? node.selectionEnd : text.length;
        const hasSelection = end > start;
        const source = hasSelection ? text.slice(start, end) : text;
        const formatted = formatSql(source, kind);
        if (formatted === source) {
          node?.focus();
          return;
        }
        const next = hasSelection ? `${text.slice(0, start)}${formatted}${text.slice(end)}` : formatted;
        actions.setPlaygroundSql(next);
        window.setTimeout(() => {
          const area = editor.current;
          if (!area) return;
          area.focus();
          const selectionStart = hasSelection ? start : next.length;
          const selectionEnd = hasSelection ? start + formatted.length : next.length;
          area.setSelectionRange(selectionStart, selectionEnd);
          syncScroll();
        }, 0);
      };

      const run = async () => {
        const text = playground.sql || '';
        let sql = text;
        if (editor.current && editor.current.selectionStart !== editor.current.selectionEnd) {
          const selected = text.slice(editor.current.selectionStart, editor.current.selectionEnd);
          if (selected.trim()) sql = selected;
        }
        if (!sql.trim()) {
          actions.reportError(t('sql.empty'));
          return;
        }
        try {
          const result = await actions.runPlayground(sql, false);
          if (result?.requiresConfirmation) setConfirm({ sql, risk: result.risk || 'write' });
        } catch {
          // The store exposes the error in the result area and banner.
        }
      };
      React.useEffect(() => {
        if (!resizing) return;
        const move = event => {
          const box = splitBox.current;
          if (!box) return;
          const rect = box.getBoundingClientRect();
          if (rect.height <= 0) return;
          const next = ((event.clientY - rect.top) / rect.height) * 100;
          setSplit(Math.max(22, Math.min(78, next)));
        };
        const stop = () => setResizing(false);
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', stop);
        window.addEventListener('pointercancel', stop);
        return () => {
          window.removeEventListener('pointermove', move);
          window.removeEventListener('pointerup', stop);
          window.removeEventListener('pointercancel', stop);
        };
      }, [resizing]);
      const confirmRun = async () => {
        if (!confirm) return;
        setConfirmBusy(true);
        try {
          await actions.runPlayground(confirm.sql, true);
          setConfirm(null);
        } catch {
          // Keep the error visible in the panel.
        } finally {
          setConfirmBusy(false);
        }
      };

      return h('section', { className: 'dc-content dc-sql-page', 'aria-label': t('sql.title') },
        h('div', { className: 'dc-content-head' },
          h('div', { className: 'dc-breadcrumb' },
            h(Icon, { name: 'terminal', size: 14 }),
            h('strong', null, t('sql.title'))),
          h('div', { className: 'dc-content-actions' },
            h('span', { className: 'dc-hint-inline' }, t('sql.selectionHint')))),
        h('div', { className: 'dc-sql-context' },
          h('label', { className: 'dc-context-field' },
            h('span', null, t('ai.instance')),
            h('select', {
              className: 'dc-input dc-select-sm',
              value: state.sourceId || '',
              disabled: state.sourceBusy || playground.running,
              onChange: event => { void actions.connect(event.target.value); }
            },
            h('option', { value: '' }, t('ai.selectSource')),
            state.sources.map(source => h('option', { key: source.id, value: source.id }, source.name)))),
          h('label', { className: 'dc-context-field' },
            h('span', null, t('ai.database')),
            h('select', {
              className: 'dc-input dc-select-sm',
              value: state.database || '',
              disabled: playground.running,
              onChange: event => { void actions.selectDatabase(event.target.value); }
            },
            h('option', { value: '' }, t('ai.selectDatabase')),
            state.databases.map(database => h('option', { key: database.name, value: database.name }, database.name)))),
          state.sourceBusy ? h('span', { className: 'dc-context-loading' }, h(Spinner, { size: 14 }), t('source.connecting')) : null,
          h('span', { className: 'dc-context-spacer' }),
          h(Button, {
            kind: 'primary',
            onClick: () => { void run(); },
            disabled: playground.running || !state.sourceId || !state.database
          }, playground.running ? h(Spinner, { size: 14 }) : h(Icon, { name: 'play', size: 15 }), ` ${playground.running ? t('sql.running') : t('sql.run')}`)),
        h('div', {
          ref: splitBox,
          className: cx('dc-sql-split', playground.minimized && 'dc-sql-split-minimized', resizing && 'dc-sql-split-resizing')
        },
          h('div', {
            className: 'dc-editor-card',
            style: playground.minimized ? undefined : { flexBasis: `${split}%` }
          },
            h('div', { className: 'dc-editor-head' },
              h('span', { className: 'dc-editor-title' }, t('sql.statement')),
              h('span', { className: 'dc-editor-hint' }, t('sql.aiHint')),
              isSqlKind ? h(Button, {
                kind: 'ghost',
                size: 'sm',
                onClick: formatEditor,
                disabled: !playground.sql.trim(),
                title: t('sql.formatHint')
              }, h(Icon, { name: 'format', size: 12 }), ` ${t('sql.format')}`) : null,
              playground.previousSql ? h(Button, { kind: 'ghost', size: 'sm', onClick: actions.restorePreviousSql }, t('sql.restorePrevious')) : null),
            h('div', { className: 'dc-editor-wrap' },
              h('pre', { ref: highlight, className: 'dc-editor-highlight', 'aria-hidden': 'true' },
                h('code', null, highlightedSql.map((token, index) => token.type === 'whitespace' || token.type === 'plain'
                  ? token.value
                  : h('span', { key: index, className: `dc-sql-${token.type}` }, token.value)))),
              h('textarea', {
                ref: editor,
                className: 'dc-editor',
                value: playground.sql,
                wrap: 'off',
                spellCheck: false,
                autoCorrect: 'off',
                autoCapitalize: 'off',
                placeholder,
                'aria-label': t('sql.statement'),
                onScroll: syncScroll,
                onChange: event => actions.setPlaygroundSql(event.target.value),
                onKeyDown: event => {
                  if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                    event.preventDefault();
                    void run();
                  }
                }
              }))),
          playground.minimized ? null : h('div', {
            className: cx('dc-sql-divider', resizing && 'dc-sql-divider-active'),
            role: 'separator',
            'aria-orientation': 'horizontal',
            'aria-label': t('sql.resize'),
            'aria-valuenow': Math.round(split),
            'aria-valuemin': 22,
            'aria-valuemax': 78,
            tabIndex: 0,
            onPointerDown: event => {
              event.preventDefault();
              setResizing(true);
            },
            onKeyDown: event => {
              if (event.key === 'ArrowUp') {
                event.preventDefault();
                setSplit(value => Math.max(22, value - 4));
              } else if (event.key === 'ArrowDown') {
                event.preventDefault();
                setSplit(value => Math.min(78, value + 4));
              }
            }
          }, h('span', { className: 'dc-sql-divider-grip' }, h(Icon, { name: 'grip', size: 14 }))),
          h('div', { className: cx('dc-result-card', playground.minimized && 'dc-result-card-minimized') },
            h('div', { className: 'dc-result-head' },
              h('div', { className: 'dc-result-title-wrap' },
                h('span', { className: 'dc-result-title' }, t('sql.result')),
                playground.context ? h('span', { className: 'dc-result-context' }, t('sql.resultContext', {
                  source: playground.context.sourceName,
                  database: playground.context.database
                })) : null,
                playground.risk ? h(RiskBadge, { risk: playground.risk, t }) : null,
                playground.durationMs !== null ? h('span', { className: 'dc-result-meta' }, t('sql.duration', { count: num(playground.durationMs) })) : null),
              h('div', { className: 'dc-result-actions' },
                playground.running ? h('span', { className: 'dc-thinking' }, h(Spinner, { size: 13 }), t('sql.running')) : null,
                h(IconButton, {
                  label: playground.minimized ? t('sql.expand') : t('sql.minimize'),
                  icon: playground.minimized ? 'maximize' : 'minimize',
                  onClick: actions.togglePlaygroundMinimized
                }))),
            playground.minimized ? (playground.sets?.length > 0
              ? h('div', { className: 'dc-result-minimized-summary' },
                t('sql.minimized'), ' · ', t('sql.tabs', { index: activeSet?.index + 1 || 1 }), activeSet?.message ? ` · ${activeSet.message}` : '')
              : h('div', { className: 'dc-result-minimized-summary' }, t('sql.minimized'))) : h('div', { className: 'dc-result-body' },
              staleResult ? h('div', { className: 'dc-inline-warn dc-result-context-warn' },
                h(Icon, { name: 'alert', size: 14 }),
                h('span', null, t('sql.staleResult', {
                  source: playground.context.sourceName,
                  database: playground.context.database
                }))) : null,
              playground.error ? h('div', { className: 'dc-inline-error dc-result-error' }, h(Icon, { name: 'alert', size: 15 }), h('span', null, playground.error)) : null,
              (playground.sets || []).length > 1 ? h('div', { className: 'dc-result-tabs', role: 'tablist' },
                playground.sets.map((set, index) => h('button', {
                  key: index,
                  type: 'button',
                  role: 'tab',
                  'aria-selected': playground.activeSet === index ? 'true' : 'false',
                  className: cx('dc-result-tab', playground.activeSet === index && 'dc-result-tab-active'),
                  onClick: () => actions.setActiveSet(index)
                }, set.label || t('sql.tabs', { index: index + 1 })))) : null,
              activeSet
                ? h(React.Fragment, null,
                  h('div', { className: 'dc-result-summary' }, `${activeSet.message || ''}${Number.isFinite(Number(activeSet.affectedRows)) && activeSet.affectedRows > 0 ? ` · ${t('sql.affected', { count: num(activeSet.affectedRows) })}` : ''}`),
                  activeSet.truncated ? h('div', { className: 'dc-inline-warn dc-result-truncated' }, h(Icon, { name: 'alert', size: 14 }), h('span', null, t('sql.truncated', { count: num((activeSet.rows || []).length) }))) : null,
                  h(ResultTable, { columns: activeSet.columns || [], rows: activeSet.rows || [], t }))
                : (playground.running ? h('div', { className: 'dc-result-placeholder' }, h(Spinner, { size: 20 }), t('common.loading'))
                  : h('div', { className: 'dc-result-placeholder' }, h(Icon, { name: 'terminal', size: 22 }), t('sql.noResult')))))),
        confirm ? h(Modal, {
          title: t('sql.confirmTitle'),
          onClose: confirmBusy ? () => {} : () => setConfirm(null),
          footer: h(React.Fragment, null,
            h(Button, { kind: 'ghost', onClick: () => setConfirm(null), disabled: confirmBusy }, t('ai.cancel')),
            h(Button, { kind: confirm.risk === 'danger' ? 'danger' : 'primary', onClick: () => { void confirmRun(); }, disabled: confirmBusy },
              confirmBusy ? h(Spinner, { size: 13 }) : h(Icon, { name: 'alert', size: 14 }), ` ${t('sql.confirmRun')}`))
        },
        h('div', { className: 'dc-confirm-body' },
          h('div', { className: 'dc-confirm-icon dc-confirm-icon-danger' }, h(Icon, { name: 'alert', size: 20 })),
          h('div', { className: 'dc-confirm-copy' },
            h('p', { className: 'dc-confirm-message' }, t('sql.confirmText')),
            h('p', { className: 'dc-confirm-target' }, t('sql.confirmTarget', {
              source: state.source?.name || state.sourceId || '',
              database: state.database || ''
            })),
            h('p', { className: 'dc-confirm-warning' }, confirm.risk === 'danger' ? t('sql.confirmDanger') : t('sql.confirmWrite')),
            h('pre', { className: 'dc-confirm-detail' }, confirm.sql))))
          : null);
    }

    // ---------------------------------------------------------------------
    // AI copilot: collapsed bubble, draggable dialog, plan confirmation.
    // ---------------------------------------------------------------------
    function formatPlanSummary(summary, t) {
      if (!summary) return '';
      const parts = [];
      if (summary.rows > 0) parts.push(t('common.rows', { count: num(summary.rows) }));
      if (summary.affected > 0) parts.push(t('sql.affected', { count: num(summary.affected) }));
      if (summary.durationMs !== null && summary.durationMs !== undefined) parts.push(t('sql.duration', { count: num(summary.durationMs) }));
      return parts.join(' · ') || t('ai.done');
    }

    function PlanCard({ message, t, actions, onConfirm }) {
      const plan = message.plan;
      if (!plan) return null;
      const danger = plan.risk === 'danger';
      return h('div', { className: cx('dc-plan', danger && 'dc-plan-danger') },
        h('div', { className: 'dc-plan-head' },
          h('span', { className: 'dc-plan-title' }, h(Icon, { name: 'terminal', size: 14 }), t('ai.plan')),
          h(RiskBadge, { risk: plan.risk, t })),
        h('pre', { className: 'dc-plan-sql' }, plan.sql),
        plan.database ? h('div', { className: 'dc-plan-context' }, `${t('ai.instance')}: ${plan.sourceName || plan.sourceId} · ${t('ai.database')}: ${plan.database}`) : null,
        plan.status === 'running' ? h('div', { className: 'dc-plan-status' }, h(Spinner, { size: 14 }), plan.auto ? t('ai.autoRunning') : t('ai.running')) : null,
        plan.status === 'done' ? h('div', { className: 'dc-plan-status dc-plan-status-done' },
          h(Icon, { name: 'check', size: 14 }), `${plan.auto ? t('ai.autoDone') : t('ai.done')}${plan.summary ? ` · ${formatPlanSummary(plan.summary, t)}` : ''}`,
          h(Button, { kind: 'ghost', size: 'sm', onClick: () => { actions.openPanel(); actions.setView('sql'); } }, t('ai.viewResult'))) : null,
        plan.status === 'error' ? h('div', { className: 'dc-plan-status dc-plan-status-error' },
          h(Icon, { name: 'alert', size: 14 }), plan.errorCode === 'context_changed' ? t('ai.contextChanged') : (plan.error || t('ai.failed'))) : null,
        plan.status === 'cancelled' ? h('div', { className: 'dc-plan-status' }, t('ai.cancelled')) : null,
        plan.status === 'pending' ? h(React.Fragment, null,
          h('div', { className: cx('dc-plan-warning', danger && 'dc-plan-warning-danger') },
            h(Icon, { name: 'alert', size: 14 }),
            h('span', null, plan.risk === 'read'
              ? t('ai.autoRead')
              : danger
                ? `${t('ai.needsConfirm')} · ${t('sql.confirmDanger')}`
                : `${t('ai.needsConfirm')} · ${t('ai.writeWarning')}`)),
          h('div', { className: 'dc-plan-actions' },
            plan.risk === 'read'
              ? h(Button, { kind: 'primary', size: 'sm', onClick: () => { void actions.runPlan(message.id, false); } }, h(Icon, { name: 'play', size: 13 }), ` ${t('sql.run')}`)
              : h(Button, { kind: danger ? 'danger' : 'primary', size: 'sm', onClick: () => { if (onConfirm) onConfirm(message); else void actions.confirmPlan(message.id); } }, h(Icon, { name: 'alert', size: 13 }), ` ${t('ai.confirmRun')}`),
            h(Button, { kind: 'ghost', size: 'sm', onClick: () => actions.cancelPlan(message.id) }, t('ai.cancel')))) : null);
    }

    let aiDialogGeometry = null;

    function AiAssistant({ t }) {
      const state = useStore();
      const ai = state.ai;
      const draft = ai.draft;
      const [geometry, setGeometry] = React.useState(() => aiDialogGeometry);
      const [dragging, setDragging] = React.useState(false);
      const [resizing, setResizing] = React.useState(false);
      const [planConfirm, setPlanConfirm] = React.useState(null);
      const dragInfo = React.useRef(null);
      const resizeInfo = React.useRef(null);
      const rootRef = React.useRef(null);
      const cardRef = React.useRef(null);
      const messagesRef = React.useRef(null);
      const inputRef = React.useRef(null);

      React.useEffect(() => {
        if (!store.get().loaded && !store.get().sourcesLoading) void actions.loadSources();
      }, []);

      React.useEffect(() => {
        if (geometry) aiDialogGeometry = geometry;
      }, [geometry]);

      React.useEffect(() => {
        if (geometry) return;
        const root = rootRef.current;
        if (!root) return;
        const card = cardRef.current;
        const mobile = window.innerWidth <= 560;
        const width = mobile ? 440 : Math.min(card?.offsetWidth || 440, Math.max(280, root.clientWidth - 16));
        const height = mobile ? 620 : Math.min(card?.offsetHeight || 620, Math.max(320, root.clientHeight - 16));
        setGeometry({
          width,
          height,
          x: Math.max(8, root.clientWidth - width - 18),
          y: Math.max(8, root.clientHeight - height - 18)
        });
      }, [geometry]);

      React.useEffect(() => {
        const root = rootRef.current;
        if (!root) return;
        const clamp = () => {
          setGeometry(current => {
            if (!current) return current;
            if (window.innerWidth <= 560) return current;
            const availableWidth = Math.max(160, root.clientWidth - 16);
            const availableHeight = Math.max(180, root.clientHeight - 16);
            const width = Math.min(current.width, availableWidth);
            const height = Math.min(current.height, availableHeight);
            return {
              width,
              height,
              x: Math.max(8, Math.min(current.x, Math.max(8, root.clientWidth - width - 8))),
              y: Math.max(8, Math.min(current.y, Math.max(8, root.clientHeight - height - 8)))
            };
          });
        };
        clamp();
        const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(clamp) : null;
        observer?.observe(root);
        window.addEventListener('resize', clamp);
        return () => {
          observer?.disconnect();
          window.removeEventListener('resize', clamp);
        };
      }, []);

      React.useEffect(() => {
        if (!dragging) return;
        const move = event => {
          const info = dragInfo.current;
          const root = rootRef.current;
          if (!info || !root) return;
          setGeometry(current => {
            if (!current) return current;
            const maxX = Math.max(8, root.clientWidth - current.width - 8);
            const maxY = Math.max(8, root.clientHeight - current.height - 8);
            return {
              ...current,
              x: Math.max(8, Math.min(info.originX + event.clientX - info.startX, maxX)),
              y: Math.max(8, Math.min(info.originY + event.clientY - info.startY, maxY))
            };
          });
        };
        const stop = () => setDragging(false);
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', stop);
        window.addEventListener('pointercancel', stop);
        return () => {
          window.removeEventListener('pointermove', move);
          window.removeEventListener('pointerup', stop);
          window.removeEventListener('pointercancel', stop);
        };
      }, [dragging]);

      React.useEffect(() => {
        if (!resizing) return;
        const move = event => {
          const info = resizeInfo.current;
          const root = rootRef.current;
          if (!info || !root) return;
          const dx = event.clientX - info.startX;
          const dy = event.clientY - info.startY;
          const direction = info.direction;
          const minWidth = Math.min(320, Math.max(200, root.clientWidth - 16));
          const minHeight = Math.min(360, Math.max(220, root.clientHeight - 16));
          const maxWidth = Math.max(minWidth, root.clientWidth - 16);
          const maxHeight = Math.max(minHeight, root.clientHeight - 16);
          let width = info.originWidth + (direction.includes('e') ? dx : 0) - (direction.includes('w') ? dx : 0);
          let height = info.originHeight + (direction.includes('s') ? dy : 0) - (direction.includes('n') ? dy : 0);
          width = Math.max(minWidth, Math.min(width, maxWidth));
          height = Math.max(minHeight, Math.min(height, maxHeight));
          if (direction.includes('e')) width = Math.min(width, root.clientWidth - info.originX - 8);
          if (direction.includes('w')) width = Math.min(width, info.originX + info.originWidth - 8);
          if (direction.includes('s')) height = Math.min(height, root.clientHeight - info.originY - 8);
          if (direction.includes('n')) height = Math.min(height, info.originY + info.originHeight - 8);
          width = Math.max(Math.min(minWidth, root.clientWidth - 16), width);
          height = Math.max(Math.min(minHeight, root.clientHeight - 16), height);
          const x = direction.includes('w') ? info.originX + info.originWidth - width : info.originX;
          const y = direction.includes('n') ? info.originY + info.originHeight - height : info.originY;
          setGeometry({
            width,
            height,
            x: Math.max(8, Math.min(x, Math.max(8, root.clientWidth - width - 8))),
            y: Math.max(8, Math.min(y, Math.max(8, root.clientHeight - height - 8)))
          });
        };
        const stop = () => setResizing(false);
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', stop);
        window.addEventListener('pointercancel', stop);
        return () => {
          window.removeEventListener('pointermove', move);
          window.removeEventListener('pointerup', stop);
          window.removeEventListener('pointercancel', stop);
        };
      }, [resizing]);

      React.useEffect(() => {
        const node = messagesRef.current;
        if (node) node.scrollTop = node.scrollHeight;
      }, [ai.messages, ai.busy]);

      React.useEffect(() => {
        const timer = setTimeout(() => inputRef.current?.focus(), 50);
        return () => clearTimeout(timer);
      }, []);

      const startDrag = event => {
        if (event.button !== 0) return;
        if (event.target.closest('button, select, input, textarea, a, .dc-ai-resize')) return;
        const root = rootRef.current;
        const card = cardRef.current;
        if (!root || !card || window.innerWidth <= 560 || root.clientWidth <= 360) return;
        dragInfo.current = {
          startX: event.clientX,
          startY: event.clientY,
          originX: card.offsetLeft,
          originY: card.offsetTop
        };
        setDragging(true);
        event.preventDefault();
      };
      const startResize = (direction, event) => {
        if (event.button !== 0) return;
        const root = rootRef.current;
        const card = cardRef.current;
        if (!root || !card || window.innerWidth <= 560 || root.clientWidth <= 360) return;
        resizeInfo.current = {
          direction,
          startX: event.clientX,
          startY: event.clientY,
          originX: card.offsetLeft,
          originY: card.offsetTop,
          originWidth: card.offsetWidth,
          originHeight: card.offsetHeight
        };
        setResizing(true);
        event.preventDefault();
        event.stopPropagation();
      };
      const send = () => {
        const text = draft.trim();
        if (!text || ai.busy) return;
        actions.setAiDraft('');
        void actions.aiSend(text);
      };
      const sourceName = state.source?.name || '';
      const canSend = Boolean(state.sourceId && state.database && !ai.busy);
      const model = ai.model || ai.provider;
      const suggestions = [
        t('ai.suggestion.tables'),
        t('ai.suggestion.rows'),
        t('ai.suggestion.design')
      ];

      return h('div', { ref: rootRef, className: 'dc-ai-root' },
        h('div', {
          ref: cardRef,
          className: cx('dc-ai-card', (dragging || resizing) && 'dc-ai-card-dragging', !geometry && 'dc-ai-card-initial'),
          style: geometry ? {
            left: geometry.x,
            top: geometry.y,
            width: geometry.width,
            height: geometry.height,
            right: 'auto',
            bottom: 'auto',
            maxHeight: 'none'
          } : undefined,
          role: 'dialog',
          'aria-label': t('ai.title')
        },
        h('div', {
          className: 'dc-ai-head',
          onPointerDown: startDrag,
          style: { cursor: dragging ? 'grabbing' : 'grab' }
        },
        h('span', { className: 'dc-ai-grip', title: t('ai.drag'), 'aria-hidden': 'true' }, h(Icon, { name: 'grip', size: 15 })),
        h('span', { className: 'dc-ai-mark' }, h(Icon, { name: 'sparkles', size: 18 })),
        h('span', { className: 'dc-ai-heading' },
          h('span', { className: 'dc-ai-title' }, t('ai.title')),
          h('span', { className: 'dc-ai-subtitle' }, model ? t('ai.model', { model }) : t('ai.subtitle'))),
        h('span', { className: 'dc-ai-head-spacer' }),
        !ai.busy && ai.messages.length > 0 ? h(IconButton, {
          label: t('ai.clear'),
          icon: 'trash',
          size: 14,
          onClick: actions.clearAi
        }) : null,
        h(IconButton, {
          label: t('ai.close'),
          icon: 'close',
          size: 15,
          onClick: () => actions.setAiOpen(false)
        })),
        h('div', { className: 'dc-ai-context', role: 'group', 'aria-label': t('ai.context') },
          h('label', { className: 'dc-ai-context-field' },
            h('span', { className: 'dc-ai-context-caption' }, t('ai.instance')),
            h('select', {
              className: 'dc-input dc-select-xs',
              value: state.sourceId || '',
              disabled: ai.busy || state.playground.running,
              onChange: event => { void actions.connect(event.target.value); }
            },
            h('option', { value: '' }, t('ai.selectSource')),
            state.sources.map(source => h('option', { key: source.id, value: source.id }, source.name)))),
          h('label', { className: 'dc-ai-context-field' },
            h('span', { className: 'dc-ai-context-caption' }, t('ai.database')),
            h('select', {
              className: 'dc-input dc-select-xs',
              value: state.database || '',
              disabled: ai.busy || state.playground.running || !state.sourceId,
              onChange: event => { void actions.selectDatabase(event.target.value); }
            },
            h('option', { value: '' }, t('ai.selectDatabase')),
            state.databases.map(database => h('option', { key: database.name, value: database.name }, database.name)))),
          state.sourceBusy ? h('span', { className: 'dc-ai-loading', title: t('source.connecting') }, h(Spinner, { size: 12 })) : null),
        state.error ? h('div', { className: 'dc-inline-error dc-ai-inline-error dc-ai-context-error' },
          h(Icon, { name: 'alert', size: 14 }),
          h('span', null, state.error),
          h(IconButton, { label: t('common.dismiss'), icon: 'close', size: 12, onClick: actions.clearError })) : null,
        !state.sourceId || !state.database ? h('div', { className: 'dc-ai-no-context' },
          h(Icon, { name: 'database', size: 17 }),
          h('div', null,
            h('strong', null, t('ai.noSource')),
            h('span', null, t('ai.noSourceAction')))) : null,
        h('div', {
          ref: messagesRef,
          className: cx('dc-ai-messages', ai.messages.length === 0 && !ai.busy && 'dc-ai-messages-empty'),
          'aria-live': 'polite'
        },
          ai.messages.length === 0 ? h('div', { className: 'dc-ai-welcome' },
            h('div', { className: 'dc-ai-welcome-icon' }, h(Icon, { name: 'sparkles', size: 21 })),
            h('strong', null, t('ai.emptyTitle')),
            h('p', null, t('ai.emptyText')),
            h('div', { className: 'dc-ai-suggestions' },
              suggestions.map((text, index) => h('button', {
                key: index,
                type: 'button',
                className: 'dc-ai-suggestion',
                onClick: () => {
                  actions.setAiDraft(text);
                  inputRef.current?.focus();
                }
              }, h(Icon, { name: index === 0 ? 'table' : index === 1 ? 'columns' : 'sparkles', size: 14 }), h('span', null, text))))) : null,
          ai.messages.map(message => message.role === 'system'
            ? h('div', { key: message.id, className: 'dc-ai-system-event', role: 'status' },
              h('div', { className: 'dc-ai-system-icon' }, h(Icon, { name: 'alert', size: 14 })),
              h('div', { className: 'dc-ai-system-body' },
                h('strong', null, t('ai.sqlError')),
                h('span', null, message.error),
                message.sql ? h('pre', { className: 'dc-ai-system-sql' }, message.sql) : null))
            : h('div', {
              key: message.id,
              className: cx('dc-ai-msg', message.role === 'user' ? 'dc-ai-msg-user' : 'dc-ai-msg-assistant')
            },
            h('div', { className: 'dc-ai-msg-role' }, message.role === 'user' ? t('ai.you') : t('ai.assistant')),
            h('div', { className: 'dc-ai-msg-text' }, message.text),
            message.retry ? h(Button, {
              kind: 'ghost',
              size: 'sm',
              onClick: () => { void actions.aiSend(message.retry); }
            }, t('ai.retry')) : null,
            message.plan ? h(PlanCard, { message, t, actions, onConfirm: value => setPlanConfirm(value) }) : null)),
          ai.busy ? h('div', { className: 'dc-ai-msg dc-ai-msg-assistant dc-ai-thinking-msg' },
            h('div', { className: 'dc-ai-msg-role' }, t('ai.assistant')),
            h('div', { className: 'dc-ai-msg-text dc-thinking' }, h(Spinner, { size: 13 }), t('ai.thinking'))) : null,
          ai.error ? h('div', { className: 'dc-inline-error dc-ai-inline-error' }, h(Icon, { name: 'alert', size: 14 }), h('span', null, ai.error)) : null),
        h('div', { className: 'dc-ai-compose' },
          h('textarea', {
            ref: inputRef,
            className: 'dc-ai-input',
            value: draft,
            rows: 2,
            placeholder: t('ai.placeholderFull'),
            'aria-label': t('ai.placeholder'),
            title: t('ai.composerHint'),
            disabled: ai.busy,
            onChange: event => actions.setAiDraft(event.target.value),
            onKeyDown: event => {
              if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent?.isComposing) {
                event.preventDefault();
                send();
              }
            }
          }),
          h('div', { className: 'dc-ai-compose-foot' },
            h('span', { className: 'dc-ai-context-label' }, state.sourceId && state.database
              ? t('ai.contextLabel', { source: sourceName, database: state.database })
              : t('ai.noSource')),
            h(Button, {
              kind: 'primary',
              size: 'sm',
              className: 'dc-ai-send',
              ariaLabel: t('ai.send'),
              title: t('ai.send'),
              onClick: send,
              disabled: !canSend || !draft.trim()
            }, ai.busy ? h(Spinner, { size: 13 }) : h(Icon, { name: 'send', size: 15 })))),
        ['nw', 'ne', 'sw', 'se'].map(direction => h('div', {
          key: direction,
          className: `dc-ai-resize dc-ai-resize-${direction}`,
          onPointerDown: event => startResize(direction, event),
          title: t('ai.resize'),
          'aria-hidden': 'true'
        }, direction === 'se' ? h('span', { className: 'dc-ai-resize-grip' }, h(Icon, { name: 'resize', size: 11 })) : null)),
        planConfirm ? h(Modal, {
          title: t('sql.confirmTitle'),
          onClose: () => setPlanConfirm(null),
          footer: h(React.Fragment, null,
            h(Button, { kind: 'ghost', onClick: () => setPlanConfirm(null) }, t('ai.cancel')),
            h(Button, {
              kind: planConfirm.plan.risk === 'danger' ? 'danger' : 'primary',
              onClick: () => {
                const id = planConfirm.id;
                setPlanConfirm(null);
                void actions.confirmPlan(id);
              }
            }, h(Icon, { name: 'alert', size: 14 }), ` ${t('sql.confirmRun')}`))
        }, h('div', { className: 'dc-confirm-body' },
          h('div', { className: 'dc-confirm-icon dc-confirm-icon-danger' }, h(Icon, { name: 'alert', size: 20 })),
          h('div', { className: 'dc-confirm-copy' },
            h('p', { className: 'dc-confirm-message' }, t('sql.confirmText')),
            h('p', { className: 'dc-confirm-target' }, t('sql.confirmTarget', {
              source: planConfirm.plan.sourceName || planConfirm.plan.sourceId || '',
              database: planConfirm.plan.database || ''
            })),
            h('p', { className: 'dc-confirm-warning' }, planConfirm.plan.risk === 'danger' ? t('sql.confirmDanger') : t('sql.confirmWrite')),
            h('pre', { className: 'dc-confirm-detail' }, planConfirm.plan.sql)))) : null));
    }

    // ---------------------------------------------------------------------
    // Main panel.
    // ---------------------------------------------------------------------
    function DshCatPanel({ t }) {
      const state = useStore();
      const [editor, setEditor] = React.useState(null);
      const [deleteTarget, setDeleteTarget] = React.useState(null);
      const [deleting, setDeleting] = React.useState(false);
      const [createDatabaseOpen, setCreateDatabaseOpen] = React.useState(false);
      const [dropDatabaseTarget, setDropDatabaseTarget] = React.useState(null);

      React.useEffect(() => {
        if (!store.get().loaded && !store.get().sourcesLoading) void actions.loadSources();
      }, []);

      const openNew = () => setEditor({ source: null });
      const openEdit = source => setEditor({ source });
      const saveSource = form => actions.saveSource(form);
      const confirmDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
          await actions.deleteSource(deleteTarget.id);
          setDeleteTarget(null);
        } catch (error) {
          actions.reportError(error);
        } finally {
          setDeleting(false);
        }
      };
      const hasSource = Boolean(state.sourceId);
      const canManageDatabases = state.source?.kind === 'mysql' || state.source?.kind === 'postgresql';
      return h('div', { className: 'dc-root' },
        h('header', { className: 'dc-header' },
          h('div', { className: 'dc-brand' },
            h('span', { className: 'dc-brand-mark' }, h(SidebarIcon, { size: 27, active: true })),
            h('span', { className: 'dc-brand-copy' },
              h('span', { className: 'dc-brand-title' }, t('panel.label')),
              h('span', { className: 'dc-brand-sub' }, state.source
                ? `${state.source.name}${state.sourceInfo?.version ? ` · ${state.sourceInfo.version}` : ''}`
                : t('panel.subtitle')))),
          h('nav', { className: 'dc-tabs', role: 'tablist', 'aria-label': t('panel.label') },
            h('button', {
              type: 'button',
              role: 'tab',
              'aria-selected': state.view === 'browse' ? 'true' : 'false',
              className: cx('dc-tab', state.view === 'browse' && 'dc-tab-active'),
              onClick: () => actions.setView('browse')
            }, h(Icon, { name: 'table', size: 14 }), t('tabs.browse')),
            h('button', {
              type: 'button',
              role: 'tab',
              'aria-selected': state.view === 'sql' ? 'true' : 'false',
              className: cx('dc-tab', state.view === 'sql' && 'dc-tab-active'),
              onClick: () => actions.setView('sql')
            }, h(Icon, { name: 'terminal', size: 14 }), t('tabs.sql'))),
          h('div', { className: 'dc-header-actions' },
            state.sourceInfo?.version ? h('span', { className: 'dc-status-chip', title: state.sourceInfo.version }, h('span', { className: 'dc-status-dot' }), t('source.connected')) : null,
            h(Button, {
              kind: state.ai.open ? 'primary' : 'secondary',
              size: 'sm',
              className: 'dc-ai-toggle',
              onClick: () => actions.setAiOpen(!state.ai.open),
              ariaLabel: state.ai.open ? t('ai.close') : t('ai.open'),
              ariaExpanded: state.ai.open ? 'true' : 'false',
              title: state.ai.open ? t('ai.close') : t('ai.open')
            }, h(Icon, { name: 'sparkles', size: 14 }), ` ${t('ai.button')}`),
            h(Button, { kind: 'secondary', size: 'sm', onClick: openNew }, h(Icon, { name: 'plus', size: 14 }), ` ${t('source.add')}`))),
        state.error ? h('div', { className: 'dc-banner dc-banner-error', role: 'alert' },
          h(Icon, { name: 'alert', size: 16 }),
          h('span', null, state.error),
          h(IconButton, { label: t('common.dismiss'), icon: 'close', size: 14, onClick: actions.clearError })) : null,
        h('div', { className: 'dc-body' },
          h(SourceTree, {
            state,
            actions,
            t,
            onAdd: openNew,
            onEdit: openEdit,
            onDelete: source => setDeleteTarget(source),
            onCreateDatabase: () => setCreateDatabaseOpen(true),
            canManageDatabases
          }),
          h('main', { className: 'dc-main' },
            state.view === 'sql'
              ? h(PlaygroundView, { state, actions, t })
              : state.sourceBusy
                ? h('section', { className: 'dc-content dc-content-loading' }, h(Spinner, { size: 24 }), h('p', null, t('source.connecting')))
                : !state.sourceId
                  ? h(WelcomeView, { sources: state.sources, t, onAdd: openNew, hasSource: state.sources.length > 0 })
                  : state.table
                    ? h(TableBrowser, { state, actions, t })
                    : state.database
                      ? h(DatabaseOverview, {
                        state,
                        actions,
                        t,
                        canManageDatabases,
                        onCreateDatabase: () => setCreateDatabaseOpen(true),
                        onDeleteDatabase: name => setDropDatabaseTarget(name)
                      })
                      : h('section', { className: 'dc-content' }, h(EmptyState, {
                        title: t('browse.noDatabase'),
                        text: t('browse.noDatabaseHint'),
                        icon: 'database'
                      }, h(Button, {
                        kind: 'secondary',
                        size: 'sm',
                        onClick: () => {
                          if (state.sourceId) void actions.connect(state.sourceId);
                          else void actions.loadSources();
                        }
                      }, t('common.retry')))))),
        h(SourceFormModal, {
          open: editor !== null,
          initial: editor?.source || null,
          t,
          onClose: () => setEditor(null),
          onSave: saveSource,
          onTest: form => actions.testSource(form)
        }),
        deleteTarget ? h(ConfirmSourceDelete, {
          source: deleteTarget,
          busy: deleting,
          t,
          onCancel: () => setDeleteTarget(null),
          onConfirm: () => { void confirmDelete(); }
        }) : null,
        createDatabaseOpen ? h(CreateDatabaseModal, {
          sourceName: state.source?.name || '',
          t,
          onClose: () => setCreateDatabaseOpen(false),
          onCreate: name => actions.createDatabase(name)
        }) : null,
        dropDatabaseTarget ? h(DropDatabaseModal, {
          database: dropDatabaseTarget,
          sourceName: state.source?.name || '',
          t,
          onClose: () => setDropDatabaseTarget(null),
          onDrop: name => actions.dropDatabase(name)
        }) : null,
        state.ai.open ? h(AiAssistant, { t }) : null);
    }

    // ---------------------------------------------------------------------
    // Styles. Only DSH theme tokens are used; no Harness Client package is
    // imported.
    // ---------------------------------------------------------------------
    const PAGE_CSS = `
.dc-root{--dc-gap:12px;position:relative;display:flex;flex-direction:column;height:100%;min-height:0;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-family:var(--dsw-font-family);font-size:13px;line-height:1.45;overflow:hidden}
.dc-root *{box-sizing:border-box}
.dc-root :where(button,input,select,textarea){font:inherit;color:inherit}
.dc-sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.dc-header{display:flex;align-items:center;gap:18px;min-height:62px;padding:10px 18px;border-bottom:.5px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-base);flex:none;flex-wrap:wrap}
.dc-brand{display:flex;align-items:center;gap:10px;min-width:0;flex:0 1 auto}
.dc-brand-mark{display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:var(--dsw-radius-md);border:.5px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-brand-primary);flex:none}
.dc-brand-copy{display:flex;flex-direction:column;min-width:0;max-width:330px}
.dc-brand-title{font-size:15px;line-height:20px;font-weight:600;letter-spacing:.01em}
.dc-brand-sub{font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dc-tabs{display:flex;align-items:center;gap:2px;padding:3px;border-radius:var(--dsw-radius-md);background:var(--dsw-alias-bg-layer-1);border:.5px solid var(--dsw-alias-border-l1);flex:none}
.dc-tab{display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 11px;border:0;border-radius:var(--dsw-radius-sm);background:transparent;color:var(--dsw-alias-label-secondary);font-size:12px;cursor:pointer;white-space:nowrap}
.dc-tab:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.dc-tab-active{background:var(--dsw-alias-bg-overlay);color:var(--dsw-alias-label-primary);box-shadow:var(--dsw-shadow-lv1);font-weight:500}
.dc-header-actions{display:flex;align-items:center;justify-content:flex-end;gap:8px;margin-left:auto;flex:none;flex-wrap:wrap}
.dc-status-chip{display:inline-flex;align-items:center;gap:5px;height:24px;padding:0 8px;border-radius:99px;background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 10%,transparent);color:var(--dsw-alias-state-success-primary);font-size:11px;white-space:nowrap;max-width:180px;overflow:hidden;text-overflow:ellipsis}
.dc-status-dot{width:6px;height:6px;border-radius:50%;background:var(--dsw-alias-state-success-primary);flex:none}
.dc-body{display:flex;flex:1;min-height:0;overflow:hidden}
.dc-tree{width:286px;flex:none;min-height:0;display:flex;flex-direction:column;border-right:.5px solid var(--dsw-alias-border-l1);background:var(--dsw-specific-sidebar-fill);overflow:hidden}
.dc-tree-head{display:flex;align-items:center;justify-content:space-between;padding:12px 14px 8px 16px;flex:none}
.dc-tree-title{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--dsw-alias-label-tertiary);font-weight:600}
.dc-source-list{flex:1;overflow:auto;padding:2px 8px 12px}
.dc-source{min-width:0}
.dc-source-row{display:flex;align-items:center;gap:2px;border-radius:var(--dsw-radius-md);padding:2px}
.dc-source-row:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dc-source-active>.dc-source-row{background:var(--dsw-alias-interactive-bg-hover)}
.dc-source-main{display:flex;align-items:center;gap:8px;flex:1;min-width:0;border:0;background:transparent;text-align:start;padding:7px 6px;cursor:pointer;border-radius:var(--dsw-radius-sm)}
.dc-source-copy{display:flex;flex-direction:column;min-width:0;flex:1;gap:1px}
.dc-source-name{font-size:12.5px;line-height:17px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dc-source-url{font-size:10.5px;line-height:14px;color:var(--dsw-alias-label-tertiary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dc-source-actions{display:flex;align-items:center;opacity:0;transition:opacity .12s}
@media (hover:none),(pointer:coarse){.dc-source-actions{opacity:1}}
.dc-source-row:hover .dc-source-actions,.dc-source-active .dc-source-actions,.dc-source-actions:focus-within{opacity:1}
.dc-source-dot{width:6px;height:6px;border-radius:50%;background:var(--dsw-alias-border-l2);flex:none;margin-inline:2px}
.dc-source-dot-on{background:var(--dsw-alias-state-success-primary)}
.dc-source-dot-busy{background:var(--dsw-alias-state-warn-primary);animation:dc-pulse 1.2s ease-in-out infinite}
.dc-kind{display:inline-flex;align-items:center;justify-content:center;width:25px;height:20px;border-radius:var(--dsw-radius-xs);font-size:9px;font-weight:700;letter-spacing:.03em;flex:none;border:.5px solid transparent}
.dc-kind-mysql{color:var(--dsw-alias-state-business-primary);background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 12%,transparent);border-color:color-mix(in srgb,var(--dsw-alias-state-business-primary) 20%,transparent)}
.dc-kind-postgresql{color:var(--dsw-alias-brand-primary);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 12%,transparent);border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 20%,transparent)}
.dc-kind-redis{color:var(--dsw-alias-state-error-primary);background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 10%,transparent);border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 18%,transparent)}
.dc-kind-elasticsearch{color:var(--dsw-alias-state-warn-primary);background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 12%,transparent);border-color:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 20%,transparent)}
.dc-tree-branch{padding:4px 0 6px 8px;border-left:.5px solid var(--dsw-alias-border-l1);margin-left:13px}
.dc-db-section{display:flex;align-items:center;justify-content:space-between;gap:6px;padding:3px 5px 3px 10px;margin:1px 0 2px}
.dc-db-section-label{font-size:9px;text-transform:uppercase;letter-spacing:.07em;color:var(--dsw-alias-label-tertiary);font-weight:600}
.dc-db-section .dc-icon-btn{width:20px;height:20px}
.dc-danger-text{color:var(--dsw-alias-state-error-primary)!important}
.dc-danger-text:hover{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 9%,transparent)!important;color:var(--dsw-alias-state-error-primary)!important}
.dc-db{margin:1px 0}
.dc-db-row{display:flex;align-items:center;gap:5px;width:100%;min-width:0;border:0;background:transparent;text-align:start;padding:5px 6px;border-radius:var(--dsw-radius-sm);cursor:pointer;color:var(--dsw-alias-label-secondary);font-size:12px}
.dc-db-row:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.dc-db-row-active{color:var(--dsw-alias-label-primary);font-weight:500}
.dc-chevron{display:flex;width:14px;flex:none;color:var(--dsw-alias-label-tertiary)}
.dc-db-icon{flex:none;color:var(--dsw-alias-label-tertiary)}
.dc-db-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;flex:1}
.dc-db-detail{font-size:10px;color:var(--dsw-alias-label-tertiary);white-space:nowrap;max-width:72px;overflow:hidden;text-overflow:ellipsis}
.dc-table-branch{padding:3px 0 4px 12px;margin-left:7px;border-left:.5px solid var(--dsw-alias-border-l1)}
.dc-table-filter{display:flex;align-items:center;gap:5px;color:var(--dsw-alias-label-tertiary);padding:2px 7px 5px 0}
.dc-mini-input{width:100%;min-width:0;height:24px;border:.5px solid transparent;border-radius:var(--dsw-radius-sm);background:transparent;padding:0 5px;font-size:11px;color:var(--dsw-alias-label-primary);outline:none}
.dc-mini-input::placeholder{color:var(--dsw-alias-label-tertiary)}
.dc-mini-input:focus{border-color:var(--dsw-focus-ring-color);background:var(--dsw-alias-bg-layer-1)}
.dc-table-row{display:flex;align-items:center;gap:6px;width:100%;min-width:0;border:0;background:transparent;color:var(--dsw-alias-label-secondary);text-align:start;padding:4px 6px;border-radius:var(--dsw-radius-sm);font-size:11.5px;cursor:pointer}
.dc-table-row:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.dc-table-row-active{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 10%,transparent);color:var(--dsw-alias-label-primary);font-weight:500}
.dc-table-glyph{display:flex;color:var(--dsw-alias-label-tertiary);flex:none}
.dc-table-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;flex:1}
.dc-table-schema{font-size:9.5px;color:var(--dsw-alias-label-tertiary);background:var(--dsw-alias-bg-layer-1);border-radius:3px;padding:1px 4px;flex:none;max-width:70px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dc-tree-loading,.dc-tree-note{display:flex;align-items:center;gap:6px;padding:8px 6px;color:var(--dsw-alias-label-tertiary);font-size:11px}
.dc-tree-loading-indent{padding-left:10px}
.dc-tree-empty{padding:8px 6px;color:var(--dsw-alias-label-secondary);font-size:12px}
.dc-tree-empty p{margin:0 0 10px;line-height:18px;color:var(--dsw-alias-label-tertiary)}
.dc-tree-empty-actions{display:flex;gap:6px;margin-top:6px}
.dc-main{flex:1;min-width:0;min-height:0;display:flex;flex-direction:column;overflow:hidden;background:var(--dsw-alias-bg-base)}
.dc-content{display:flex;flex-direction:column;flex:1;min-height:0;gap:10px;padding:14px 18px 14px}
.dc-content-head{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:26px;flex:none}
.dc-breadcrumb{display:flex;align-items:center;gap:5px;min-width:0;color:var(--dsw-alias-label-tertiary);font-size:11.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dc-breadcrumb strong{color:var(--dsw-alias-label-primary);font-weight:500;font-size:13px;overflow:hidden;text-overflow:ellipsis}
.dc-content-actions{display:flex;align-items:center;gap:6px;flex:none;flex-wrap:wrap;justify-content:flex-end}
.dc-undo-count{display:inline-flex;align-items:center;justify-content:center;min-width:15px;height:15px;padding:0 4px;border-radius:99px;background:color-mix(in srgb,var(--dsw-alias-brand-primary) 15%,transparent);color:var(--dsw-alias-brand-primary);font-size:9px;font-weight:600;line-height:1}
.dc-content-title{margin:0;font-size:17px;line-height:23px;font-weight:600;letter-spacing:-.01em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dc-system-pill{display:inline-flex;align-items:center;height:17px;margin-left:7px;padding:0 6px;border-radius:99px;background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 10%,transparent);border:.5px solid color-mix(in srgb,var(--dsw-alias-state-business-primary) 25%,transparent);color:var(--dsw-alias-state-business-primary);font-size:9px;font-weight:600;line-height:1;vertical-align:middle}
.dc-content-sub{margin:2px 0 0;color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:16px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dc-table-headline{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;min-width:0;flex:none}
.dc-table-headline-actions{display:flex;align-items:center;gap:10px;flex:none;flex-wrap:wrap;justify-content:flex-end}
.dc-table-headline-actions .dc-hint-inline{white-space:normal;text-align:right;max-width:280px;line-height:15px}
.dc-cell-editable{cursor:cell}
.dc-cell-editable:hover{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 5%,transparent)!important;box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--dsw-alias-brand-primary) 16%,transparent)}
.dc-cell-editor{display:flex;flex-direction:column;gap:10px;min-width:0}
.dc-cell-editor-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;min-width:0}
.dc-cell-editor-head>div:first-child{display:flex;flex-direction:column;gap:3px;min-width:0}
.dc-cell-editor-field{font-size:13px;line-height:18px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dc-cell-editor-context{font-size:9.5px;color:var(--dsw-alias-label-tertiary);overflow-wrap:anywhere}
.dc-cell-editor-badges{display:flex;align-items:center;gap:5px;flex-wrap:wrap;justify-content:flex-end;flex:none}
.dc-type-pill{display:inline-flex;align-items:center;height:20px;max-width:220px;padding:0 7px;border-radius:99px;background:var(--dsw-alias-bg-layer-1);border:.5px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-secondary);font-size:9.5px;font-family:var(--ds-font-family-code);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dc-type-pill-key{color:var(--dsw-alias-state-business-primary);border-color:color-mix(in srgb,var(--dsw-alias-state-business-primary) 25%,transparent)}
.dc-cell-textarea{height:auto!important;min-height:84px;padding:8px 9px!important;line-height:18px;resize:vertical}
.dc-cell-editor .dc-field-hint{min-height:12px}
.dc-link-btn{border:0;background:transparent;color:var(--dsw-alias-label-tertiary);font-size:11px;cursor:pointer;padding:2px 0;white-space:nowrap}
.dc-link-btn:hover{color:var(--dsw-alias-label-primary);text-decoration:underline}
.dc-btn{display:inline-flex;align-items:center;justify-content:center;gap:5px;border:.5px solid transparent;border-radius:var(--dsw-radius-sm);cursor:pointer;white-space:nowrap;font-weight:500;transition:background .12s,border-color .12s,color .12s;flex:none}
.dc-btn:disabled{opacity:.48;cursor:not-allowed}
.dc-btn-md{height:32px;padding:0 12px;font-size:12.5px}
.dc-btn-sm{height:27px;padding:0 8px;font-size:11.5px}
.dc-btn-primary{background:var(--dsw-alias-button-primary-fill,var(--dsw-alias-brand-primary));border-color:var(--dsw-alias-button-primary-fill,var(--dsw-alias-brand-primary));color:var(--dsw-alias-label-primary-foreground)}
.dc-btn-primary:hover:not(:disabled){filter:brightness(1.05)}
.dc-btn-secondary{background:var(--dsw-alias-bg-layer-1);border-color:var(--dsw-alias-border-l1);color:var(--dsw-alias-label-primary)}
.dc-btn-secondary:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);border-color:var(--dsw-alias-border-l2)}
.dc-btn-ghost{background:transparent;border-color:transparent;color:var(--dsw-alias-label-secondary)}
.dc-btn-ghost:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.dc-btn-danger{background:var(--dsw-alias-state-error-primary);border-color:var(--dsw-alias-state-error-primary);color:var(--dsw-alias-label-primary-foreground)}
.dc-btn-danger:hover:not(:disabled){filter:brightness(1.05)}
.dc-icon-btn{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border:.5px solid transparent;border-radius:var(--dsw-radius-sm);background:transparent;color:var(--dsw-alias-label-tertiary);cursor:pointer;flex:none}
.dc-icon-btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.dc-icon-btn:disabled{opacity:.45;cursor:not-allowed}
.dc-btn:focus-visible,.dc-icon-btn:focus-visible,.dc-tab:focus-visible,.dc-source-main:focus-visible,.dc-db-row:focus-visible,.dc-table-row:focus-visible{outline:var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color);outline-offset:1px}
.dc-banner{display:flex;align-items:center;gap:9px;margin:0 18px;padding:8px 10px;border-radius:var(--dsw-radius-md);font-size:12px;flex:none}
.dc-banner-error{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 9%,transparent);border:.5px solid color-mix(in srgb,var(--dsw-alias-state-error-primary) 26%,transparent);color:var(--dsw-alias-label-primary)}
.dc-banner-error>span{flex:1;min-width:0;overflow-wrap:anywhere}
.dc-banner .dc-icon-btn{margin-left:auto}
.dc-spinner{display:inline-block;border:2px solid var(--dsw-alias-border-l2);border-top-color:var(--dsw-alias-brand-primary);border-radius:50%;animation:dc-spin .75s linear infinite;flex:none}
.dc-thinking{display:inline-flex;align-items:center;gap:6px;color:var(--dsw-alias-label-tertiary);font-size:11px}
.dc-inline-success,.dc-inline-error,.dc-inline-note,.dc-inline-warn{display:flex;align-items:flex-start;gap:7px;padding:7px 9px;border-radius:var(--dsw-radius-sm);font-size:11.5px;line-height:17px;overflow-wrap:anywhere}
.dc-inline-success{color:var(--dsw-alias-state-success-primary);background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 8%,transparent)}
.dc-inline-error{color:var(--dsw-alias-label-primary);background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 9%,transparent);border:.5px solid color-mix(in srgb,var(--dsw-alias-state-error-primary) 22%,transparent)}
.dc-inline-error svg{color:var(--dsw-alias-state-error-primary);flex:none;margin-top:1px}
.dc-inline-note{color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-1);border:.5px solid var(--dsw-alias-border-l1)}
.dc-inline-warn{color:var(--dsw-alias-state-warn-primary);background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 8%,transparent);border:.5px solid color-mix(in srgb,var(--dsw-alias-state-warn-primary) 20%,transparent)}
.dc-filter-bar{display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding:7px 8px;border:.5px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-md);background:var(--dsw-alias-bg-layer-1);flex:none}
.dc-filter-label{display:inline-flex;align-items:center;gap:4px;color:var(--dsw-alias-label-tertiary);font-size:11px;padding-inline:2px}
.dc-input{height:30px;min-width:0;border:.5px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);padding:0 8px;outline:none;font-size:12px}
.dc-input:hover{border-color:var(--dsw-alias-border-l2)}
.dc-input:focus{border-color:var(--dsw-focus-ring-color);box-shadow:0 0 0 1px var(--dsw-focus-ring-color)}
.dc-input:disabled{opacity:.55;cursor:not-allowed}
.dc-select-sm{height:26px;padding:0 5px;font-size:11px;max-width:180px}
.dc-select-xs{height:24px;padding:0 3px;font-size:10.5px;max-width:120px}
.dc-filter-value{height:26px;flex:1;min-width:130px;max-width:240px;font-size:11px}
.dc-grid-card{position:relative;flex:1;min-height:0;display:flex;flex-direction:column;border:.5px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-md);overflow:hidden;background:var(--dsw-alias-bg-layer-1)}
.dc-grid-scroll{flex:1;min-height:0;overflow:auto}
.dc-grid{width:100%;border-collapse:separate;border-spacing:0;font-size:11.5px;line-height:17px;text-align:start;min-width:max-content}
.dc-grid th{position:sticky;top:0;z-index:1;background:var(--dsw-alias-bg-layer-2);border-bottom:.5px solid var(--dsw-alias-border-l1);padding:6px 9px;text-align:start;font-weight:500;color:var(--dsw-alias-label-secondary);white-space:nowrap;vertical-align:bottom;font-size:11px}
.dc-grid td{padding:5px 9px;border-bottom:.5px solid var(--dsw-alias-border-l1);max-width:360px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;vertical-align:middle;color:var(--dsw-alias-label-primary)}
.dc-grid tbody tr:hover td{background:var(--dsw-alias-interactive-bg-hover)}
.dc-grid-result{width:100%;min-width:100%;table-layout:auto}
.dc-grid-result td{font-family:var(--ds-font-family-code);font-size:11px;max-width:none;overflow:visible;text-overflow:clip;white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word;vertical-align:top}
.dc-grid-result .dc-cell-text,.dc-grid-result .dc-json{overflow:visible;text-overflow:clip;white-space:pre-wrap;overflow-wrap:anywhere}
.dc-grid-rownum{width:42px;min-width:42px;color:var(--dsw-alias-label-tertiary)!important;text-align:right!important;font-variant-numeric:tabular-nums;background:var(--dsw-alias-bg-layer-1);position:sticky;left:0;z-index:1}
.dc-grid thead .dc-grid-rownum{z-index:2}
.dc-grid tbody tr:last-child td{border-bottom:0}
.dc-grid-th-action{padding:0!important}
.dc-grid-th-inner{display:flex;align-items:stretch;min-width:0}
.dc-grid-th-button{display:flex;align-items:center;gap:4px;flex:1;min-width:0;padding:6px 4px 6px 9px;border:0;background:transparent;color:inherit;text-align:start;font:inherit;cursor:pointer;white-space:nowrap}
.dc-grid-th-labels{display:block;min-width:0;overflow:hidden}
.dc-grid-th-filter{display:inline-flex;align-items:center;justify-content:center;width:22px;border:0;background:transparent;color:var(--dsw-alias-label-tertiary);cursor:pointer;flex:none}
.dc-grid-th-filter:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}
.dc-sort-mark{color:var(--dsw-alias-brand-primary);font-size:11px;line-height:12px}
.dc-grid-th-action:hover .dc-grid-th-button{color:var(--dsw-alias-label-primary)}
.dc-grid-th-button:focus-visible,.dc-grid-th-filter:focus-visible{outline:var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color);outline-offset:-2px}
.dc-cell-pending{background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 8%,transparent)!important}
.dc-pending-bar{display:flex;flex-direction:column;gap:6px;padding:8px 10px;margin:4px 0;border:.5px solid color-mix(in srgb,var(--dsw-alias-state-warn-primary) 40%,var(--dsw-alias-border-l1));border-radius:var(--dsw-radius-md);background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 5%,var(--dsw-alias-bg-layer-1));flex:none}
.dc-pending-head{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
.dc-pending-title{display:flex;align-items:center;gap:7px;min-width:0;flex-wrap:wrap;font-size:11.5px}
.dc-pending-title strong{color:var(--dsw-alias-state-warn-primary)}
.dc-pending-hint{color:var(--dsw-alias-label-tertiary);font-size:10.5px}
.dc-pending-actions{display:flex;gap:5px;flex:none}
.dc-pending-sql summary{cursor:pointer;color:var(--dsw-alias-label-secondary);font-size:10.5px;user-select:none}
.dc-pending-sql pre{max-height:150px;overflow:auto;margin:6px 0 0;padding:7px 8px;border-radius:var(--dsw-radius-xs);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-family:var(--ds-font-family-code);font-size:10px;line-height:15px;white-space:pre-wrap;word-break:break-word}
.dc-col-name{display:block;color:inherit}
.dc-col-type{display:block;font-weight:400;font-size:9.5px;line-height:13px;color:var(--dsw-alias-label-tertiary);max-width:180px;overflow:hidden;text-overflow:ellipsis}
.dc-grid-empty-cell{padding:26px 12px!important;text-align:center!important;color:var(--dsw-alias-label-tertiary)!important;white-space:normal!important}
.dc-grid-empty{display:flex;align-items:center;justify-content:center;min-height:170px;padding:24px;color:var(--dsw-alias-label-tertiary);font-size:12px;text-align:center}
.dc-grid-loading{position:absolute;inset:0;z-index:3;display:flex;align-items:center;justify-content:center;gap:8px;background:color-mix(in srgb,var(--dsw-alias-bg-layer-1) 72%,transparent);font-size:12px;color:var(--dsw-alias-label-secondary);backdrop-filter:blur(1px)}
.dc-cell-text,.dc-json{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dc-json{font-family:var(--ds-font-family-code);font-size:10.5px;color:var(--dsw-alias-label-secondary)}
.dc-null{font-family:var(--ds-font-family-code);color:var(--dsw-alias-label-tertiary);font-style:italic;font-size:10.5px}
.dc-bool{font-family:var(--ds-font-family-code);font-size:10.5px;color:var(--dsw-alias-state-business-primary)}
.dc-pager{display:flex;align-items:center;gap:6px;flex:none;min-height:30px;flex-wrap:wrap}
.dc-pager-meta{font-size:10.5px;color:var(--dsw-alias-label-tertiary);white-space:nowrap}
.dc-pager-spacer{flex:1}
.dc-pager-size{display:flex;align-items:center;gap:4px;font-size:10.5px;color:var(--dsw-alias-label-tertiary)}
.dc-overview-head{display:flex;align-items:flex-end;justify-content:space-between;gap:14px;flex:none;margin-top:2px}
.dc-search-box{display:flex;align-items:center;gap:4px;height:28px;border:.5px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-bg-layer-1);padding:0 6px;color:var(--dsw-alias-label-tertiary);width:210px;max-width:42vw}
.dc-search-box .dc-mini-input{height:26px}
.dc-table-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(232px,1fr));gap:8px;overflow:auto;min-height:0;padding-bottom:4px;align-content:start}
.dc-table-card{display:flex;align-items:center;gap:10px;min-width:0;text-align:start;padding:11px 10px;border:.5px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-md);background:var(--dsw-alias-bg-layer-1);cursor:pointer;color:var(--dsw-alias-label-primary)}
.dc-table-card:hover{border-color:var(--dsw-alias-border-l2);background:var(--dsw-alias-interactive-bg-hover)}
.dc-table-card-icon{display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);flex:none}
.dc-table-card-copy{display:flex;flex-direction:column;min-width:0;flex:1;gap:2px}
.dc-table-card-name{font-size:12px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dc-table-card-meta{font-size:10px;color:var(--dsw-alias-label-tertiary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dc-table-card>svg{color:var(--dsw-alias-label-tertiary);flex:none}
.dc-overview-loading,.dc-content-loading{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:var(--dsw-alias-label-tertiary);min-height:180px;font-size:12px}
.dc-overview-error{display:flex;flex-direction:column;align-items:flex-start;gap:8px;max-width:720px}
.dc-content-loading p{margin:0}
.dc-welcome{flex:1;align-items:center;justify-content:center;text-align:center;gap:8px;padding:28px}
.dc-welcome-mark{display:flex;align-items:center;justify-content:center;width:82px;height:82px;border-radius:22px;background:var(--dsw-alias-bg-layer-1);border:.5px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-brand-primary);margin-bottom:4px}
.dc-welcome-title{margin:0;font-size:21px;line-height:28px;font-weight:600;letter-spacing:-.02em}
.dc-welcome-text{margin:0;max-width:520px;color:var(--dsw-alias-label-secondary);font-size:12.5px;line-height:19px}
.dc-welcome-steps{display:flex;gap:16px;flex-wrap:wrap;justify-content:center;margin-top:12px;color:var(--dsw-alias-label-tertiary);font-size:11px}
.dc-welcome-step{display:flex;align-items:center;gap:5px;padding:5px 8px;border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-bg-layer-1);border:.5px solid var(--dsw-alias-border-l1)}
.dc-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;text-align:center;padding:36px 18px;flex:1;min-height:160px}
.dc-empty-icon{display:flex;align-items:center;justify-content:center;width:50px;height:50px;border-radius:30%;background:var(--dsw-alias-bg-layer-1);border:.5px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-tertiary);margin-bottom:3px}
.dc-empty-title{margin:0;font-size:14px;line-height:20px;font-weight:600}
.dc-empty-text{margin:0;max-width:420px;color:var(--dsw-alias-label-tertiary);font-size:11.5px;line-height:18px}
.dc-empty-actions{margin-top:6px}
.dc-modal-backdrop{position:fixed;inset:0;z-index:1400;display:flex;align-items:center;justify-content:center;padding:24px;background:color-mix(in srgb,var(--dsw-alias-bg-base) 58%,transparent);backdrop-filter:blur(2px);pointer-events:auto}
.dc-modal{display:flex;flex-direction:column;width:min(660px,100%);max-height:88vh;border-radius:var(--dsw-radius-lg);border:.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-overlay);box-shadow:var(--dsw-shadow-lv3);overflow:hidden}
.dc-modal-wide{width:min(760px,100%)}
.dc-modal-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:13px 16px;border-bottom:.5px solid var(--dsw-alias-border-l1);flex:none}
.dc-modal-title{margin:0;font-size:14px;line-height:20px;font-weight:600}
.dc-modal-body{padding:15px 16px;overflow:auto;min-height:0}
.dc-modal-foot{display:flex;align-items:center;gap:8px;padding:11px 16px;border-top:.5px solid var(--dsw-alias-border-l1);flex:none;flex-wrap:wrap}
.dc-modal-foot-note{font-size:9.5px;line-height:14px;color:var(--dsw-alias-label-tertiary);max-width:360px}
.dc-modal-foot-spacer{flex:1}
.dc-form-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px 14px}
.dc-span-2{grid-column:1/-1}
.dc-field{display:flex;flex-direction:column;gap:5px;min-width:0}
.dc-field-label{font-size:11px;color:var(--dsw-alias-label-secondary);font-weight:500}
.dc-field-hint{font-size:9.5px;line-height:14px;color:var(--dsw-alias-label-tertiary)}
.dc-db-form{display:flex;flex-direction:column;gap:10px}
.dc-db-form-note{margin:0;font-size:11px;line-height:17px;color:var(--dsw-alias-label-secondary)}
.dc-db-form-target{margin:0;font-family:var(--ds-font-family-code);font-size:10px;line-height:15px;color:var(--dsw-alias-label-tertiary);overflow-wrap:anywhere}
.dc-db-charset{display:flex;align-items:flex-start;gap:6px;padding:7px 8px;border:.5px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);font-size:10px;line-height:15px}
.dc-db-charset svg{flex:none;color:var(--dsw-alias-label-tertiary);margin-top:1px}
.dc-db-drop{display:flex;flex-direction:column;align-items:flex-start;gap:10px}
.dc-db-drop .dc-confirm-message{margin:0}
.dc-db-drop-hint{margin:0;font-size:11px;line-height:17px;color:var(--dsw-alias-label-secondary)}
.dc-db-drop-phrase{display:block;width:100%;padding:8px 10px;border:.5px solid color-mix(in srgb,var(--dsw-alias-state-error-primary) 24%,transparent);border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-markdown-code-block);color:var(--dsw-alias-state-error-primary);font-family:var(--ds-font-family-code);font-size:12px;line-height:17px;user-select:all;overflow-wrap:anywhere}
.dc-db-drop .dc-input{width:100%}
.dc-field .dc-input{height:32px;width:100%}
.dc-mono{font-family:var(--ds-font-family-code);font-size:11.5px}
.dc-check{display:inline-flex;align-items:center;gap:7px;font-size:11px;color:var(--dsw-alias-label-secondary);cursor:pointer}
.dc-check input{accent-color:var(--dsw-alias-brand-primary)}
.dc-check-spaced{margin-top:2px}
.dc-confirm-body{display:flex;align-items:flex-start;gap:10px}
.dc-confirm-icon{display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%;background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 14%,transparent);color:var(--dsw-alias-state-warn-primary);flex:none}
.dc-confirm-icon-danger{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 13%,transparent);color:var(--dsw-alias-state-error-primary)}
.dc-confirm-copy{min-width:0;flex:1}
.dc-confirm-message{margin:0;font-size:12.5px;line-height:19px;color:var(--dsw-alias-label-primary);overflow-wrap:anywhere}
.dc-confirm-target{margin:5px 0 0;font-size:11px;line-height:16px;color:var(--dsw-alias-label-secondary);font-family:var(--ds-font-family-code);overflow-wrap:anywhere}
.dc-confirm-warning{margin:6px 0 0;font-size:11px;color:var(--dsw-alias-label-tertiary);line-height:17px}
.dc-confirm-detail{margin:10px 0 0;padding:10px;border-radius:var(--dsw-radius-sm);border:.5px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-markdown-code-block);font-family:var(--ds-font-family-code);font-size:10.5px;line-height:16px;color:var(--dsw-alias-label-primary);white-space:pre-wrap;overflow-wrap:anywhere;max-height:260px;overflow:auto}
.dc-hint-inline{font-size:10.5px;color:var(--dsw-alias-label-tertiary);white-space:nowrap}
.dc-sql-page{gap:9px;overflow:hidden}
.dc-sql-context{display:flex;align-items:center;gap:8px;flex-wrap:wrap;flex:none}
.dc-context-field{display:flex;align-items:center;gap:5px;font-size:10.5px;color:var(--dsw-alias-label-tertiary);min-width:0}
.dc-context-field .dc-select-sm{min-width:120px}
.dc-context-loading{display:inline-flex;align-items:center;gap:5px;font-size:10.5px;color:var(--dsw-alias-label-tertiary)}
.dc-context-spacer{flex:1}
.dc-sql-split{display:flex;flex-direction:column;gap:2px;flex:1;min-height:0;overflow:hidden}
.dc-sql-split-resizing{user-select:none;cursor:row-resize}
.dc-sql-divider{display:flex;align-items:center;justify-content:center;height:10px;flex:none;cursor:row-resize;outline:none;border-radius:var(--dsw-radius-xs)}
.dc-sql-divider:hover,.dc-sql-divider-active{background:var(--dsw-alias-interactive-bg-hover)}
.dc-sql-divider:focus-visible{outline:var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color);outline-offset:-1px}
.dc-sql-divider-grip{display:flex;color:var(--dsw-alias-label-tertiary);transform:rotate(90deg);opacity:.7}
.dc-editor-card{display:flex;flex-direction:column;flex:0 0 44%;min-height:130px;border:.5px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-md);background:var(--dsw-alias-bg-layer-1);overflow:hidden}
.dc-editor-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:6px 10px;border-bottom:.5px solid var(--dsw-alias-border-l1);flex:none;flex-wrap:wrap}
.dc-editor-title{font-size:10px;text-transform:uppercase;letter-spacing:.07em;color:var(--dsw-alias-label-tertiary);font-weight:600}
.dc-editor-hint{font-size:9.5px;color:var(--dsw-alias-label-tertiary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;text-align:end;min-width:0}
.dc-editor-head .dc-btn+ .dc-btn{margin-left:3px}
.dc-editor-head .dc-btn{height:21px;padding:0 5px;font-size:9.5px;color:var(--dsw-alias-label-tertiary);flex:none}
.dc-editor-wrap{position:relative;flex:1;min-height:0;overflow:hidden;background:var(--dsw-alias-markdown-code-block)}
.dc-editor-wrap:focus-within{box-shadow:inset 0 0 0 1px var(--dsw-focus-ring-color)}
.dc-editor-highlight{position:absolute;inset:0;z-index:0;margin:0;padding:11px 13px;overflow:auto;pointer-events:none;background:transparent;color:var(--dsw-alias-label-primary);font-family:var(--ds-font-family-code);font-size:12px;line-height:19px;font-weight:400;letter-spacing:normal;font-variant-ligatures:none;font-feature-settings:"liga" 0,"calt" 0;tab-size:2;white-space:pre;scrollbar-width:none}
.dc-editor-highlight::-webkit-scrollbar{width:0;height:0;display:none}
.dc-editor-highlight code{display:block;min-width:100%;width:max-content;font:inherit;line-height:inherit;letter-spacing:inherit;white-space:pre;tab-size:inherit}
.dc-editor{position:absolute;inset:0;z-index:1;display:block;width:100%;height:100%;padding:11px 13px;border:0;outline:none;resize:none;background:transparent;color:transparent;-webkit-text-fill-color:transparent;caret-color:var(--dsw-alias-label-primary);font-family:var(--ds-font-family-code);font-size:12px;line-height:19px;font-weight:400;letter-spacing:normal;font-variant-ligatures:none;font-feature-settings:"liga" 0,"calt" 0;tab-size:2;white-space:pre;overflow:auto}
.dc-editor::placeholder{color:var(--dsw-alias-label-tertiary);-webkit-text-fill-color:var(--dsw-alias-label-tertiary);opacity:1}
.dc-editor::selection{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 24%,transparent);color:transparent;-webkit-text-fill-color:transparent}
.dc-sql-keyword{color:var(--dsw-alias-brand-primary)}
.dc-sql-type{color:var(--dsw-alias-state-business-primary)}
.dc-sql-string{color:var(--dsw-alias-state-success-primary)}
.dc-sql-comment{color:var(--dsw-alias-label-tertiary)}
.dc-sql-number{color:var(--dsw-alias-state-warn-primary)}
.dc-sql-function{color:var(--dsw-alias-label-primary)}
.dc-sql-parameter{color:var(--dsw-alias-state-business-primary)}
.dc-sql-operator{color:var(--dsw-alias-label-secondary)}
.dc-sql-identifier{color:var(--dsw-alias-label-primary)}
.dc-result-card{display:flex;flex-direction:column;flex:1;min-height:100px;border:.5px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-md);background:var(--dsw-alias-bg-layer-1);overflow:hidden}
.dc-sql-split-minimized .dc-editor-card{flex:1}
.dc-result-card-minimized{flex:0 0 auto;min-height:0}
.dc-result-head{display:flex;align-items:center;gap:8px;padding:5px 8px 5px 11px;border-bottom:.5px solid var(--dsw-alias-border-l1);flex:none;min-height:34px}
.dc-result-card-minimized .dc-result-head{border-bottom:0}
.dc-result-title-wrap{display:flex;align-items:center;gap:7px;min-width:0;flex:1;flex-wrap:wrap}
.dc-result-title{font-size:10px;text-transform:uppercase;letter-spacing:.07em;color:var(--dsw-alias-label-tertiary);font-weight:600}
.dc-result-meta{font-size:9.5px;color:var(--dsw-alias-label-tertiary)}
.dc-result-context{font-size:9.5px;color:var(--dsw-alias-label-secondary);font-family:var(--ds-font-family-code);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:42%}
.dc-result-context-warn,.dc-result-truncated{flex:none;margin-bottom:6px;font-size:10px}
.dc-result-truncated{color:var(--dsw-alias-state-warn-primary)}
.dc-result-actions{display:flex;align-items:center;gap:6px;flex:none}
.dc-result-body{flex:1;min-height:0;display:flex;flex-direction:column;overflow:auto;padding:8px}
.dc-result-error{flex:none;margin-bottom:7px}
.dc-result-tabs{display:flex;gap:2px;flex:none;margin-bottom:6px;overflow:auto}
.dc-result-tab{height:24px;padding:0 8px;border:.5px solid transparent;border-radius:var(--dsw-radius-xs);background:transparent;color:var(--dsw-alias-label-tertiary);font-size:10px;cursor:pointer;white-space:nowrap}
.dc-result-tab:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.dc-result-tab-active{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-border-l1)}
.dc-result-summary{font-size:10px;color:var(--dsw-alias-label-tertiary);padding:0 2px 6px;flex:none}
.dc-result-scroll{flex:1;min-height:0;overflow:auto;border:.5px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-bg-base)}
.dc-result-placeholder{display:flex;align-items:center;justify-content:center;gap:8px;flex:1;min-height:90px;color:var(--dsw-alias-label-tertiary);font-size:11px;text-align:center;padding:20px}
.dc-result-minimized-summary{padding:2px 11px 7px;color:var(--dsw-alias-label-tertiary);font-size:10.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dc-risk{display:inline-flex;align-items:center;height:18px;padding:0 6px;border-radius:99px;font-size:9px;font-weight:600;letter-spacing:.02em;white-space:nowrap}
.dc-risk-read{background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 11%,transparent);color:var(--dsw-alias-state-success-primary)}
.dc-risk-write{background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 12%,transparent);color:var(--dsw-alias-state-warn-primary)}
.dc-risk-danger{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 12%,transparent);color:var(--dsw-alias-state-error-primary)}
.dc-ai-root{position:absolute;inset:0;z-index:40;pointer-events:none;width:100%;height:100%;max-width:none;max-height:none;margin:0;padding:0;border:0;background:transparent;overflow:visible;color:var(--dsw-alias-label-primary)}
.dc-ai-toggle{position:relative}
.dc-ai-card{pointer-events:auto;position:absolute;right:18px;bottom:18px;display:flex;flex-direction:column;width:min(440px,calc(100% - 24px));height:min(620px,calc(100% - 28px));max-height:calc(100% - 24px);border:1px solid var(--dsw-alias-border-l2);border-radius:18px;background:var(--dsw-alias-bg-overlay);box-shadow:var(--dsw-shadow-lv3);overflow:hidden;backdrop-filter:blur(18px)}
.dc-ai-card-dragging{user-select:none;box-shadow:var(--dsw-shadow-lv3);transition:none}
.dc-ai-resize{position:absolute;z-index:6;touch-action:none}
.dc-ai-resize-nw{left:0;top:0;width:12px;height:12px;cursor:nwse-resize}
.dc-ai-resize-ne{right:0;top:0;width:12px;height:12px;cursor:nesw-resize}
.dc-ai-resize-sw{left:0;bottom:0;width:12px;height:12px;cursor:nesw-resize}
.dc-ai-resize-se{right:0;bottom:0;width:14px;height:14px;display:flex;align-items:flex-end;justify-content:flex-end;padding:1px;cursor:nwse-resize;color:var(--dsw-alias-label-tertiary);opacity:.55}
.dc-ai-resize-se:hover{opacity:1;color:var(--dsw-alias-brand-primary)}
.dc-ai-resize-grip{display:flex;pointer-events:none}
.dc-ai-head{display:flex;align-items:center;gap:8px;min-height:58px;padding:8px 9px 8px 11px;border-bottom:.5px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);flex:none;touch-action:none}
.dc-ai-grip{display:flex;color:var(--dsw-alias-label-tertiary);flex:none;opacity:.8}
.dc-ai-mark{display:flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:11px;background:linear-gradient(145deg,color-mix(in srgb,var(--dsw-alias-brand-primary) 20%,transparent),color-mix(in srgb,var(--dsw-alias-state-business-primary) 13%,transparent));color:var(--dsw-alias-brand-primary);border:.5px solid color-mix(in srgb,var(--dsw-alias-brand-primary) 22%,transparent);flex:none;box-shadow:inset 0 1px 0 color-mix(in srgb,var(--dsw-alias-label-primary-foreground) 25%,transparent)}
.dc-ai-heading{display:flex;flex-direction:column;min-width:0;flex:1;gap:1px}
.dc-ai-title{font-size:14px;font-weight:600;line-height:18px;letter-spacing:-.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dc-ai-subtitle{font-size:10px;line-height:14px;color:var(--dsw-alias-label-tertiary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dc-ai-head-spacer{flex:1}
.dc-ai-head .dc-icon-btn{width:28px;height:28px}
.dc-ai-context{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,.85fr);gap:7px;padding:8px 12px;border-bottom:.5px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);flex:none}
.dc-ai-context-caption{font-size:9px;letter-spacing:.05em;text-transform:uppercase;color:var(--dsw-alias-label-tertiary);font-weight:600}
.dc-ai-context-field{display:flex;flex-direction:column;gap:3px;min-width:0;color:var(--dsw-alias-label-tertiary)}
.dc-ai-context-field .dc-select-xs{width:100%;max-width:none;height:30px;padding:0 7px;font-size:11px;background:var(--dsw-alias-bg-base)}
.dc-ai-loading{grid-column:1/-1;display:flex;align-items:center;gap:5px;color:var(--dsw-alias-label-tertiary);font-size:9.5px}
.dc-ai-context-error{margin:0;border-radius:0;border-width:0 0 .5px;font-size:10px;flex:none}
.dc-ai-context-error .dc-icon-btn{margin-left:auto;width:20px;height:20px}
.dc-ai-no-context{display:flex;align-items:flex-start;gap:8px;padding:9px 12px;background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 7%,transparent);border-bottom:.5px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-secondary);font-size:10.5px;line-height:16px;flex:none}
.dc-ai-no-context svg{color:var(--dsw-alias-state-warn-primary);flex:none;margin-top:1px}
.dc-ai-no-context div{display:flex;flex-direction:column;gap:1px;min-width:0}
.dc-ai-no-context strong{font-weight:500;color:var(--dsw-alias-label-primary)}
.dc-ai-no-context span{font-size:9.5px;color:var(--dsw-alias-label-tertiary)}
.dc-ai-messages{flex:1;min-height:0;overflow:auto;padding:14px;display:flex;flex-direction:column;gap:10px;scroll-behavior:smooth;background:var(--dsw-alias-bg-base)}
.dc-ai-messages-empty{justify-content:center}
.dc-ai-welcome{display:flex;flex-direction:column;align-items:center;text-align:center;gap:6px;padding:8px 4px;color:var(--dsw-alias-label-secondary);font-size:11px;line-height:17px;max-width:360px;margin:0 auto}
.dc-ai-welcome-icon{display:flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:14px;background:linear-gradient(145deg,color-mix(in srgb,var(--dsw-alias-brand-primary) 16%,transparent),color-mix(in srgb,var(--dsw-alias-state-business-primary) 10%,transparent));color:var(--dsw-alias-brand-primary);border:.5px solid color-mix(in srgb,var(--dsw-alias-brand-primary) 20%,transparent);margin-bottom:2px}
.dc-ai-welcome strong{font-size:14px;color:var(--dsw-alias-label-primary);font-weight:600;line-height:20px}
.dc-ai-welcome p{margin:0;color:var(--dsw-alias-label-tertiary);font-size:10.5px;line-height:16px}
.dc-ai-suggestions{display:flex;flex-direction:column;gap:6px;width:100%;margin-top:8px;text-align:start}
.dc-ai-suggestion{display:flex;align-items:center;gap:8px;width:100%;padding:8px 10px;border:.5px solid var(--dsw-alias-border-l1);border-radius:9px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);font-size:11px;line-height:16px;text-align:start;cursor:pointer;transition:background .12s,border-color .12s,color .12s}
.dc-ai-suggestion svg{color:var(--dsw-alias-label-tertiary);flex:none}
.dc-ai-suggestion:hover{border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 45%,var(--dsw-alias-border-l2));background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.dc-ai-suggestion:focus-visible{outline:var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color);outline-offset:1px}
.dc-ai-msg{display:flex;flex-direction:column;gap:4px;max-width:94%;min-width:0}
.dc-ai-msg-user{align-self:flex-end;align-items:flex-end}
.dc-ai-msg-assistant{align-self:flex-start;align-items:flex-start;max-width:100%;width:100%}
.dc-ai-msg-role{font-size:9px;color:var(--dsw-alias-label-tertiary);padding:0 3px}
.dc-ai-msg-text{padding:8px 10px;border-radius:11px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font-size:11.5px;line-height:18px;white-space:pre-wrap;overflow-wrap:anywhere;max-width:100%}
.dc-ai-msg-user .dc-ai-msg-text{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 13%,var(--dsw-alias-bg-layer-1));border-bottom-right-radius:4px}
.dc-ai-msg-assistant .dc-ai-msg-text{background:var(--dsw-alias-bg-layer-1);border:.5px solid var(--dsw-alias-border-l1);border-bottom-left-radius:4px}
.dc-ai-thinking-msg .dc-ai-msg-text{color:var(--dsw-alias-label-tertiary)}
.dc-ai-system-event{display:flex;align-items:flex-start;gap:7px;padding:8px 9px;border:.5px solid color-mix(in srgb,var(--dsw-alias-state-error-primary) 24%,transparent);border-radius:9px;background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 7%,transparent);color:var(--dsw-alias-label-secondary);font-size:10px;line-height:15px}
.dc-ai-system-icon{display:flex;color:var(--dsw-alias-state-error-primary);flex:none;margin-top:1px}
.dc-ai-system-body{display:flex;flex-direction:column;gap:3px;min-width:0;flex:1}
.dc-ai-system-body strong{font-size:10.5px;font-weight:600;color:var(--dsw-alias-label-primary)}
.dc-ai-system-body span{overflow-wrap:anywhere}
.dc-ai-system-sql{margin:2px 0 0;padding:5px 6px;border-radius:5px;background:var(--dsw-alias-markdown-code-block);font-family:var(--ds-font-family-code);font-size:9.5px;line-height:14px;white-space:pre-wrap;overflow-wrap:anywhere;max-height:100px;overflow:auto;color:var(--dsw-alias-label-secondary)}
.dc-ai-inline-error{font-size:10.5px}
.dc-plan{width:100%;margin-top:5px;border:.5px solid var(--dsw-alias-border-l1);border-radius:11px;background:var(--dsw-alias-bg-base);overflow:hidden}
.dc-plan-danger{border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 30%,transparent)}
.dc-plan-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 9px;background:var(--dsw-alias-bg-layer-1);border-bottom:.5px solid var(--dsw-alias-border-l1)}
.dc-plan-title{display:inline-flex;align-items:center;gap:5px;font-size:9.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--dsw-alias-label-tertiary);font-weight:600}
.dc-plan-sql{margin:0;padding:8px 9px;font-family:var(--ds-font-family-code);font-size:10.5px;line-height:16px;white-space:pre-wrap;overflow-wrap:anywhere;max-height:150px;overflow:auto;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-markdown-code-block)}
.dc-plan-context{padding:0 9px 5px;font-size:9.5px;color:var(--dsw-alias-label-tertiary);font-family:var(--ds-font-family-code)}
.dc-plan-status{display:flex;align-items:center;gap:6px;padding:7px 9px;border-top:.5px solid var(--dsw-alias-border-l1);font-size:10.5px;color:var(--dsw-alias-label-secondary);flex-wrap:wrap}
.dc-plan-status-done{color:var(--dsw-alias-state-success-primary)}
.dc-plan-status-error{color:var(--dsw-alias-state-error-primary)}
.dc-plan-status .dc-btn{margin-left:auto}
.dc-plan-warning{display:flex;align-items:flex-start;gap:6px;padding:6px 9px;font-size:10px;line-height:15px;color:var(--dsw-alias-label-secondary);background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 8%,transparent);border-top:.5px solid var(--dsw-alias-border-l1)}
.dc-plan-warning svg{color:var(--dsw-alias-state-warn-primary);flex:none;margin-top:1px}
.dc-plan-warning-danger{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 8%,transparent)}
.dc-plan-warning-danger svg{color:var(--dsw-alias-state-error-primary)}
.dc-plan-actions{display:flex;align-items:center;gap:5px;padding:6px 9px;border-top:.5px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1)}
.dc-ai-compose{flex:none;border-top:.5px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);padding:10px 12px 11px}
.dc-ai-input{display:block;width:100%;min-height:60px;max-height:120px;resize:none;border:.5px solid var(--dsw-alias-border-l1);border-radius:12px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);padding:8px 10px;font-size:11.5px;line-height:18px;outline:none}
.dc-ai-input:hover{border-color:var(--dsw-alias-border-l2)}
.dc-ai-input:focus{border-color:var(--dsw-focus-ring-color);box-shadow:0 0 0 1px var(--dsw-focus-ring-color)}
.dc-ai-compose-foot{display:flex;align-items:center;gap:8px;margin-top:7px}
.dc-ai-context-label{flex:1;min-width:0;font-size:9.5px;color:var(--dsw-alias-label-tertiary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dc-ai-send{width:30px;height:30px;min-width:30px;padding:0;border-radius:50%;flex:none}
.dc-ai-send .dc-spinner{border-color:color-mix(in srgb,var(--dsw-alias-label-primary-foreground) 35%,transparent);border-top-color:var(--dsw-alias-label-primary-foreground)}
html[data-platform='darwin'] .dc-header{padding-top:calc(10px + var(--dsh-frame-top-clearance,0px))}
@keyframes dc-spin{to{transform:rotate(360deg)}}
@keyframes dc-pulse{0%,100%{opacity:.45}50%{opacity:1}}
@media (forced-colors:active){.dc-editor-highlight{display:none}.dc-editor{color:CanvasText;-webkit-text-fill-color:CanvasText;background:Canvas;caret-color:CanvasText}}
@media (prefers-reduced-motion:reduce){.dc-spinner,.dc-source-dot-busy{animation:none}.dc-btn{transition:none}.dc-ai-messages{scroll-behavior:auto}}
@media (max-width:980px){.dc-tree{width:250px}.dc-brand-copy{max-width:230px}.dc-content{padding-left:14px;padding-right:14px}}
@media (max-width:760px){.dc-header{gap:10px;padding:8px 12px}.dc-brand-copy{max-width:180px}.dc-tabs{margin-left:auto}.dc-body{flex-direction:column;overflow:auto}.dc-tree{width:100%;max-height:260px;border-right:0;border-bottom:.5px solid var(--dsw-alias-border-l1);flex:none;min-height:110px}.dc-main{overflow:visible;flex:1;min-height:320px}.dc-content{min-height:320px;padding:10px 12px;overflow:visible}.dc-sql-page{overflow:hidden}.dc-form-grid{grid-template-columns:1fr}.dc-span-2{grid-column:auto}.dc-welcome-steps{display:none}.dc-content-actions{justify-content:flex-start}.dc-content-head{align-items:flex-start;flex-direction:column;gap:6px}.dc-overview-head{align-items:flex-start;flex-direction:column}.dc-search-box{width:100%;max-width:none}.dc-editor-card{flex-basis:42%}}
@media (max-width:560px){.dc-ai-head{cursor:default!important}.dc-ai-grip{display:none}.dc-ai-resize{display:none}.dc-ai-card{left:12px!important;top:auto!important;right:12px!important;bottom:12px!important;width:auto!important;height:min(620px,calc(100% - 24px))!important;max-height:calc(100% - 24px)!important}}
@media (max-width:520px){.dc-brand-sub{display:none}.dc-status-chip{display:none}.dc-tabs .dc-tab{padding:0 8px}.dc-content-title{font-size:15px}.dc-table-cards{grid-template-columns:1fr}.dc-filter-value{max-width:none;flex-basis:100%}.dc-sql-context{gap:5px}.dc-context-field{flex:1;min-width:130px}.dc-context-spacer{display:none}.dc-modal-backdrop{padding:10px}.dc-modal-foot-note{max-width:none;flex-basis:100%;font-size:9px}.dc-ai-context{grid-template-columns:1fr}.dc-ai-loading{grid-column:auto}}
`;

    function installStyle(ctx) {
      ctx.effect(() => {
        const tag = document.createElement('style');
        tag.setAttribute('data-dsh-plugin', PKG);
        tag.textContent = PAGE_CSS;
        document.head.appendChild(tag);
        return () => tag.remove();
      }, 'dshcat: styles');
    }

    function apply(ctx) {
      currentContext = ctx;
      store = createStore();
      installStyle(ctx);
      ctx.effect(() => ctx.locale.register(LOCALE_NS, dictionaries()), 'dshcat: locale dictionaries');
      const t = ctx.locale.bind(LOCALE_NS);
      actions = createActions(t);
      ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
        name: 'sidebar.panellist',
        id: PANEL_ID,
        order: 35,
        label: () => t('panel.label')
      }, SidebarIcon));
      ctx.slots.inject('main', () => ctx.slots.register({
        name: 'main',
        key: PANEL_ID,
        locale: LOCALE_NS
      }, DshCatPanel));
    }

    return { inject: ['slots', 'layout', 'locale'], apply };
  }
});
