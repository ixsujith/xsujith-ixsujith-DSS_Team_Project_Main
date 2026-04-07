// ─────────────────────────────────────────
// STATE
// ─────────────────────────────────────────
let allQueries            = [];
let builderConfigId       = null;
let builderSelectedDbType = null;
let builderTable          = null;
let builderColumns        = [];
let allTables             = [];
let joinCount             = 0;
let whereCount            = 0;
let testRunPage           = 0;
let testRunTotalPages     = 0;

// ─────────────────────────────────────────
// ELEMENT REFERENCES — Form
// ─────────────────────────────────────────
const queryNameInput        = document.getElementById('queryName');
const dbTypeSelect          = document.getElementById('dbType');
const descriptionInput      = document.getElementById('description');
const queryTextArea         = document.getElementById('queryText');
const saveQueryBtn          = document.getElementById('saveQueryBtn');
const clearBtn              = document.getElementById('clearBtn');
const formAlert             = document.getElementById('formAlert');

// Test Run elements — all suffixed with El to avoid browser global ID clash
const testConnectionGroupEl = document.getElementById('testConnectionGroup');
const testConnectionEl      = document.getElementById('testConnection');
const testRunBtnEl          = document.getElementById('testRunBtn');
const testRunAreaEl         = document.getElementById('testRunArea');
const testRunAlertEl        = document.getElementById('testRunAlert');
const testRunSpinnerEl      = document.getElementById('testRunSpinner');
const testRunSummaryEl      = document.getElementById('testRunSummary');
const testRunTableWrapperEl = document.getElementById('testRunTableWrapper');
const testRunTableHeadEl    = document.getElementById('testRunTableHead');
const testRunTableBodyEl    = document.getElementById('testRunTableBody');
const testRunEmptyStateEl   = document.getElementById('testRunEmptyState');
const testRunPaginationEl   = document.getElementById('testRunPagination');
const testRunPrevBtnEl      = document.getElementById('testRunPrevBtn');
const testRunNextBtnEl      = document.getElementById('testRunNextBtn');
const testRunPageInfoEl     = document.getElementById('testRunPageInfo');

// Table elements
const tableAlert            = document.getElementById('tableAlert');
const tableSpinner          = document.getElementById('tableSpinner');
const queryTableBody        = document.getElementById('queryTableBody');
const emptyState            = document.getElementById('emptyState');
const tableWrapper          = document.getElementById('tableWrapper');
const filterDbType          = document.getElementById('filterDbType');
const searchInput           = document.getElementById('searchInput');
const searchCount           = document.getElementById('searchCount');

// Builder elements
const builderToggle         = document.getElementById('builderToggle');
const builderBody           = document.getElementById('builderBody');
const builderAlert          = document.getElementById('builderAlert');
const builderDbTypeEl       = document.getElementById('builderDbType');
const builderConn           = document.getElementById('builderConnection');
const builderTableSel       = document.getElementById('builderTable');
const columnCheckboxes      = document.getElementById('columnCheckboxes');
const joinRowsEl            = document.getElementById('joinRows');
const whereRowsEl           = document.getElementById('whereRows');
const addJoinBtn            = document.getElementById('addJoinBtn');
const addWhereBtn           = document.getElementById('addWhereBtn');
const generatedSql          = document.getElementById('generatedSql');
const useQueryBtn           = document.getElementById('useQueryBtn');
const resetBuilderBtn       = document.getElementById('resetBuilderBtn');

// Builder step sections
const builderStep2          = document.getElementById('builderStep2');
const builderStep3          = document.getElementById('builderStep3');
const builderStep4          = document.getElementById('builderStep4');
const builderStep5          = document.getElementById('builderStep5');
const builderStep6          = document.getElementById('builderStep6');

// ─────────────────────────────────────────
// UTILITY
// ─────────────────────────────────────────
function showAlert(el, message, type) {
    el.textContent = message;
    el.className   = `alert ${type} show`;
}

function hideAlert(el) {
    el.className   = 'alert';
    el.textContent = '';
}

function enableBuilderStep(step) {
    step.style.opacity       = '1';
    step.style.pointerEvents = 'auto';
}

function disableBuilderStep(step) {
    step.style.opacity       = '0.4';
    step.style.pointerEvents = 'none';
}

