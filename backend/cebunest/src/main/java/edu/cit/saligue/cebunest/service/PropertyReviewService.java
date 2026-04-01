package edu.cit.saligue.cebunest.service;

import edu.cit.saligue.cebunest.dto.CreateReviewDTO;
import edu.cit.saligue.cebunest.dto.PropertyReviewDTO;
import edu.cit.saligue.cebunest.entity.*;
import edu.cit.saligue.cebunest.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PropertyReviewService {

    private final PropertyReviewRepository reviewRepository;
    private final RentalRequestRepository  rentalRequestRepository;
    private final PropertyRepository       propertyRepository;
    private final NotificationService      notificationService;   // ← ADDED

    // ── Submit a review ──────────────────────────────────────────────────
    @Transactional
    public PropertyReviewDTO createReview(CreateReviewDTO dto, User tenant) {

        if (dto.getRating() == null || dto.getRating() < 1 || dto.getRating() > 5)
            throw new IllegalArgumentException("Rating must be between 1 and 5.");

        RentalRequest rental = rentalRequestRepository.findById(dto.getRentalRequestId())
                .orElseThrow(() -> new IllegalArgumentException("Rental request not found."));

        if (!rental.getTenant().getId().equals(tenant.getId()))
            throw new IllegalArgumentException("You can only review your own rentals.");

        if (rental.getStatus() != RentalRequest.RentalStatus.CONFIRMED
                && rental.getStatus() != RentalRequest.RentalStatus.COMPLETED)
            throw new IllegalArgumentException(
                    "You can only review a property after your rental is confirmed or completed.");

        if (reviewRepository.existsByRentalRequestId(rental.getId()))
            throw new IllegalArgumentException("You have already reviewed this rental.");

        PropertyReview review = PropertyReview.builder()
                .property(rental.getProperty())
                .tenant(tenant)
                .rentalRequest(rental)
                .rating(dto.getRating())
                .comment(dto.getComment() != null ? dto.getComment().trim() : null)
                .build();

        PropertyReview saved = reviewRepository.save(review);

        // ── Notify owner of the new review ────────────────────────────────
        String propTitle  = rental.getProperty().getTitle();
        String tenantName = tenant.getName();
        String stars      = "★".repeat(dto.getRating()) + "☆".repeat(5 - dto.getRating());

        notificationService.send(
                rental.getProperty().getOwner(),
                "NEW_REVIEW",
                tenantName + " left a " + dto.getRating() + "-star review " + stars + " for \"" + propTitle + "\".",
                rental.getId(),
                rental.getProperty().getId()
        );

        return PropertyReviewDTO.from(saved);
    }

    // ── Get all reviews for a property ──────────────────────────────────
    @Transactional(readOnly = true)
    public List<PropertyReviewDTO> getReviewsForProperty(Long propertyId) {
        propertyRepository.findById(propertyId)
                .orElseThrow(() -> new IllegalArgumentException("Property not found."));

        return reviewRepository.findByPropertyIdOrderByCreatedAtDesc(propertyId)
                .stream()
                .map(PropertyReviewDTO::from)
                .toList();
    }
}