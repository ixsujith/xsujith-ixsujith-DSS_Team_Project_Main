package com.DSS.project.Controller;

import com.DSS.project.Entity.AuditLog;
import com.DSS.project.Service.AuditLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("api/audit-logs")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AuditLogController {

    private final AuditLogService auditLogService;

    // Fetch all audit logs — most recent first
    // GET /api/audit-logs
    @GetMapping
    public ResponseEntity<List<AuditLog>> getAllLogs() {
        return ResponseEntity.ok(auditLogService.getAllLogs());
    }

    // Fetch audit logs filtered by db_type
    // GET /api/audit-logs/by-type?dbType=MSSQL
    @GetMapping("/by-type")
    public ResponseEntity<List<AuditLog>> getLogsByDbType(
            @RequestParam String dbType) {
        return ResponseEntity.ok(auditLogService.getLogsByDbType(dbType));
    }
}