// ─────────────────────────────────────────
// SESSION STORAGE — Form state
// ─────────────────────────────────────────
function saveFormState() {
    sessionStorage.setItem('qm_name',        queryNameInput.value);
    sessionStorage.setItem('qm_dbType',      dbTypeSelect.value);
    sessionStorage.setItem('qm_description', descriptionInput.value);
    sessionStorage.setItem('qm_queryText',   queryTextArea.value);
}

function restoreFormState() {
    const name   = sessionStorage.getItem('qm_name');
    const dbType = sessionStorage.getItem('qm_dbType');
    const desc   = sessionStorage.getItem('qm_description');
    const query  = sessionStorage.getItem('qm_queryText');

    if (name)   queryNameInput.value   = name;
    if (desc)   descriptionInput.value = desc;
    if (query)  queryTextArea.value    = query;

    // dbType dropdown must wait until options are loaded
    if (dbType) sessionStorage.setItem('qm_pending_dbType', dbType);
}

function clearFormState() {
    sessionStorage.removeItem('qm_name');
    sessionStorage.removeItem('qm_dbType');
    sessionStorage.removeItem('qm_description');
    sessionStorage.removeItem('qm_queryText');
    sessionStorage.removeItem('qm_pending_dbType');
}

// Save state on every input change
[queryNameInput, descriptionInput, queryTextArea].forEach(el => {
    el.addEventListener('input', saveFormState);
});

// ─────────────────────────────────────────
// SESSION STORAGE — Builder state
// ─────────────────────────────────────────
function saveBuilderState() {
    sessionStorage.setItem('qm_builder_dbType',   builderDbTypeEl.value);
    sessionStorage.setItem('qm_builder_configId', builderConn.value);
    sessionStorage.setItem('qm_builder_table',    builderTableSel.value);
}

function clearBuilderState() {
    sessionStorage.removeItem('qm_builder_dbType');
    sessionStorage.removeItem('qm_builder_configId');
    sessionStorage.removeItem('qm_builder_table');
}

async function restoreBuilderState() {
    const dbType   = sessionStorage.getItem('qm_builder_dbType');
    const configId = sessionStorage.getItem('qm_builder_configId');
    const table    = sessionStorage.getItem('qm_builder_table');

    if (!dbType) return;

    // Restore DB type selection
    builderDbTypeEl.value = dbType;
    builderSelectedDbType = dbType;

    // Load connections for this DB type
    try {
        const configs = await getConfigsByDbType(dbType);
        builderConn.innerHTML = '<option value="">-- Select Connection --</option>';

        if (!Array.isArray(configs) || configs.length === 0) return;

        configs.forEach(c => {
            const opt       = document.createElement('option');
            opt.value       = c.configId;
            opt.textContent = c.dbName;
            builderConn.appendChild(opt);
        });

        builderConn.disabled = false;

        if (!configId) return;

        // Restore connection selection
        builderConn.value = configId;
        builderConfigId   = parseInt(configId);

        // Load tables for this connection
        const tables = await getSchemaTables(builderConfigId);
        allTables    = tables;

        builderTableSel.innerHTML = '<option value="">-- Select Table --</option>';
        tables.forEach(t => {
            const opt       = document.createElement('option');
            opt.value       = t;
            opt.textContent = t;
            builderTableSel.appendChild(opt);
        });

        enableBuilderStep(builderStep2);

        if (!table) return;

        // Restore table selection
        builderTableSel.value = table;
        builderTable          = table;

        // Load columns for this table
        const columns  = await getSchemaColumns(builderConfigId, table);
        builderColumns = columns;

        columnCheckboxes.innerHTML = '';
        columns.forEach(col => {
            const item     = document.createElement('label');
            item.className = 'column-checkbox-item';
            item.innerHTML = `
                <input type="checkbox" class="col-checkbox" value="${col}" />
                ${col}
            `;
            item.querySelector('input').addEventListener('change', generateSQL);
            columnCheckboxes.appendChild(item);
        });

        enableBuilderStep(builderStep3);
        enableBuilderStep(builderStep4);
        enableBuilderStep(builderStep5);
        enableBuilderStep(builderStep6);

        generateSQL();

    } catch (err) {
        console.error('Failed to restore builder state:', err);
    }
}

