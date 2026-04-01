package edu.cit.saligue.cebunest.repository;

import edu.cit.saligue.cebunest.entity.LeaseExtensionRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LeaseExtensionRequestRepository extends JpaRepository<LeaseExtensionRequest, Long> {

    List<LeaseExtensionRequest> findByRentalRequestIdOrderByCreatedAtDesc(Long rentalRequestId);

    boolean existsByRentalRequestIdAndStatus(Long rentalRequestId, LeaseExtensionRequest.ExtensionStatus status);
}