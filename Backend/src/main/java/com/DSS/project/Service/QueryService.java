package com.DSS.project.Service;

import com.DSS.project.DTO.QueryRequest;
import com.DSS.project.Entity.SavedQuery;
import com.DSS.project.Exception.InvalidQueryException;
import com.DSS.project.Exception.ResourceNotFoundException;
import com.DSS.project.Repository.QueryRepository;
import lombok.RequiredArgsConstructor;
import net.sf.jsqlparser.parser.CCJSqlParserUtil;
import org.springframework.stereotype.Service;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.util.List;

@Service
@RequiredArgsConstructor
// To validate syntax using JSQLParser, enforce DQL, check name uniqueness, and save queries
public class QueryService {

    private final QueryRepository queryRepository;
    private final AuditLogService auditLogService;

    public SavedQuery saveQuery(QueryRequest request) {

        // Pre-stage — Strip SQL comments before any validation
        String sanitized = request.getQueryText()
                .replaceAll("--[^\n]*", "")          // removes single-line comments
                .replaceAll("/\\*.*?\\*/", "")        // removes multi-line comments
                .trim();

        // ── Stage 0 — Null and empty field validation ──
        if (request.getName() == null || request.getName().isBlank()) {
            throw new InvalidQueryException("Query name cannot be empty.");
        }
        if (request.getQueryText() == null || request.getQueryText().isBlank()) {
            throw new InvalidQueryException("Query text cannot be empty.");
        }
        if (request.getDbType() == null || request.getDbType().isBlank()) {
            throw new InvalidQueryException("DB type cannot be empty.");
        }

        // Stage 1 — For validation syntax using JSQLParser
        try {
            CCJSqlParserUtil.parse(request.getQueryText());
        } catch (Exception e) {
            auditLogService.logFailure(
                    request.getQueryText(),
                    request.getDbType(),
                    "Syntax error: " + e.getMessage()
            );
            throw new InvalidQueryException("Invalid SQL syntax: " + e.getMessage());
        }

        // Stage 2.1 — Block multiple statements (semicolon check)
        String trimmed = request.getQueryText().trim();
        // Remove trailing semicolon first, then check if one still exists
        String withoutTrailing = trimmed.endsWith(";")
                ? trimmed.substring(0, trimmed.length() - 1).trim()
                : trimmed;

        if (withoutTrailing.contains(";")) {
            auditLogService.logFailure(
                    request.getQueryText(),
                    request.getDbType(),
                    "Rejected: Multiple statements are not allowed"
            );
            throw new InvalidQueryException(
                    "Multiple statements are not allowed. Only a single SELECT query is permitted.");
        }

        // Stage 2.2 — Checks if the given query is a DQL (SELECT)
        String normalized = request.getQueryText().trim().toUpperCase();
        if (!normalized.startsWith("SELECT")) {
            auditLogService.logFailure(
                    request.getQueryText(),
                    request.getDbType(),
                    "Rejected: Only SELECT queries are permitted"
            );
            throw new InvalidQueryException("Only SELECT queries are allowed.");
        }

        // Stage 3 — For checking unique names of the queries
        if (queryRepository.existsByName(request.getName())) {
            throw new InvalidQueryException(
                    "A query with the name '" + request.getName() + "' already exists.");
        }

        // Saves the query to database if all the above stages are validated with no errors
        SavedQuery query = new SavedQuery();
        query.setName(request.getName());
        query.setDescription(request.getDescription());
        query.setQueryText(request.getQueryText());
        query.setDbType(request.getDbType().toUpperCase());

        return queryRepository.save(query);
    }

    // Fetch all queries for a given type of database
    public List<SavedQuery> getQueriesByDbType(String dbType) {
        return queryRepository.findByDbType(dbType.toUpperCase());
    }

    // Fetch all queries
    public List<SavedQuery> getAllQueries() {
        return queryRepository.findAll();
    }

    // Fetch query by ID
    public SavedQuery getQueryById(Integer queryId) {
        if(queryId < 1) {
            throw new ResourceNotFoundException("Invalid ID format '" + queryId + "'. ID must be a positive integer.");
        }
        return queryRepository.findById(queryId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Query not found with ID: " + queryId));
    }

    // To delete query
    public void deleteQuery(Integer queryId) {
        if(queryId < 1) {
            throw new ResourceNotFoundException("Invalid ID format '" + queryId + "'. ID must be a positive integer.");
        }
        if (!queryRepository.existsById(queryId)) {
            throw new ResourceNotFoundException("Query not found with ID: " + queryId);
        }
        queryRepository.deleteById(queryId);
    }
}