// ─────────────────────────────────────────
// INIT — Load DB types into all dropdowns
// ─────────────────────────────────────────
async function loadDbTypes() {
    try {
        const types = await getAllDbTypes();

        dbTypeSelect.innerHTML    = '<option value="">-- Select Type --</option>';
        filterDbType.innerHTML    = '<option value="">-- All Types --</option>';
        builderDbTypeEl.innerHTML = '<option value="">-- Select DB Type --</option>';

        if (!Array.isArray(types) || types.length === 0) return;

        types.forEach(type => {
            [dbTypeSelect, filterDbType, builderDbTypeEl].forEach(sel => {
                const opt       = document.createElement('option');
                opt.value       = type;
                opt.textContent = type;
                sel.appendChild(opt);
            });
        });

        // Restore pending dbType for form after options are loaded
        const pendingDbType = sessionStorage.getItem('qm_pending_dbType');
        if (pendingDbType) {
            dbTypeSelect.value = pendingDbType;
            sessionStorage.removeItem('qm_pending_dbType');
            await loadTestConnections(pendingDbType);
        }

    } catch (err) {
        showAlert(formAlert, 'Failed to load DB types. Is the backend running?', 'alert-error');
    }
}

// ─────────────────────────────────────────
// DB TYPE CHANGE — Save state + load test connections
// ─────────────────────────────────────────
dbTypeSelect.addEventListener('change', async () => {
    saveFormState();
    resetTestRun();
    testRunBtnEl.disabled               = true;
    testConnectionGroupEl.style.display = 'none';
    testConnectionEl.innerHTML          = '<option value="">-- Select Connection --</option>';

    if (!dbTypeSelect.value) return;

    await loadTestConnections(dbTypeSelect.value);
});

async function loadTestConnections(dbType) {
    try {
        const configs = await getConfigsByDbType(dbType);

        if (!Array.isArray(configs) || configs.length === 0) return;

        testConnectionEl.innerHTML = '<option value="">-- Select Connection --</option>';
        configs.forEach(config => {
            const opt       = document.createElement('option');
            opt.value       = config.configId;
            opt.textContent = config.dbName;
            testConnectionEl.appendChild(opt);
        });

        testConnectionGroupEl.style.display = 'block';

        // Auto-select if only one connection
        if (configs.length === 1) {
            testConnectionEl.value = configs[0].configId;
            updateTestRunBtn();
        }

    } catch (err) {
        console.error('Failed to load test connections:', err);
    }
}

testConnectionEl.addEventListener('change', updateTestRunBtn);

// Enable Test Run button only when both connection and query text exist
function updateTestRunBtn() {
    testRunBtnEl.disabled = !(testConnectionEl.value && queryTextArea.value.trim());
}

// Update test button as user types query
queryTextArea.addEventListener('input', () => {
    saveFormState();
    updateTestRunBtn();
});

// ─────────────────────────────────────────
// TEST RUN — Execute
// ─────────────────────────────────────────
testRunBtnEl.addEventListener('click', () => {
    testRunPage = 0;
    runTestQuery();
});

async function runTestQuery() {
    const queryText = queryTextArea.value.trim();
    const configId  = parseInt(testConnectionEl.value);

    if (!queryText) {
        showAlert(testRunAlertEl, 'Please enter a SQL query first.', 'alert-error');
        return;
    }
    if (!configId) {
        showAlert(testRunAlertEl, 'Please select a connection.', 'alert-error');
        return;
    }

    resetTestRunResults();
    testRunAreaEl.style.display = 'block';
    testRunSpinnerEl.classList.add('show');

    testRunAreaEl.scrollIntoView({ behavior: 'smooth', block: 'start' });

    try {
        const result = await executeTempQuery({
            configId  : configId,
            queryText : queryText,
            page      : testRunPage,
            pageSize  : 10
        });

        if (result.error) {
            showAlert(testRunAlertEl, result.error, 'alert-error');
            return;
        }

        testRunTotalPages = result.totalPages;

        testRunSummaryEl.innerHTML = `
            ✅ <strong>Test passed.</strong>
            &nbsp; 📊 <strong>Total Rows:</strong> ${result.totalRows}
            &nbsp; 📄 <strong>Page:</strong> ${result.page + 1} of ${result.totalPages}
            &nbsp; 📋 <strong>Columns:</strong> ${result.columns.length}
        `;
        testRunSummaryEl.style.display = 'block';

        if (!result.rows || result.rows.length === 0) {
            testRunEmptyStateEl.style.display = 'block';
        } else {
            renderTestTable(result.columns, result.rows);
            testRunTableWrapperEl.style.display = 'block';
        }

        if (result.totalPages > 1) {
            testRunPageInfoEl.textContent     = `Page ${result.page + 1} of ${result.totalPages}`;
            testRunPrevBtnEl.disabled         = result.page === 0;
            testRunNextBtnEl.disabled         = result.page >= result.totalPages - 1;
            testRunPaginationEl.style.display = 'flex';
        }

    } catch (err) {
        showAlert(testRunAlertEl, 'Test run failed. Check your query and connection.', 'alert-error');
    } finally {
        testRunSpinnerEl.classList.remove('show');
    }
}

