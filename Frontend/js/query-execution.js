// ─────────────────────────────────────────
// STATE
// ─────────────────────────────────────────
let selectedQueryId      = null;
let selectedConfigId     = null;
let selectedDbType       = null;
let currentPage          = 0;
let currentPageSize      = 50;
let totalPages           = 0;

let allQueriesForType    = [];
let scratchPage          = 0;
let scratchTotalPages    = 0;
let scratchPageSize      = 50;
let scratchConfigId      = null;

// ─────────────────────────────────────────
// ELEMENT REFERENCES — Main Execution
// ─────────────────────────────────────────
const dbTypeSelect          = document.getElementById('dbTypeSelect');
const connectionSelect      = document.getElementById('connectionSelect');
const querySearchInput      = document.getElementById('querySearchInput');
const querySearchResults    = document.getElementById('querySearchResults');
const selectedQueryBadge    = document.getElementById('selectedQueryBadge');
const selectedQueryName     = document.getElementById('selectedQueryName');
const clearQueryBtn         = document.getElementById('clearQueryBtn');
const queryPreviewBox       = document.getElementById('queryPreviewBox');
const queryPreview          = document.getElementById('queryPreview');
const queryDescriptionText  = document.getElementById('queryDescriptionText');
const pageSizeSelect        = document.getElementById('pageSizeSelect');
const executeBtn            = document.getElementById('executeBtn');
const resetBtn              = document.getElementById('resetBtn');
const executionAlert        = document.getElementById('executionAlert');
const resultsCard           = document.getElementById('resultsCard');
const resultsSpinner        = document.getElementById('resultsSpinner');
const resultsTableWrapper   = document.getElementById('resultsTableWrapper');
const resultsTableHead      = document.getElementById('resultsTableHead');
const resultsTableBody      = document.getElementById('resultsTableBody');
const resultsEmptyState     = document.getElementById('resultsEmptyState');
const resultSummary         = document.getElementById('resultSummary');
const pagination            = document.getElementById('pagination');
const prevBtn               = document.getElementById('prevBtn');
const nextBtn               = document.getElementById('nextBtn');
const pageInfo              = document.getElementById('pageInfo');

// Step indicators
const step1Indicator        = document.getElementById('step1Indicator');
const step2Indicator        = document.getElementById('step2Indicator');
const step3Indicator        = document.getElementById('step3Indicator');
const line1                 = document.getElementById('line1');
const line2                 = document.getElementById('line2');

// ─────────────────────────────────────────
// ELEMENT REFERENCES — Scratchpad
// ─────────────────────────────────────────
const scratchpadToggle      = document.getElementById('scratchpadToggle');
const scratchpadBody        = document.getElementById('scratchpadBody');
const scratchDbType         = document.getElementById('scratchDbType');
const scratchConnection     = document.getElementById('scratchConnection');
const scratchQuery          = document.getElementById('scratchQuery');
const scratchRunBtn         = document.getElementById('scratchRunBtn');
const scratchClearBtn       = document.getElementById('scratchClearBtn');
const scratchPageSizeEl     = document.getElementById('scratchPageSize');   // ← fixed name
const scratchResultsArea    = document.getElementById('scratchResultsArea');
const scratchSummary        = document.getElementById('scratchSummary');
const scratchSpinner        = document.getElementById('scratchSpinner');
const scratchTableWrapper   = document.getElementById('scratchTableWrapper');
const scratchTableHead      = document.getElementById('scratchTableHead');
const scratchTableBody      = document.getElementById('scratchTableBody');
const scratchEmptyState     = document.getElementById('scratchEmptyState');
const scratchPagination     = document.getElementById('scratchPagination');
const scratchPrevBtn        = document.getElementById('scratchPrevBtn');
const scratchNextBtn        = document.getElementById('scratchNextBtn');
const scratchPageInfo       = document.getElementById('scratchPageInfo');
const scratchpadAlert       = document.getElementById('scratchpadAlert');

// ─────────────────────────────────────────
// UTILITY
// ─────────────────────────────────────────
function showAlert(message, type) {
  executionAlert.textContent = message;
  executionAlert.className   = `alert ${type} show`;
}

