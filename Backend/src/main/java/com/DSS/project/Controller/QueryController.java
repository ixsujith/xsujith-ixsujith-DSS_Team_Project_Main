package com.DSS.project.Controller;

import com.DSS.project.DTO.QueryRequest;
import com.DSS.project.Entity.SavedQuery;
import com.DSS.project.Service.QueryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("api/queries")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class QueryController {

    private final QueryService queryService;

    // Save a new validated query
    @PostMapping
    public ResponseEntity<SavedQuery> saveQuery(@RequestBody QueryRequest request) {
        SavedQuery saved = queryService.saveQuery(request);
        return ResponseEntity.ok(saved);
    }

    // Fetch all queries
    @GetMapping
    public ResponseEntity<List<SavedQuery>> getAllQueries() {
        return ResponseEntity.ok(queryService.getAllQueries());
    }

    // Fetch queries filtered by db_type
    // GET /api/queries/by-type?dbType=MSSQL
    @GetMapping("/by-type")
    public ResponseEntity<List<SavedQuery>> getQueriesByDbType(
            @RequestParam String dbType) {
        return ResponseEntity.ok(queryService.getQueriesByDbType(dbType));
    }

    // Fetch a single query by ID
    @GetMapping("/{id}")
    public ResponseEntity<SavedQuery> getQueryById(@PathVariable Integer id) {
        return ResponseEntity.ok(queryService.getQueryById(id));
    }

    // Delete a query by ID
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteQuery(@PathVariable Integer id) {
        queryService.deleteQuery(id);
        return ResponseEntity.noContent().build();
    }
}
