package edu.cit.saligue.cebunest.reviews;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PropertyReviewRepository extends JpaRepository<PropertyReview, Long> {

    List<PropertyReview> findByPropertyIdOrderByCreatedAtDesc(Long propertyId);
    List<PropertyReview> findByPropertyIdIn(List<Long> propertyIds);
    boolean existsByRentalRequestId(Long rentalRequestId);
}