package edu.cit.saligue.cebunest.repository;

import edu.cit.saligue.cebunest.entity.RentalRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RentalRequestRepository extends JpaRepository<RentalRequest, Long> {
    List<RentalRequest> findByTenantIdOrderByCreatedAtDesc(Long tenantId);
    List<RentalRequest> findByPropertyIdOrderByCreatedAtDesc(Long propertyId);
    boolean existsByTenantIdAndPropertyIdAndStatusIn(
            Long tenantId, Long propertyId, List<RentalRequest.RentalStatus> statuses
    );
}