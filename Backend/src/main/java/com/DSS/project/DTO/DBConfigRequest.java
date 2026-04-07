package com.DSS.project.DTO;

import lombok.Data;

// For new database configuration
@Data
public class DBConfigRequest {

    private String dbName;
    private String dbType;
    private String host;
    private Integer port;
    private String databaseName;
    private String username;
    private String password;
}
