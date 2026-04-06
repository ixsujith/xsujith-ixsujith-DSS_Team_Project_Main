package com.DSS.project.Controller;

import com.DSS.project.DTO.DBConfigRequest;
import com.DSS.project.Entity.DBConfig;
import com.DSS.project.Service.DBConfigService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("api/db-config")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class DBConfigController {

    private final DBConfigService dbConfigService;

    // Save a new DB configuration
    // POST /api/db-config
    @PostMapping
    public ResponseEntity<DBConfig> saveConfig(@RequestBody DBConfigRequest request) {
        DBConfig saved = dbConfigService.saveConfig(request);
        return ResponseEntity.ok(saved);
    }

    // Test a connection without saving
    // POST /api/db-config/test
    @PostMapping("/test")
    public ResponseEntity<Map<String, Object>> testConnection(
            @RequestBody DBConfigRequest request) {

        boolean success = dbConfigService.testConnection(request);

        if (success) {
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Connection successful"
            ));
        } else {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Connection failed. Please check your details."
            ));
        }
    }

    // Fetch all saved configurations
    // GET /api/db-config
    @GetMapping
    public ResponseEntity<List<DBConfig>> getAllConfigs() {
        return ResponseEntity.ok(dbConfigService.getAllConfigs());
    }

    // Fetch distinct db_types for frontend dropdown
    // GET /api/db-config/types
    @GetMapping("/types")
    public ResponseEntity<List<String>> getAllDbTypes() {
        return ResponseEntity.ok(dbConfigService.getAllDbTypes());
    }

    @GetMapping("/by-type")
    public ResponseEntity<List<DBConfig>> getConfigsByDbType(@RequestParam String dbType) {
        return ResponseEntity.ok(dbConfigService.getConfigsByDbType(dbType));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<String> deleteConfig(@PathVariable Integer id) {
        dbConfigService.deleteConfig(id);
        return ResponseEntity.ok("Configuration deleted successfully");
    }
}