function hideAlert() {
  executionAlert.className   = 'alert';
  executionAlert.textContent = '';
}

function showScratchAlert(message, type) {
  scratchpadAlert.textContent = message;
  scratchpadAlert.className   = `alert ${type} show`;
}

function hideScratchAlert() {
  scratchpadAlert.className   = 'alert';
  scratchpadAlert.textContent = '';
}

// ─────────────────────────────────────────
// STEP INDICATORS
// ─────────────────────────────────────────
function updateSteps(completedSteps) {
  [step1Indicator, step2Indicator, step3Indicator].forEach((el, i) => {
    el.classList.remove('active', 'done');
    if (i < completedSteps)        el.classList.add('done');
    else if (i === completedSteps) el.classList.add('active');
  });
  line1.classList.toggle('done', completedSteps >= 2);
  line2.classList.toggle('done', completedSteps >= 3);
}

// ─────────────────────────────────────────
// INIT — Load DB Types into all dropdowns
// ─────────────────────────────────────────
async function loadDbTypes() {
  try {
    const types = await getAllDbTypes();

    dbTypeSelect.innerHTML  = '<option value="">-- Select DB Type --</option>';
    scratchDbType.innerHTML = '<option value="">-- Select DB Type --</option>';

    if (!Array.isArray(types) || types.length === 0) {
      showAlert(
          'No DB configurations found. Please add one on the DB Config page.',
          'alert-info'
      );
      return;
    }

    types.forEach(type => {
      const opt1       = document.createElement('option');
      opt1.value       = type;
      opt1.textContent = type;
      dbTypeSelect.appendChild(opt1);

      const opt2       = document.createElement('option');
      opt2.value       = type;
      opt2.textContent = type;
      scratchDbType.appendChild(opt2);
    });

  } catch (err) {
    showAlert('Failed to load DB types. Is the backend running?', 'alert-error');
  }
}

// ─────────────────────────────────────────
// STEP 1 — DB Type Selected
// ─────────────────────────────────────────
dbTypeSelect.addEventListener('change', async () => {
  hideAlert();
  resetQuerySelection();
  resetResults();

  const type = dbTypeSelect.value;

  connectionSelect.innerHTML = '<option value="">-- Loading connections... --</option>';
  connectionSelect.disabled  = true;
  selectedConfigId           = null;
  selectedDbType             = null;

  updateSteps(type ? 1 : 0);

  if (!type) {
    connectionSelect.innerHTML = '<option value="">-- Select a DB Type first --</option>';
    return;
  }

  try {
    const configs = await getConfigsByDbType(type);

    connectionSelect.innerHTML = '<option value="">-- Select Connection --</option>';

    if (!Array.isArray(configs) || configs.length === 0) {
      showAlert(
          `No connections found for "${type}". Add one on the DB Config page.`,
          'alert-info'
      );
      connectionSelect.innerHTML =
          `<option value="" disabled>No connections for ${type}</option>`;
      return;
    }

    configs.forEach(config => {
      const opt       = document.createElement('option');
      opt.value       = config.configId;
      opt.textContent = config.dbName;
      connectionSelect.appendChild(opt);
    });

    connectionSelect.disabled = false;
    selectedDbType            = type;

  } catch (err) {
    showAlert('Failed to load connections. Please try again.', 'alert-error');
  }
});

// ─────────────────────────────────────────
// STEP 2 — Connection Selected
// ─────────────────────────────────────────
connectionSelect.addEventListener('change', async () => {
  hideAlert();
  resetQuerySelection();
  resetResults();

  const configId = connectionSelect.value;

  if (!configId) {
    querySearchInput.disabled    = true;
    querySearchInput.placeholder = 'Select a connection first...';
    selectedConfigId             = null;
    allQueriesForType            = [];
    updateSteps(1);
    return;
  }

  selectedConfigId = parseInt(configId);
  updateSteps(2);

  try {
    const queries     = await getQueriesByDbType(selectedDbType);
    allQueriesForType = Array.isArray(queries) ? queries : [];

    if (allQueriesForType.length === 0) {
      querySearchInput.placeholder = `No queries saved for ${selectedDbType}`;
      querySearchInput.disabled    = true;
      showAlert(
          `No queries found for "${selectedDbType}". Go to Query Management to add one.`,
          'alert-info'
      );
      return;
    }

    querySearchInput.disabled    = false;
    querySearchInput.placeholder = `Search ${allQueriesForType.length} saved queries...`;

  } catch (err) {
    showAlert('Failed to load queries. Please try again.', 'alert-error');
  }
});