function renderTestTable(columns, rows) {
    testRunTableHeadEl.innerHTML = '';
    const headerRow = document.createElement('tr');
    columns.forEach(col => {
        const th       = document.createElement('th');
        th.textContent = col;
        headerRow.appendChild(th);
    });
    testRunTableHeadEl.appendChild(headerRow);

    testRunTableBodyEl.innerHTML = '';
    rows.forEach(row => {
        const tr = document.createElement('tr');
        row.forEach(cell => {
            const td = document.createElement('td');
            if (cell === 'NULL') {
                td.innerHTML = '<span style="color:#999;font-style:italic;">NULL</span>';
            } else {
                td.textContent = cell;
            }
            tr.appendChild(td);
        });
        testRunTableBodyEl.appendChild(tr);
    });
}

testRunPrevBtnEl.addEventListener('click', () => {
    if (testRunPage > 0) { testRunPage--; runTestQuery(); }
});

testRunNextBtnEl.addEventListener('click', () => {
    if (testRunPage < testRunTotalPages - 1) { testRunPage++; runTestQuery(); }
});

function resetTestRun() {
    testRunAreaEl.style.display = 'none';
    resetTestRunResults();
}

function resetTestRunResults() {
    testRunTableHeadEl.innerHTML        = '';
    testRunTableBodyEl.innerHTML        = '';
    testRunEmptyStateEl.style.display   = 'none';
    testRunTableWrapperEl.style.display = 'none';
    testRunPaginationEl.style.display   = 'none';
    testRunSummaryEl.innerHTML          = '';
    testRunSummaryEl.style.display      = 'none';
    hideAlert(testRunAlertEl);
}

// ─────────────────────────────────────────
// BUILDER — Toggle open/close
// ─────────────────────────────────────────
builderToggle.addEventListener('click', () => {
    builderToggle.classList.toggle('open');
    builderBody.classList.toggle('open');
});

// ─────────────────────────────────────────
// BUILDER — Step 1a: DB Type selected
// ─────────────────────────────────────────
builderDbTypeEl.addEventListener('change', async () => {
    hideAlert(builderAlert);
    builderConn.innerHTML  = '<option value="">-- Loading... --</option>';
    builderConn.disabled   = true;
    builderConfigId        = null;
    builderSelectedDbType  = builderDbTypeEl.value;
    saveBuilderState();
    resetBuilderFromStep2();

    if (!builderDbTypeEl.value) {
        builderConn.innerHTML = '<option value="">-- Select DB Type first --</option>';
        return;
    }

    try {
        const configs = await getConfigsByDbType(builderDbTypeEl.value);
        builderConn.innerHTML = '<option value="">-- Select Connection --</option>';

        if (!Array.isArray(configs) || configs.length === 0) {
            builderConn.innerHTML = `<option value="" disabled>No connections found</option>`;
            return;
        }

        configs.forEach(c => {
            const opt       = document.createElement('option');
            opt.value       = c.configId;
            opt.textContent = c.dbName;
            builderConn.appendChild(opt);
        });

        builderConn.disabled = false;

    } catch (err) {
        showAlert(builderAlert, 'Failed to load connections.', 'alert-error');
    }
});

