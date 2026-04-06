package com.DSS.project.Repository;

import com.DSS.project.Entity.DBConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DBConfigRepository extends JpaRepository<DBConfig, Integer> {

    Optional<DBConfig> findByDbType(String dbType); // To fetch configuration

    List<DBConfig> findAllByDbType(String dbType); // To select the connection

    boolean existsByDbType(String dbType); // To check if configuration exists

    @Query("SELECT DISTINCT d.dbType FROM DBConfig d")
    List<String> findAllDistinctDbTypes(); // To fetch types of database

}