// ─────────────────────────────────────────
// STEP 3 — Live Search
// ─────────────────────────────────────────
querySearchInput.addEventListener('input', () => {
  const term = querySearchInput.value.trim().toLowerCase();
  renderSearchResults(term);
});

querySearchInput.addEventListener('focus', () => {
  if (allQueriesForType.length > 0) {
    renderSearchResults(querySearchInput.value.trim().toLowerCase());
  }
});

document.addEventListener('click', (e) => {
  if (!e.target.closest('#querySearchWrapper')) {
    querySearchResults.classList.remove('open');
  }
});

function renderSearchResults(term) {
  querySearchResults.innerHTML = '';

  const filtered = term
      ? allQueriesForType.filter(q =>
          q.name.toLowerCase().includes(term) ||
          (q.description && q.description.toLowerCase().includes(term))
      )
      : allQueriesForType;

  if (filtered.length === 0) {
    querySearchResults.innerHTML =
        `<div class="search-no-results">No queries match "${term}"</div>`;
    querySearchResults.classList.add('open');
    return;
  }

  filtered.forEach(query => {
    const item     = document.createElement('div');
    item.className = 'search-result-item';

    const highlightedName = term
        ? query.name.replace(
            new RegExp(`(${term})`, 'gi'),
            '<span class="highlight">$1</span>'
        )
        : query.name;

    item.innerHTML = `
            <div class="query-name">${highlightedName}</div>
            ${query.description
        ? `<div class="query-desc">${query.description}</div>`
        : ''}
        `;

    item.addEventListener('click', () => selectQuery(query));
    querySearchResults.appendChild(item);
  });

  querySearchResults.classList.add('open');
}

function selectQuery(query) {
  selectedQueryId = query.queryId;

  selectedQueryName.textContent    = query.name;
  selectedQueryBadge.classList.add('show');

  queryPreview.textContent         = query.queryText;
  queryDescriptionText.textContent = query.description
      ? '📝 ' + query.description
      : '';
  queryDescriptionText.style.display = query.description ? 'block' : 'none';
  queryPreviewBox.style.display    = 'block';

  querySearchInput.value           = '';
  querySearchResults.classList.remove('open');

  executeBtn.disabled              = false;
  updateSteps(3);
}

clearQueryBtn.addEventListener('click', () => {
  resetQuerySelection();
  updateSteps(2);
});

function resetQuerySelection() {
  selectedQueryId                      = null;
  selectedQueryBadge.classList.remove('show');
  selectedQueryName.textContent        = '';
  queryPreviewBox.style.display        = 'none';
  queryPreview.textContent             = '';
  queryDescriptionText.textContent     = '';
  querySearchInput.value               = '';
  querySearchResults.classList.remove('open');
  executeBtn.disabled                  = true;
  resetResults();
}

// ─────────────────────────────────────────
// PAGE SIZE CHANGE
// ─────────────────────────────────────────
pageSizeSelect.addEventListener('change', () => {
  currentPageSize = parseInt(pageSizeSelect.value);
  if (selectedQueryId && selectedConfigId) {
    currentPage = 0;
    runExecution();
  }
});

// ─────────────────────────────────────────
// EXECUTE
// ─────────────────────────────────────────
executeBtn.addEventListener('click', () => {
  currentPage     = 0;
  currentPageSize = parseInt(pageSizeSelect.value);
  runExecution();
});