// ─────────────────────────────────────────
// BUILDER — Step 1b: Connection selected → fetch tables
// ─────────────────────────────────────────
builderConn.addEventListener('change', async () => {
    hideAlert(builderAlert);
    resetBuilderFromStep2();

    if (!builderConn.value) return;

    builderConfigId = parseInt(builderConn.value);
    saveBuilderState();
    builderTableSel.innerHTML = '<option value="">-- Loading tables... --</option>';
    enableBuilderStep(builderStep2);

    try {
        const tables = await getSchemaTables(builderConfigId);
        allTables    = tables;

        builderTableSel.innerHTML = '<option value="">-- Select Table --</option>';
        tables.forEach(t => {
            const opt       = document.createElement('option');
            opt.value       = t;
            opt.textContent = t;
            builderTableSel.appendChild(opt);
        });

    } catch (err) {
        showAlert(builderAlert, 'Failed to load tables.', 'alert-error');
        disableBuilderStep(builderStep2);
    }
});

// ─────────────────────────────────────────
// BUILDER — Step 2: Table selected → fetch columns
// ─────────────────────────────────────────
builderTableSel.addEventListener('change', async () => {
    hideAlert(builderAlert);
    builderTable = builderTableSel.value;
    saveBuilderState();

    columnCheckboxes.innerHTML = '<span style="color:#888;font-size:13px;">Loading columns...</span>';
    joinRowsEl.innerHTML       = '';
    whereRowsEl.innerHTML      = '';
    joinCount                  = 0;
    whereCount                 = 0;

    disableBuilderStep(builderStep3);
    disableBuilderStep(builderStep4);
    disableBuilderStep(builderStep5);
    disableBuilderStep(builderStep6);

    if (!builderTable) return;

    try {
        const columns  = await getSchemaColumns(builderConfigId, builderTable);
        builderColumns = columns;

        columnCheckboxes.innerHTML = '';
        columns.forEach(col => {
            const item     = document.createElement('label');
            item.className = 'column-checkbox-item';
            item.innerHTML = `
                <input type="checkbox" class="col-checkbox" value="${col}" />
                ${col}
            `;
            item.querySelector('input').addEventListener('change', generateSQL);
            columnCheckboxes.appendChild(item);
        });

        enableBuilderStep(builderStep3);
        enableBuilderStep(builderStep4);
        enableBuilderStep(builderStep5);
        enableBuilderStep(builderStep6);

        generateSQL();

    } catch (err) {
        showAlert(builderAlert, 'Failed to load columns.', 'alert-error');
        columnCheckboxes.innerHTML =
            '<span style="color:#888;font-size:13px;">Failed to load columns.</span>';
    }
});

// ─────────────────────────────────────────
// BUILDER — Add JOIN row
// ─────────────────────────────────────────
addJoinBtn.addEventListener('click', () => {
    joinCount++;
    const id  = `join_${joinCount}`;
    const row = document.createElement('div');
    row.className = 'join-row';
    row.id        = id;

    const tableOptions = allTables.map(t =>
        `<option value="${t}">${t}</option>`
    ).join('');

    row.innerHTML = `
        <select class="join-type" onchange="generateSQL()">
            <option value="INNER JOIN">INNER JOIN</option>
            <option value="LEFT JOIN">LEFT JOIN</option>
            <option value="RIGHT JOIN">RIGHT JOIN</option>
        </select>
        <select class="join-table" onchange="handleJoinTableChange('${id}')">
            <option value="">-- Table --</option>
            ${tableOptions}
        </select>
        <select class="join-on-left" onchange="generateSQL()">
            <option value="">-- Left column --</option>
            ${builderColumns.map(c =>
        `<option value="${builderTable}.${c}">${builderTable}.${c}</option>`
    ).join('')}
        </select>
        <select class="join-on-right" onchange="generateSQL()">
            <option value="">-- Right column --</option>
        </select>
        <button class="remove-btn" onclick="removeRow('${id}')">✕</button>
    `;

    joinRowsEl.appendChild(row);
});

