package com.DSS.project.Service;

import com.DSS.project.Entity.DBConfig;
import com.DSS.project.Exception.InvalidQueryException;
import com.DSS.project.Exception.ResourceNotFoundException;
import com.DSS.project.Utility.AES;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SchemaService {

    private final DBConfigService dbConfigService;
    private final AES aesUtil;

    // ── Fetch all table names from the client DB ──
    public List<String> getTables(Integer configId) {

        if (configId == null || configId <= 0) {
            throw new InvalidQueryException(
                    "Invalid config ID. Must be a positive integer.");
        }

        DBConfig config          = dbConfigService.getConfigById(configId);
        String decryptedPassword = aesUtil.decrypt(config.getPassword());
        String url               = dbConfigService.buildUrl(
                config.getDbType(), config.getHost(),
                config.getPort(),   config.getDatabaseName()
        );

        List<String> tables = new ArrayList<>();

        try (Connection conn = DriverManager.getConnection(
                url, config.getUsername(), decryptedPassword)) {

            DatabaseMetaData meta = conn.getMetaData();

            // TABLE_TYPE = "TABLE" excludes views, system tables, etc.
            try (ResultSet rs = meta.getTables(
                    null, null, "%", new String[]{"TABLE"})) {
                while (rs.next()) {
                    tables.add(rs.getString("TABLE_NAME"));
                }
            }

        } catch (SQLException e) {
            throw new RuntimeException(
                    "Failed to fetch tables: " + e.getMessage());
        }

        if (tables.isEmpty()) {
            throw new ResourceNotFoundException(
                    "No tables found in the connected database.");
        }

        return tables;
    }

    // ── Fetch all column names for a given table ──
    public List<String> getColumns(Integer configId, String tableName) {

        if (configId == null || configId <= 0) {
            throw new InvalidQueryException(
                    "Invalid config ID. Must be a positive integer.");
        }

        if (tableName == null || tableName.isBlank()) {
            throw new InvalidQueryException("Table name cannot be empty.");
        }

        DBConfig config          = dbConfigService.getConfigById(configId);
        String decryptedPassword = aesUtil.decrypt(config.getPassword());
        String url               = dbConfigService.buildUrl(
                config.getDbType(), config.getHost(),
                config.getPort(),   config.getDatabaseName()
        );

        List<String> columns = new ArrayList<>();

        try (Connection conn = DriverManager.getConnection(
                url, config.getUsername(), decryptedPassword)) {

            DatabaseMetaData meta = conn.getMetaData();

            // Fetch columns for the specified table
            try (ResultSet rs = meta.getColumns(
                    null, null, tableName, "%")) {
                while (rs.next()) {
                    columns.add(rs.getString("COLUMN_NAME"));
                }
            }

        } catch (SQLException e) {
            throw new RuntimeException(
                    "Failed to fetch columns: " + e.getMessage());
        }

        if (columns.isEmpty()) {
            throw new ResourceNotFoundException(
                    "No columns found for table: " + tableName);
        }

        return columns;
    }
}