async function runExecution() {
  if (!selectedQueryId || !selectedConfigId) return;

  hideAlert();
  resetResults();

  resultsCard.style.display         = 'block';
  resultsSpinner.classList.add('show');
  resultsTableWrapper.style.display = 'none';
  resultsEmptyState.style.display   = 'none';
  pagination.style.display          = 'none';

  resultsCard.scrollIntoView({ behavior: 'smooth', block: 'start' });

  try {
    const result = await executeQuery({
      queryId  : selectedQueryId,
      configId : selectedConfigId,
      page     : currentPage,
      pageSize : currentPageSize
    });

    if (result.error) {
      showAlert(result.error, 'alert-error');
      resultsCard.style.display = 'none';
      return;
    }

    totalPages = result.totalPages;

    resultSummary.innerHTML = `
            <span>📊 <strong>Total Rows:</strong> ${result.totalRows}</span>
            <span>📄 <strong>Page:</strong> ${result.page + 1} of ${result.totalPages}</span>
            <span>📋 <strong>Columns:</strong> ${result.columns.length}</span>
        `;

    if (!result.rows || result.rows.length === 0) {
      resultsEmptyState.style.display = 'block';
    } else {
      renderTable(resultsTableHead, resultsTableBody, result.columns, result.rows);
      resultsTableWrapper.style.display = 'block';
    }

    if (result.totalPages > 1) {
      updatePagination(result.page, result.totalPages);
      pagination.style.display = 'flex';
    }

  } catch (err) {
    showAlert('Execution failed. Please try again.', 'alert-error');
    resultsCard.style.display = 'none';
  } finally {
    resultsSpinner.classList.remove('show');
  }
}

// ─────────────────────────────────────────
// SHARED TABLE RENDERER
// ─────────────────────────────────────────
function renderTable(thead, tbody, columns, rows) {
  thead.innerHTML = '';
  const headerRow = document.createElement('tr');
  columns.forEach(col => {
    const th       = document.createElement('th');
    th.textContent = col;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);

  tbody.innerHTML = '';
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
    tbody.appendChild(tr);
  });
}

// ─────────────────────────────────────────
// PAGINATION — Main
// ─────────────────────────────────────────
function updatePagination(page, total) {
  pageInfo.textContent = `Page ${page + 1} of ${total}`;
  prevBtn.disabled     = page === 0;
  nextBtn.disabled     = page >= total - 1;
}

prevBtn.addEventListener('click', () => {
  if (currentPage > 0) { currentPage--; runExecution(); }
});

nextBtn.addEventListener('click', () => {
  if (currentPage < totalPages - 1) { currentPage++; runExecution(); }
});

// ─────────────────────────────────────────
// RESET — Main
// ─────────────────────────────────────────
function resetResults() {
  resultsCard.style.display         = 'none';
  resultsTableHead.innerHTML        = '';
  resultsTableBody.innerHTML        = '';
  resultsEmptyState.style.display   = 'none';
  resultsTableWrapper.style.display = 'none';
  pagination.style.display          = 'none';
  resultSummary.innerHTML           = '';
}

resetBtn.addEventListener('click', () => {
  dbTypeSelect.value                 = '';
  connectionSelect.innerHTML         = '<option value="">-- Select a DB Type first --</option>';
  connectionSelect.disabled          = true;
  querySearchInput.disabled          = true;
  querySearchInput.placeholder       = 'Select a connection first...';
  allQueriesForType                  = [];
  selectedDbType                     = null;
  selectedConfigId                   = null;
  currentPage                        = 0;
  resetQuerySelection();
  hideAlert();
  updateSteps(0);
});

// ─────────────────────────────────────────
// SCRATCHPAD — Toggle
// ─────────────────────────────────────────
scratchpadToggle.addEventListener('click', () => {
  scratchpadToggle.classList.toggle('open');
  scratchpadBody.classList.toggle('open');
});

// ─────────────────────────────────────────
// SCRATCHPAD — Step 1: DB Type
// ─────────────────────────────────────────
scratchDbType.addEventListener('change', async () => {
  hideScratchAlert();
  scratchConnection.innerHTML = '<option value="">-- Loading... --</option>';
  scratchConnection.disabled  = true;
  scratchRunBtn.disabled      = true;
  scratchConfigId             = null;
  resetScratchResults();

  const type = scratchDbType.value;
  if (!type) {
    scratchConnection.innerHTML = '<option value="">-- Select DB Type first --</option>';
    return;
  }

  try {
    const configs = await getConfigsByDbType(type);
    scratchConnection.innerHTML = '<option value="">-- Select Connection --</option>';

    if (!Array.isArray(configs) || configs.length === 0) {
      scratchConnection.innerHTML =
          `<option value="" disabled>No connections for ${type}</option>`;
      return;
    }

    configs.forEach(config => {
      const opt       = document.createElement('option');
      opt.value       = config.configId;
      opt.textContent = config.dbName;
      scratchConnection.appendChild(opt);
    });

    scratchConnection.disabled = false;

  } catch (err) {
    showScratchAlert('Failed to load connections.', 'alert-error');
  }
});