async function handleJoinTableChange(rowId) {
    const row       = document.getElementById(rowId);
    const joinTable = row.querySelector('.join-table').value;
    const rightSel  = row.querySelector('.join-on-right');

    rightSel.innerHTML = '<option value="">-- Loading... --</option>';

    if (!joinTable) {
        rightSel.innerHTML = '<option value="">-- Right column --</option>';
        generateSQL();
        return;
    }

    try {
        const cols = await getSchemaColumns(builderConfigId, joinTable);
        rightSel.innerHTML = '<option value="">-- Right column --</option>';
        cols.forEach(c => {
            const opt       = document.createElement('option');
            opt.value       = `${joinTable}.${c}`;
            opt.textContent = `${joinTable}.${c}`;
            rightSel.appendChild(opt);
        });
    } catch (err) {
        rightSel.innerHTML = '<option value="">-- Failed to load --</option>';
    }

    generateSQL();
}

// ─────────────────────────────────────────
// BUILDER — Add WHERE row
// ─────────────────────────────────────────
addWhereBtn.addEventListener('click', () => {
    whereCount++;
    const id  = `where_${whereCount}`;
    const row = document.createElement('div');
    row.className = 'where-row';
    row.id        = id;

    const allColumnOptions = builderColumns.map(c =>
        `<option value="${builderTable}.${c}">${builderTable}.${c}</option>`
    ).join('');

    row.innerHTML = `
        <select class="where-column" onchange="generateSQL()">
            <option value="">-- Column --</option>
            ${allColumnOptions}
        </select>
        <select class="where-operator" onchange="generateSQL()">
            <option value="=">=</option>
            <option value="!=">!=</option>
            <option value=">">></option>
            <option value="<"><</option>
            <option value=">=">>=</option>
            <option value="<="><=</option>
            <option value="LIKE">LIKE</option>
            <option value="IS NULL">IS NULL</option>
            <option value="IS NOT NULL">IS NOT NULL</option>
        </select>
        <input type="text" class="where-value"
            placeholder="value" oninput="generateSQL()" />
        <button class="remove-btn" onclick="removeRow('${id}')">✕</button>
    `;

    whereRowsEl.appendChild(row);
    generateSQL();
});

// ─────────────────────────────────────────
// BUILDER — Remove row
// ─────────────────────────────────────────
function removeRow(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
    generateSQL();
}

// ─────────────────────────────────────────
// BUILDER — Generate SQL live
// ─────────────────────────────────────────
function generateSQL() {
    if (!builderTable) return;

    const checked    = [...document.querySelectorAll('.col-checkbox:checked')]
        .map(cb => cb.value);
    const columnPart = checked.length > 0 ? checked.join(', ') : '*';

    const joinClauses = [];
    document.querySelectorAll('.join-row').forEach(row => {
        const type  = row.querySelector('.join-type')?.value;
        const table = row.querySelector('.join-table')?.value;
        const left  = row.querySelector('.join-on-left')?.value;
        const right = row.querySelector('.join-on-right')?.value;
        if (type && table && left && right) {
            joinClauses.push(`${type} ${table} ON ${left} = ${right}`);
        }
    });

    const whereClauses = [];
    document.querySelectorAll('.where-row').forEach(row => {
        const col      = row.querySelector('.where-column')?.value;
        const operator = row.querySelector('.where-operator')?.value;
        const value    = row.querySelector('.where-value')?.value.trim();

        if (col && operator) {
            if (operator === 'IS NULL' || operator === 'IS NOT NULL') {
                whereClauses.push(`${col} ${operator}`);
            } else if (value) {
                const isNumeric = !isNaN(value) && value !== '';
                const formatted = isNumeric ? value : `'${value}'`;
                whereClauses.push(`${col} ${operator} ${formatted}`);
            }
        }
    });

    let sql = `SELECT ${columnPart}\nFROM ${builderTable}`;
    if (joinClauses.length > 0)  sql += '\n' + joinClauses.join('\n');
    if (whereClauses.length > 0) sql += '\nWHERE ' + whereClauses.join('\n  AND ');

    generatedSql.innerHTML = syntaxHighlight(sql);
}

function syntaxHighlight(sql) {
    return sql
        .replace(/\b(SELECT|FROM|WHERE|AND|OR|INNER JOIN|LEFT JOIN|RIGHT JOIN|ON|IS NULL|IS NOT NULL|LIKE)\b/g,
            '<span class="sql-keyword">$1</span>')
        .replace(/\*/g, '<span class="sql-column">*</span>');
}

