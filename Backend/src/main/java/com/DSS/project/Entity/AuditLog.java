package com.DSS.project.Entity;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Table(name = "audit_log")
@Data
public class AuditLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "audit_id")
    private Integer auditId;

    @Column(name = "timestamp")
    private LocalDateTime timestamp;

    @Column(name = "query_text", nullable = false, columnDefinition = "NVARCHAR(MAX)")
    private String queryText;

    @Column(name = "db_type", nullable = false)
    private String dbType;

    @Column(name = "error_message", nullable = false, columnDefinition = "NVARCHAR(MAX)")
    private String errorMessage;

    @PrePersist
    protected void onCreate() {
        this.timestamp = LocalDateTime.now();
    }
}
