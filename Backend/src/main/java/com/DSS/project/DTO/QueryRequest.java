package com.DSS.project.DTO;

import lombok.Data;

// For saving new query
@Data
public class QueryRequest {

    private String name;
    private String description;
    private String queryText;
    private String dbType;
}
