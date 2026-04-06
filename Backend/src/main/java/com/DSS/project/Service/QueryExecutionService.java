package com.DSS.project.Service;

import com.DSS.project.DTO.ExecutionRequest;
import com.DSS.project.DTO.ExecutionResponse;
import com.DSS.project.Entity.DBConfig;
import com.DSS.project.Entity.SavedQuery;
import com.DSS.project.DTO.TempExecutionRequest;
import com.DSS.project.Exception.InvalidQueryException;
import com.DSS.project.Utility.AES;
import lombok.RequiredArgsConstructor;
import net.sf.jsqlparser.parser.CCJSqlParserUtil;
import org.springframework.stereotype.Service;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
// To fetch configuration and query, connect, paginate, and perform execution
public class QueryExecutionService {

    private final DBConfigService dbConfigService;
    private final QueryService queryService;
    private final AuditLogService auditLogService;
    private final AES aesUtil;

    public ExecutionResponse execute(ExecutionRequest request) {

        // Default page and pageSize if not provided
        int page     = (request.getPage() != null)     ? request.getPage()     : 0;
        int pageSize = (request.getPageSize() != null)  ? request.getPageSize() : 50;

        // Guard pagination values
        if (page < 0) {
            throw new InvalidQueryException("Page number cannot be negative.");
        }
        if (pageSize <= 0) {
            throw new InvalidQueryException("Page size must be greater than zero.");
        }
        if (pageSize > 500) {
            throw new InvalidQueryException("Page size cannot exceed 500 rows.");
        }

        // Step 1 — Validate configId is present
        if (request.getConfigId() == null || request.getConfigId() <= 0) {
            throw new InvalidQueryException(
                    "A valid configuration must be selected.");
        }

        // Step 2 — Fetch the saved query
        SavedQuery savedQuery = queryService.getQueryById(request.getQueryId());
        String queryText      = savedQuery.getQueryText();
        String queryDbType    = savedQuery.getDbType();

        // Step 3 — Fetch the DB config by configId
        DBConfig config = dbConfigService.getConfigById(request.getConfigId());

        // Step 4 — Validate config DB type matches query DB type
        if (!config.getDbType().equalsIgnoreCase(queryDbType)) {
            throw new InvalidQueryException(
                    "Connection mismatch. Selected connection is for '" + config.getDbType() +
                            "' but the query is saved for '" + queryDbType + "'."
            );
        }

        // Step 5 — Decrypt the password
        String decryptedPassword = aesUtil.decrypt(config.getPassword());

        // Step 6 — Build JDBC URL
        String url = dbConfigService.buildUrl(
                queryDbType, config.getHost(), config.getPort(), config.getDatabaseName()
        );

        // Step 7 — Execute with pagination
        try (Connection conn = DriverManager.getConnection(
                url, config.getUsername(), decryptedPassword)) {

            // 7a — Get total row count
            int totalRows = getTotalRowCount(conn, queryText);

            // 7b — Calculate total pages
            int totalPages = (int) Math.ceil((double) totalRows / pageSize);

            // 7c — Guard: page beyond available range
            if (totalRows > 0 && page >= totalPages) {
                throw new InvalidQueryException(
                        "Page " + page + " does not exist. " +
                                "Total pages available: " + totalPages + ".");
            }

            // 7d — Build paginated query
            String paginatedQuery = buildPaginatedQuery(queryText, queryDbType, page, pageSize);

            // 7e — Execute paginated query
            try (PreparedStatement stmt = conn.prepareStatement(paginatedQuery);
                 ResultSet rs           = stmt.executeQuery()) {

                ResultSetMetaData meta = rs.getMetaData();
                int columnCount        = meta.getColumnCount();

                // Extract column names
                List<String> columns = new ArrayList<>();
                for (int i = 1; i <= columnCount; i++) {
                    columns.add(meta.getColumnName(i));
                }

                // Extract rows
                List<List<String>> rows = new ArrayList<>();
                while (rs.next()) {
                    List<String> row = new ArrayList<>();
                    for (int i = 1; i <= columnCount; i++) {
                        String value = rs.getString(i);
                        row.add(value != null ? value : "NULL");
                    }
                    rows.add(row);
                }

                // Build and return response
                ExecutionResponse response = new ExecutionResponse();
                response.setColumns(columns);
                response.setRows(rows);
                response.setPage(page);
                response.setPageSize(pageSize);
                response.setTotalRows(totalRows);
                response.setTotalPages(totalPages);

                return response;
            }

        } catch (InvalidQueryException e) {
            // Re-throw without logging — these are user errors, not execution failures
            throw e;
        } catch (Exception e) {
            // Log genuine execution failures to Audit DB
            auditLogService.logFailure(queryText, queryDbType, e.getMessage());
            throw new RuntimeException("Query execution failed: " + e.getMessage());
        }
    }

