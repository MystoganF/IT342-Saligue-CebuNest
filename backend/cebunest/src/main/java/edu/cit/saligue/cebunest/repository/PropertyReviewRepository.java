package edu.cit.saligue.cebunest.repository;

import edu.cit.saligue.cebunest.entity.PropertyReview;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PropertyReviewRepository extends JpaRepository<PropertyReview, Long> {

    List<PropertyReview> findByPropertyIdOrderByCreatedAtDesc(Long propertyId);

    boolean existsByRentalRequestId(Long rentalRequestId);
}