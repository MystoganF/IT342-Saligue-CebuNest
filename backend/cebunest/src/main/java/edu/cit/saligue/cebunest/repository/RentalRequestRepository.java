package edu.cit.saligue.cebunest.repository;

import edu.cit.saligue.cebunest.entity.RentalRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RentalRequestRepository extends JpaRepository<RentalRequest, Long> {

    // Tenant — own requests
    List<RentalRequest> findByTenantIdOrderByCreatedAtDesc(Long tenantId);

    // Owner — requests for a specific property
    List<RentalRequest> findByPropertyIdOrderByCreatedAtDesc(Long propertyId);

    // Duplicate-request guard
    boolean existsByTenantIdAndPropertyIdAndStatusIn(
            Long tenantId, Long propertyId, List<RentalRequest.RentalStatus> statuses);
}