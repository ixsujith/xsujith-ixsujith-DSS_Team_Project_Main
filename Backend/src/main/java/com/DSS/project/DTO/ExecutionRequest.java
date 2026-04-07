package com.DSS.project.DTO;

import lombok.Data;

// For query execution
@Data
public class ExecutionRequest {

    private Integer queryId;
    private Integer configId;
    private Integer page;
    private Integer pageSize;
}
