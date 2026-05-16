package edu.cit.saligue.cebunest.properties.edit;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PropertyEditRequestRepository extends JpaRepository<PropertyEditRequest, Long> {

    // All PENDING edit requests (for the admin list page)
    List<PropertyEditRequest> findByEditStatusOrderByCreatedAtDesc(PropertyEditRequest.EditStatus status);

    // Latest pending edit for a given property (at most one should exist at a time)
    Optional<PropertyEditRequest> findTopByPropertyIdAndEditStatusOrderByCreatedAtDesc(
            Long propertyId, PropertyEditRequest.EditStatus status);

    // Whether a property already has a pending edit in flight
    boolean existsByPropertyIdAndEditStatus(Long propertyId, PropertyEditRequest.EditStatus status);

    // All edit requests for a property (for audit history)
    @Query("SELECT e FROM PropertyEditRequest e WHERE e.property.id = :propertyId ORDER BY e.createdAt DESC")
    List<PropertyEditRequest> findByPropertyIdOrderByCreatedAtDesc(@Param("propertyId") Long propertyId);
}