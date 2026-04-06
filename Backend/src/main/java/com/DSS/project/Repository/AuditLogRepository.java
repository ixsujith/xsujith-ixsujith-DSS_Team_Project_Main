package com.DSS.project.Repository;

import com.DSS.project.Entity.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Integer> {

    List<AuditLog> findByDbType(String dbType); // To fetch logs based on the type of database

    List<AuditLog> findAllByOrderByTimestampDesc(); // To fetch logs in order
}
