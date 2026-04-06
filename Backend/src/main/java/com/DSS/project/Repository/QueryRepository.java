package com.DSS.project.Repository;

import com.DSS.project.Entity.SavedQuery;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface QueryRepository extends JpaRepository<SavedQuery, Integer> {
    List<SavedQuery> findByDbType(String dbType);  // To fetch queries based on the type og database

    boolean existsByName(String name); // For unique query name

    Optional<SavedQuery> findByName(String name); // To fetch query by unique name
}
