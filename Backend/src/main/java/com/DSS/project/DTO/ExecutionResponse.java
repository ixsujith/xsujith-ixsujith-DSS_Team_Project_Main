package com.DSS.project.DTO;

import lombok.Data;

import java.util.List;

// For pagination
@Data
public class ExecutionResponse {

    private List<String> columns;
    private List<List<String>> rows;
    private Integer page;
    private Integer pageSize;
    private Integer totalRows;
    private Integer totalPages;
}
