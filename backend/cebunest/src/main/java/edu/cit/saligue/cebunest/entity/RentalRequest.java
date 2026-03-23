package edu.cit.saligue.cebunest.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "rental_requests")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RentalRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "property_id", nullable = false)
    private Property property;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id", nullable = false)
    private User tenant;

    @Column(nullable = false)
    private LocalDate startDate;

    @Column(nullable = false)
    private Integer leaseDurationMonths;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RentalStatus status;

    // "MONTHLY" or "FULL" — set when tenant confirms and chooses plan
    private String paymentPlan;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    public enum RentalStatus {
        PENDING,    // submitted by tenant, awaiting owner review
        APPROVED,   // owner approved, tenant must confirm
        REJECTED,   // owner rejected
        CONFIRMED,  // tenant confirmed + chose payment plan → active rental
        COMPLETED   // lease ended
    }
}