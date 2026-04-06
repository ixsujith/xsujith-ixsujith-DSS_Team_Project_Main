package com.DSS.project.Controller;

import com.DSS.project.DTO.ExecutionRequest;
import com.DSS.project.DTO.ExecutionResponse;
import com.DSS.project.DTO.TempExecutionRequest;
import com.DSS.project.Service.QueryExecutionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("api/execute")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class QueryExecutionController {

    private final QueryExecutionService queryExecutionService;

    // Execute a saved query against the client DB
    // POST /api/execute
    @PostMapping
    public ResponseEntity<ExecutionResponse> executeQuery(
            @RequestBody ExecutionRequest request) {
        ExecutionResponse response = queryExecutionService.execute(request);
        return ResponseEntity.ok(response);
    }

    // Execute a temporary query from the scratchpad — not saved, not validated via JSQLParser
    // POST /api/execute/temp
    @PostMapping("/temp")
    public ResponseEntity<ExecutionResponse> executeTempQuery(
            @RequestBody TempExecutionRequest request) {
        ExecutionResponse response = queryExecutionService.executeTempQuery(request);
        return ResponseEntity.ok(response);
    }
}
