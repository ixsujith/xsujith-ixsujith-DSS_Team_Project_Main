package com.DSS.project.Controller;

import com.DSS.project.Service.SchemaService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("api/schema")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class SchemaController {

    private final SchemaService schemaService;

    // Fetch all tables from a client DB
    // GET /api/schema/tables?configId=1
    @GetMapping("/tables")
    public ResponseEntity<List<String>> getTables(
            @RequestParam Integer configId) {
        return ResponseEntity.ok(schemaService.getTables(configId));
    }

    // Fetch all columns for a given table
    // GET /api/schema/columns?configId=1&table=employees
    @GetMapping("/columns")
    public ResponseEntity<List<String>> getColumns(
            @RequestParam Integer configId,
            @RequestParam String table) {
        return ResponseEntity.ok(schemaService.getColumns(configId, table));
    }
}
