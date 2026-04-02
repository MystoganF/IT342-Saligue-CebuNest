package edu.cit.saligue.cebunest.repository;

import edu.cit.saligue.cebunest.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    Page<AuditLog> findAllByOrderByCreatedAtDesc(Pageable pageable);

    // Returns the reason from the most recent PROPERTY_REJECTED audit log for a given property
    @Query("SELECT a.reason FROM AuditLog a WHERE a.targetId = :propertyId AND a.action = 'PROPERTY_REJECTED' ORDER BY a.createdAt DESC")
    Optional<String> findLatestRejectionReason(@Param("propertyId") Long propertyId);
}