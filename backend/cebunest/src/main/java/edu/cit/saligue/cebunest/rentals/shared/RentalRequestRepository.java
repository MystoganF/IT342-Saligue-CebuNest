package edu.cit.saligue.cebunest.rentals.shared;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface
RentalRequestRepository extends JpaRepository<RentalRequest, Long> {

    List<RentalRequest> findByTenantIdOrderByCreatedAtDesc(Long tenantId);
    List<RentalRequest> findByPropertyIdOrderByCreatedAtDesc(Long propertyId);

    boolean existsByTenantIdAndPropertyIdAndStatusIn(
            Long tenantId, Long propertyId, List<RentalRequest.RentalStatus> statuses);

    // Used to find the single active (CONFIRMED) tenant
    Optional<RentalRequest> findByPropertyIdAndStatus(
            Long propertyId, RentalRequest.RentalStatus status);

    // ── NEW: Used to find a list of requests (e.g., all PENDING requests) ──
    List<RentalRequest> findAllByPropertyIdAndStatus(
            Long propertyId, RentalRequest.RentalStatus status);

    Optional<RentalRequest> findFirstByTenantIdAndPropertyIdOrderByCreatedAtDesc(
            Long tenantId, Long propertyId);

    List<RentalRequest> findByPropertyIdInOrderByCreatedAtDesc(List<Long> propertyIds);
    List<RentalRequest> findByStatus(RentalRequest.RentalStatus status);
}