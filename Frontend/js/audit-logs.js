// ── Element References ──
const filterDbType = document.getElementById("filterDbType");
const refreshBtn = document.getElementById("refreshBtn");
const tableAlert = document.getElementById("tableAlert");
const tableSpinner = document.getElementById("tableSpinner");
const tableWrapper = document.getElementById("tableWrapper");
const logsTableBody = document.getElementById("logsTableBody");
const emptyState = document.getElementById("emptyState");
const logSummary = document.getElementById("logSummary");
const modalOverlay = document.getElementById("modalOverlay");
const modalQueryText = document.getElementById("modalQueryText");

// ─────────────────────────────────────────
// Utility — Show / Hide Alert
// ─────────────────────────────────────────
function showAlert(message, type) {
  tableAlert.textContent = message;
  tableAlert.className = `alert ${type} show`;
}

function hideAlert() {
  tableAlert.className = "alert";
  tableAlert.textContent = "";
}

// ─────────────────────────────────────────
// To populate filter dropdown from loaded logs
// It helps to avoid dependency on db_config table
// ─────────────────────────────────────────
function populateFilterFromLogs(logs) {
  const existingValue = filterDbType.value;   // preserve current selection

  // Extract distinct db types from logs
  const types = [...new Set(logs.map(log => log.dbType))].sort();

  filterDbType.innerHTML = '<option value="">-- All Types --</option>';

  types.forEach(type => {
    const opt       = document.createElement('option');
    opt.value       = type;
    opt.textContent = type;
    filterDbType.appendChild(opt);
  });

  // Restore previous selection if it still exists
  if (existingValue && types.includes(existingValue)) {
    filterDbType.value = existingValue;
  }
}

// ─────────────────────────────────────────
// Load and Render Audit Logs
// ─────────────────────────────────────────
async function loadLogs() {
  tableSpinner.classList.add('show');
  tableWrapper.style.display  = 'none';
  emptyState.style.display    = 'none';
  logSummary.style.display    = 'none';
  hideAlert();

  try {
    // Always fetch ALL logs first
    const allLogs = await getAllAuditLogs();

    if (!Array.isArray(allLogs)) {
      showAlert('Failed to load audit logs.', 'alert-error');
      return;
    }

    // Populate filter from actual log data
    populateFilterFromLogs(allLogs);

    // Apply current filter
    const selectedType = filterDbType.value;
    const logs = selectedType
        ? allLogs.filter(log => log.dbType === selectedType)
        : allLogs;

    if (logs.length === 0) {
      emptyState.style.display = 'block';
      return;
    }

    logSummary.innerHTML = `
            ⚠️ <strong>${logs.length}</strong> failure${logs.length > 1 ? 's' : ''} logged
            ${selectedType
        ? ` for <strong>${selectedType}</strong>`
        : ' across all DB types'}.
        `;
    logSummary.style.display = 'block';

    renderTable(logs);
    tableWrapper.style.display = 'block';

  } catch (err) {
    showAlert('Failed to load audit logs. Is the backend running?', 'alert-error');
  } finally {
    tableSpinner.classList.remove('show');
  }
}

// ─────────────────────────────────────────
// Render Table Rows
// ─────────────────────────────────────────
function renderTable(logs) {
  logsTableBody.innerHTML = "";

  logs.forEach((log, index) => {
    const timestamp = log.timestamp
      ? new Date(log.timestamp).toLocaleString()
      : "—";

    // Truncate long query text — show full via modal
    const isLong = log.queryText && log.queryText.length > 60;
    const preview = isLong
      ? log.queryText.substring(0, 60) + "..."
      : log.queryText;

    // Truncate long error message
    const errorIsLong = log.errorMessage && log.errorMessage.length > 80;
    const errorPreview = errorIsLong
      ? log.errorMessage.substring(0, 80) + "..."
      : log.errorMessage;

    const row = document.createElement("tr");
    row.innerHTML = `
            <td>${index + 1}</td>
            <td style="white-space: nowrap;">${timestamp}</td>
            <td>
                <span class="badge badge-error">${log.dbType}</span>
            </td>
            <td>
                <code style="
                    background: #f0f2f5;
                    padding: 3px 8px;
                    border-radius: 4px;
                    font-size: 12px;
                    color: #1e3a5f;
                    display: block;
                    max-width: 280px;
                ">${preview}</code>
                ${
                  isLong
                    ? `
                    <button
                        onclick="openModal(\`${escapeForModal(log.queryText)}\`)"
                        style="
                            margin-top: 4px;
                            background: none;
                            border: none;
                            color: #1e3a5f;
                            font-size: 12px;
                            cursor: pointer;
                            text-decoration: underline;
                            padding: 0;
                        ">
                        View full query
                    </button>
                `
                    : ""
                }
            </td>
            <td style="color: #721c24; font-size: 13px; max-width: 300px;">
                ${errorPreview}
            </td>
        `;
    logsTableBody.appendChild(row);
  });
}

// ─────────────────────────────────────────
// Modal — View Full Query Text
// ─────────────────────────────────────────
function openModal(queryText) {
  modalQueryText.textContent = queryText;
  modalOverlay.style.display = "flex";
  document.body.style.overflow = "hidden";
}

function closeModal() {
  modalOverlay.style.display = "none";
  document.body.style.overflow = "";
  modalQueryText.textContent = "";
}

// Close modal when clicking outside the box
modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) closeModal();
});

// Close modal on Escape key
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

// ─────────────────────────────────────────
// Utility — Escape backticks for inline onclick
// ─────────────────────────────────────────
function escapeForModal(text) {
  return text.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$/g, "\\$");
}

// ─────────────────────────────────────────
// Filter Change — Reload logs
// ─────────────────────────────────────────
filterDbType.addEventListener("change", () => {
  loadLogs();
});

// ─────────────────────────────────────────
// Refresh Button
// ─────────────────────────────────────────
refreshBtn.addEventListener("click", () => {
  loadLogs();
});

// ─────────────────────────────────────────
// Init — Load everything on page load
// ─────────────────────────────────────────
async function init() {
  // await loadDbTypes();
  await loadLogs(); // loadDbTypes is not required since filter is built from logs
}

init();
