package com.DSS.project.Service;

import com.DSS.project.DTO.DBConfigRequest;
import com.DSS.project.Entity.DBConfig;
import com.DSS.project.Exception.InvalidQueryException;
import com.DSS.project.Exception.ResourceNotFoundException;
import com.DSS.project.Repository.DBConfigRepository;
import com.DSS.project.Utility.AES;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.sql.Connection;
import java.sql.DriverManager;
import java.util.List;

@Service
@RequiredArgsConstructor
// To save configurations, test the connections, build JDBC URLs, and decrypt passwords
public class DBConfigService {

    private final DBConfigRepository dbConfigRepository;
    private final AES aesUtil;

    // To save new database configuration
    public DBConfig saveConfig(DBConfigRequest request) {

        if (request.getHost() == null || request.getHost().isBlank()) {
            throw new InvalidQueryException("Host cannot be empty.");
        }
        if (request.getDatabaseName() == null || request.getDatabaseName().isBlank()) {
            throw new InvalidQueryException("Database name cannot be empty.");
        }
        if (request.getUsername() == null || request.getUsername().isBlank()) {
            throw new InvalidQueryException("Username cannot be empty.");
        }
        if (request.getPassword() == null || request.getPassword().isBlank()) {
            throw new InvalidQueryException("Password cannot be empty.");
        }
        if (request.getPort() == null || request.getPort() <= 0) {
            throw new InvalidQueryException("Port must be positive integer.");
        }

        // To encrypt password before saving
        String encryptedPassword = aesUtil.encrypt(request.getPassword());

        DBConfig config = new DBConfig();
        config.setDbName(request.getDbName());
        config.setDbType(request.getDbType().toUpperCase());
        config.setHost(request.getHost());
        config.setPort(request.getPort());
        config.setDatabaseName(request.getDatabaseName());
        config.setUsername(request.getUsername());
        config.setPassword(encryptedPassword);

        return dbConfigRepository.save(config);
    }

    // To test a connection before saving
    public boolean testConnection(DBConfigRequest request) {
        try {
            String url = buildUrl(
                    request.getDbType().toUpperCase(),
                    request.getHost(),
                    request.getPort(),
                    request.getDatabaseName()
            );
            Connection conn = DriverManager.getConnection(
                    url, request.getUsername(), request.getPassword()
            );
            conn.close();
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    // To fetch all saved configs
    public List<DBConfig> getAllConfigs() {
        return dbConfigRepository.findAll();
    }

    // Fetch all distinct db_types
    public List<String> getAllDbTypes() {
        return dbConfigRepository.findAllDistinctDbTypes();
    }

    // Fetch one config by db_type
    public DBConfig getConfigByDbType(String dbType) {
        return dbConfigRepository.findByDbType(dbType.toUpperCase())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No configuration found for DB type: " + dbType));
    }

    // Fetch one config by ID — used during execution
    public DBConfig getConfigById(Integer configId) {
        if (configId == null || configId <= 0) {
            throw new InvalidQueryException(
                    "Invalid config ID. Must be a positive integer.");
        }
        return dbConfigRepository.findById(configId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No configuration found with ID: " + configId));
    }

    // Fetch all configs for a given db_type — for Step 2 dropdown
    public List<DBConfig> getConfigsByDbType(String dbType) {
        if (dbType == null || dbType.isBlank()) {
            throw new InvalidQueryException("DB type cannot be empty.");
        }
        List<DBConfig> configs = dbConfigRepository.findAllByDbType(dbType.toUpperCase());
        if (configs.isEmpty()) {
            throw new ResourceNotFoundException(
                    "No configurations found for DB type: " + dbType);
        }
        return configs;
    }

    // Builds JDBC URL based on the type of database
    public String buildUrl(String dbType, String host, Integer port, String databaseName) {
        return switch (dbType.toUpperCase()) {
            case "MSSQL"      -> "jdbc:sqlserver://" + host + ":" + port
                    + ";databaseName=" + databaseName + ";encrypt=false";
            case "MYSQL"      -> "jdbc:mysql://" + host + ":" + port + "/" + databaseName;
            case "POSTGRESQL" -> "jdbc:postgresql://" + host + ":" + port + "/" + databaseName;
            default -> throw new InvalidQueryException(
                    "Unsupported DB type: " + dbType);
        };
    }

    public void deleteConfig(Integer id) {
        if(id < 1) {
            throw new ResourceNotFoundException("Invalid ID format '" + id + "'. ID must be a positive integer.");
        }
        if (!dbConfigRepository.existsById(id)) {
            throw new RuntimeException("Configuration not found with id: " + id);
        }
        dbConfigRepository.deleteById(id);
    }


}
