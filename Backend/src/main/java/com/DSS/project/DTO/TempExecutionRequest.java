package com.DSS.project.DTO;

import lombok.Data;

@Data
public class TempExecutionRequest {

    private Integer configId;
    private String  queryText;
    private Integer page;
    private Integer pageSize;
}
