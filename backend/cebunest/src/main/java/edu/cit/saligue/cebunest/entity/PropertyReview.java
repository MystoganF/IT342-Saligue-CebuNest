package edu.cit.saligue.cebunest.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "property_reviews",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_review_per_rental",
                columnNames = {"rental_request_id"}
        ))
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PropertyReview {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "property_id", nullable = false)
    private Property property;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id", nullable = false)
    private User tenant;

    // One review per rental — enforced by the unique constraint above
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rental_request_id", nullable = false)
    private RentalRequest rentalRequest;

    @Column(nullable = false)
    private Integer rating; // 1–5

    @Column(columnDefinition = "TEXT")
    private String comment;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}