// ─────────────────────────────────────────
// BUILDER — Use This Query
// ─────────────────────────────────────────
useQueryBtn.addEventListener('click', () => {
    const sql = generatedSql.innerText || generatedSql.textContent;

    if (!sql || sql.includes('Select a table')) {
        showAlert(builderAlert, 'Please select a table first.', 'alert-error');
        return;
    }

    queryTextArea.value = sql.trim();

    if (builderDbTypeEl.value) {
        dbTypeSelect.value = builderDbTypeEl.value;
        loadTestConnections(builderDbTypeEl.value);
        saveFormState();
    }

    builderToggle.classList.remove('open');
    builderBody.classList.remove('open');

    document.getElementById('queryName').scrollIntoView({
        behavior: 'smooth', block: 'start'
    });

    setTimeout(() => queryNameInput.focus(), 400);
});

// ─────────────────────────────────────────
// BUILDER — Reset
// ─────────────────────────────────────────
resetBuilderBtn.addEventListener('click', () => {
    builderDbTypeEl.value  = '';
    builderConn.innerHTML  = '<option value="">-- Select DB Type first --</option>';
    builderConn.disabled   = true;
    builderConfigId        = null;
    builderTable           = null;
    builderColumns         = [];
    allTables              = [];
    clearBuilderState();
    hideAlert(builderAlert);
    resetBuilderFromStep2();
});

function resetBuilderFromStep2() {
    builderTableSel.innerHTML  = '<option value="">-- Select a connection first --</option>';
    columnCheckboxes.innerHTML =
        '<span style="color:#888;font-size:13px;">Select a table to see columns</span>';
    joinRowsEl.innerHTML       = '';
    whereRowsEl.innerHTML      = '';
    joinCount                  = 0;
    whereCount                 = 0;
    generatedSql.innerHTML     = 'Select a table to generate SQL...';
    builderTable               = null;
    builderColumns             = [];

    disableBuilderStep(builderStep2);
    disableBuilderStep(builderStep3);
    disableBuilderStep(builderStep4);
    disableBuilderStep(builderStep5);
    disableBuilderStep(builderStep6);
}

// ─────────────────────────────────────────
// SAVE QUERY FORM
// ─────────────────────────────────────────
saveQueryBtn.addEventListener('click', async () => {
    hideAlert(formAlert);

    const data = {
        name       : queryNameInput.value.trim(),
        dbType     : dbTypeSelect.value.trim(),
        description: descriptionInput.value.trim(),
        queryText  : queryTextArea.value.trim()
    };

    if (!data.name) {
        showAlert(formAlert, 'Query name is required.', 'alert-error');
        queryNameInput.focus();
        return;
    }
    if (!data.description) {
        showAlert(formAlert, 'Description is required.', 'alert-error');
        descriptionInput.focus();
        return;
    }
    if (!data.dbType) {
        showAlert(formAlert, 'Please select a database type.', 'alert-error');
        return;
    }
    if (!data.queryText) {
        showAlert(formAlert, 'SQL query cannot be empty.', 'alert-error');
        queryTextArea.focus();
        return;
    }

    saveQueryBtn.disabled    = true;
    saveQueryBtn.textContent = 'Saving...';

    try {
        const result = await saveQuery(data);

        if (result.queryId) {
            showAlert(formAlert, `Query "${result.name}" saved successfully.`, 'alert-success');
            resetForm();
            await loadQueries();
        } else {
            showAlert(formAlert, result.error || 'Failed to save query.', 'alert-error');
        }
    } catch (err) {
        showAlert(formAlert, 'Something went wrong. Please try again.', 'alert-error');
    } finally {
        saveQueryBtn.disabled    = false;
        saveQueryBtn.textContent = 'Save Query';
    }
});

clearBtn.addEventListener('click', () => {
    resetForm();
    hideAlert(formAlert);
});

function resetForm() {
    queryNameInput.value                = '';
    dbTypeSelect.value                  = '';
    descriptionInput.value              = '';
    queryTextArea.value                 = '';
    testConnectionGroupEl.style.display = 'none';
    testConnectionEl.innerHTML          = '<option value="">-- Select Connection --</option>';
    testRunBtnEl.disabled               = true;
    resetTestRun();
    clearFormState();
}