    public ExecutionResponse executeTempQuery(TempExecutionRequest request) {

        // Default page and pageSize
        int page     = (request.getPage() != null)     ? request.getPage()     : 0;
        int pageSize = (request.getPageSize() != null)  ? request.getPageSize() : 50;

        // Guard pagination values
        if (page < 0) {
            throw new InvalidQueryException("Page number cannot be negative.");
        }
        if (pageSize <= 0) {
            throw new InvalidQueryException("Page size must be greater than zero.");
        }
        if (pageSize > 500) {
            throw new InvalidQueryException("Page size cannot exceed 500 rows.");
        }

        // Validate configId
        if (request.getConfigId() == null || request.getConfigId() <= 0) {
            throw new InvalidQueryException("A valid configuration must be selected.");
        }

        // Validate queryText is not empty
        if (request.getQueryText() == null || request.getQueryText().isBlank()) {
            throw new InvalidQueryException("Query text cannot be empty.");
        }

        String queryText = request.getQueryText().trim();

        // Strip SQL comments before safety checks
        String sanitized = queryText
                .replaceAll("--[^\n]*", "")
                .replaceAll("/\\*.*?\\*/", "")
                .trim();

        // Multiple statement check
        String withoutTrailing = sanitized.endsWith(";")
                ? sanitized.substring(0, sanitized.length() - 1).trim()
                : sanitized;

        if (withoutTrailing.contains(";")) {
            throw new InvalidQueryException(
                    "Multiple statements are not allowed. Only a single SELECT query is permitted.");
        }

        // SELECT only check
        if (!sanitized.toUpperCase().startsWith("SELECT")) {
            throw new InvalidQueryException(
                    "Only SELECT queries are allowed in the scratchpad.");
        }

        // ── JSQLParser validation — fixes SQL injection warning ──
        // Ensures query is structurally valid SQL before any execution
        try {
            CCJSqlParserUtil.parse(sanitized);
        } catch (Exception e) {
            throw new InvalidQueryException(
                    "Invalid SQL syntax: " + e.getMessage());
        }

        // Fetch config by ID
        DBConfig config = dbConfigService.getConfigById(request.getConfigId());

        // Decrypt password
        String decryptedPassword = aesUtil.decrypt(config.getPassword());

        // Build JDBC URL
        String url = dbConfigService.buildUrl(
                config.getDbType(), config.getHost(), config.getPort(), config.getDatabaseName()
        );

        // Execute with pagination
        try (Connection conn = DriverManager.getConnection(
                url, config.getUsername(), decryptedPassword)) {

            // Get total row count
            int totalRows  = getTotalRowCount(conn, queryText);

            // Calculate total pages
            int totalPages = (int) Math.ceil((double) totalRows / pageSize);

            // Guard: page beyond available range
            if (totalRows > 0 && page >= totalPages) {
                throw new InvalidQueryException(
                        "Page " + page + " does not exist. " +
                                "Total pages available: " + totalPages + ".");
            }

            // Build paginated query
            String paginatedQuery = buildPaginatedQuery(
                    queryText, config.getDbType(), page, pageSize
            );

            // Execute
            try (PreparedStatement stmt = conn.prepareStatement(paginatedQuery);
                 ResultSet rs           = stmt.executeQuery()) {

                ResultSetMetaData meta = rs.getMetaData();
                int columnCount        = meta.getColumnCount();

                // Extract column names
                List<String> columns = new ArrayList<>();
                for (int i = 1; i <= columnCount; i++) {
                    columns.add(meta.getColumnName(i));
                }

                // Extract rows
                List<List<String>> rows = new ArrayList<>();
                while (rs.next()) {
                    List<String> row = new ArrayList<>();
                    for (int i = 1; i <= columnCount; i++) {
                        String value = rs.getString(i);
                        row.add(value != null ? value : "NULL");
                    }
                    rows.add(row);
                }

                // Build and return response
                ExecutionResponse response = new ExecutionResponse();
                response.setColumns(columns);
                response.setRows(rows);
                response.setPage(page);
                response.setPageSize(pageSize);
                response.setTotalRows(totalRows);
                response.setTotalPages(totalPages);

                return response;
            }

        } catch (InvalidQueryException e) {
            throw e;
        } catch (Exception e) {
            auditLogService.logFailure(queryText, config.getDbType(), e.getMessage());
            throw new RuntimeException("Temp query execution failed: " + e.getMessage());
        }
    }

    // ── Helper: Get total row count for pagination calculation ──
    private int getTotalRowCount(Connection conn, String queryText) throws SQLException {
        String countQuery = "SELECT COUNT(*) FROM (" + queryText + ") AS count_result";
        try (PreparedStatement stmt = conn.prepareStatement(countQuery);
             ResultSet rs           = stmt.executeQuery()) {
            return rs.next() ? rs.getInt(1) : 0;
        }
    }

    // ── Helper: Wrap query with correct pagination syntax per DB type ──
    private String buildPaginatedQuery(String queryText, String dbType,
                                       int page, int pageSize) {
        int offset = page * pageSize;

        return switch (dbType.toUpperCase()) {

            // MSSQL uses OFFSET / FETCH NEXT
            case "MSSQL" ->
                    "SELECT * FROM (" + queryText + ") AS paged_result " +
                            "ORDER BY (SELECT NULL) " +
                            "OFFSET " + offset + " ROWS " +
                            "FETCH NEXT " + pageSize + " ROWS ONLY";

            // MySQL and PostgreSQL use LIMIT / OFFSET
            case "MYSQL", "POSTGRESQL" ->
                    "SELECT * FROM (" + queryText + ") AS paged_result " +
                            "LIMIT " + pageSize + " OFFSET " + offset;

            default -> throw new InvalidQueryException(
                    "Unsupported DB type: '" + dbType +
                            "'. Supported types are: MSSQL, MYSQL, POSTGRESQL.");
        };
    }
}