// ─────────────────────────────────────────
// SCRATCHPAD — Step 2: Connection
// ─────────────────────────────────────────
scratchConnection.addEventListener('change', () => {
  scratchConfigId        = scratchConnection.value
      ? parseInt(scratchConnection.value)
      : null;
  scratchRunBtn.disabled = !scratchConfigId;
  resetScratchResults();
});

// ─────────────────────────────────────────
// SCRATCHPAD — Run
// ─────────────────────────────────────────
scratchRunBtn.addEventListener('click', () => {
  scratchPage     = 0;
  scratchPageSize = parseInt(scratchPageSizeEl.value || 50);  // ← fixed
  runScratchQuery();
});

async function runScratchQuery() {
  const queryText = scratchQuery.value.trim();

  hideScratchAlert();

  if (!queryText) {
    showScratchAlert('Please enter a SQL query.', 'alert-error');
    return;
  }

  if (!scratchConfigId) {
    showScratchAlert('Please select a connection.', 'alert-error');
    return;
  }

  resetScratchResults();
  scratchResultsArea.style.display = 'block';
  scratchSpinner.classList.add('show');

  try {
    const result = await executeTempQuery({
      configId  : scratchConfigId,
      queryText : queryText,
      page      : scratchPage,
      pageSize  : parseInt(scratchPageSizeEl.value)    // ← fixed
    });

    if (result.error) {
      showScratchAlert(result.error, 'alert-error');
      scratchResultsArea.style.display = 'none';
      return;
    }

    scratchTotalPages = result.totalPages;

    scratchSummary.innerHTML = `
            <span>📊 <strong>Total Rows:</strong> ${result.totalRows}</span>
            &nbsp;&nbsp;
            <span>📄 <strong>Page:</strong> ${result.page + 1} of ${result.totalPages}</span>
        `;

    if (!result.rows || result.rows.length === 0) {
      scratchEmptyState.style.display = 'block';
    } else {
      renderTable(scratchTableHead, scratchTableBody, result.columns, result.rows);
      scratchTableWrapper.style.display = 'block';
    }

    if (result.totalPages > 1) {
      scratchPageInfo.textContent     = `Page ${result.page + 1} of ${result.totalPages}`;
      scratchPrevBtn.disabled         = result.page === 0;
      scratchNextBtn.disabled         = result.page >= result.totalPages - 1;
      scratchPagination.style.display = 'flex';
    }

  } catch (err) {
    showScratchAlert('Query failed. Check your SQL and try again.', 'alert-error');
    scratchResultsArea.style.display = 'none';
  } finally {
    scratchSpinner.classList.remove('show');
  }
}

scratchPrevBtn.addEventListener('click', () => {
  if (scratchPage > 0) { scratchPage--; runScratchQuery(); }
});

scratchNextBtn.addEventListener('click', () => {
  if (scratchPage < scratchTotalPages - 1) { scratchPage++; runScratchQuery(); }
});

scratchClearBtn.addEventListener('click', () => {
  scratchDbType.value         = '';
  scratchConnection.innerHTML = '<option value="">-- Select DB Type first --</option>';
  scratchConnection.disabled  = true;
  scratchQuery.value          = '';
  scratchRunBtn.disabled      = true;
  scratchConfigId             = null;
  hideScratchAlert();
  resetScratchResults();
});

function resetScratchResults() {
  scratchResultsArea.style.display  = 'none';
  scratchTableHead.innerHTML        = '';
  scratchTableBody.innerHTML        = '';
  scratchEmptyState.style.display   = 'none';
  scratchTableWrapper.style.display = 'none';
  scratchPagination.style.display   = 'none';
  scratchSummary.innerHTML          = '';
}

// ─────────────────────────────────────────
// INIT
// ─────────────────────────────────────────
updateSteps(0);
loadDbTypes();