// ─────────────────────────────────────────
// LIVE SEARCH
// ─────────────────────────────────────────
searchInput.addEventListener('input', () => {
    renderTable(getFilteredQueries());
});

filterDbType.addEventListener('change', () => {
    renderTable(getFilteredQueries());
});

function getFilteredQueries() {
    const term       = searchInput.value.trim().toLowerCase();
    const typeFilter = filterDbType.value;

    return allQueries.filter(q => {
        const matchesType = typeFilter ? q.dbType === typeFilter : true;
        const matchesTerm = term
            ? q.name.toLowerCase().includes(term) ||
            (q.description && q.description.toLowerCase().includes(term))
            : true;
        return matchesType && matchesTerm;
    });
}

// ─────────────────────────────────────────
// LOAD QUERIES
// ─────────────────────────────────────────
async function loadQueries() {
    tableSpinner.classList.add('show');
    tableWrapper.style.display = 'none';
    emptyState.style.display   = 'none';
    hideAlert(tableAlert);

    try {
        allQueries = await getAllQueries();
        renderTable(getFilteredQueries());
    } catch (err) {
        showAlert(tableAlert, 'Failed to load queries.', 'alert-error');
    } finally {
        tableSpinner.classList.remove('show');
    }
}

// ─────────────────────────────────────────
// RENDER TABLE
// ─────────────────────────────────────────
function renderTable(queries) {
    const term = searchInput.value.trim().toLowerCase();

    queryTableBody.innerHTML = '';

    searchCount.textContent = queries.length === allQueries.length
        ? `${allQueries.length} queries total`
        : `Showing ${queries.length} of ${allQueries.length} queries`;

    if (queries.length === 0) {
        tableWrapper.style.display = 'none';
        emptyState.style.display   = 'block';
        emptyState.textContent     = term
            ? `No queries match "${term}".`
            : 'No queries saved yet. Add one above.';
        return;
    }

    emptyState.style.display   = 'none';
    tableWrapper.style.display = 'block';

    queries.forEach((query, index) => {
        const createdAt = query.createdAt
            ? new Date(query.createdAt).toLocaleString()
            : '—';

        const preview = query.queryText.length > 60
            ? query.queryText.substring(0, 60) + '...'
            : query.queryText;

        const highlightedName = term
            ? query.name.replace(
                new RegExp(`(${term})`, 'gi'),
                '<span class="highlight">$1</span>')
            : query.name;

        const description = query.description
            ? (term
                ? query.description.replace(
                    new RegExp(`(${term})`, 'gi'),
                    '<span class="highlight">$1</span>')
                : query.description)
            : '<span style="color:#999;">—</span>';

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td><strong>${highlightedName}</strong></td>
            <td>${description}</td>
            <td><span class="badge badge-info">${query.dbType}</span></td>
            <td>
                <code style="
                    background:#f0f2f5;
                    padding:3px 8px;
                    border-radius:4px;
                    font-size:12px;
                    color:#1e3a5f;
                ">${preview}</code>
            </td>
            <td>${createdAt}</td>
            <td>
                <button class="btn btn-danger"
                    style="padding:6px 14px;font-size:12px;"
                    onclick="handleDelete(${query.queryId}, '${query.name.replace(/'/g, "\\'")}')">
                    Delete
                </button>
            </td>
        `;
        queryTableBody.appendChild(row);
    });
}

// ─────────────────────────────────────────
// DELETE QUERY
// ─────────────────────────────────────────
async function handleDelete(id, name) {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
        const response = await deleteQuery(id);

        if (response.ok || response.status === 204) {
            showAlert(tableAlert, `Query "${name}" deleted successfully.`, 'alert-success');
            await loadQueries();
        } else {
            const result = await response.json();
            showAlert(tableAlert, result.error || 'Failed to delete.', 'alert-error');
        }
    } catch (err) {
        showAlert(tableAlert, 'Something went wrong while deleting.', 'alert-error');
    }
}

// ─────────────────────────────────────────
// INIT
// ─────────────────────────────────────────
async function init() {
    restoreFormState();
    await loadDbTypes();
    await restoreBuilderState();
    await loadQueries();
}

init();