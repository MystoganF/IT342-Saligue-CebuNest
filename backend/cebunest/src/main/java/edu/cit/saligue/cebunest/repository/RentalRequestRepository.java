package edu.cit.saligue.cebunest.repository;

import edu.cit.saligue.cebunest.entity.RentalRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RentalRequestRepository extends JpaRepository<RentalRequest, Long> {

    List<RentalRequest> findByTenantIdOrderByCreatedAtDesc(Long tenantId);
    List<RentalRequest> findByPropertyIdOrderByCreatedAtDesc(Long propertyId);

    boolean existsByTenantIdAndPropertyIdAndStatusIn(
            Long tenantId, Long propertyId, List<RentalRequest.RentalStatus> statuses);

    // NEW: find active (CONFIRMED) tenant for a property
    Optional<RentalRequest> findByPropertyIdAndStatus(
            Long propertyId, RentalRequest.RentalStatus status);

    // NEW: find a specific tenant's latest request for a property
    Optional<RentalRequest> findFirstByTenantIdAndPropertyIdOrderByCreatedAtDesc(
            Long tenantId, Long propertyId);


    List<RentalRequest> findByPropertyIdInOrderByCreatedAtDesc(List<Long> propertyIds);



}