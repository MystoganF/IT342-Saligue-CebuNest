package edu.cit.saligue.cebunest.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "lease_extension_requests")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LeaseExtensionRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rental_request_id", nullable = false)
    private RentalRequest rentalRequest;

    @Column(nullable = false)
    private Integer requestedMonths;

    @Column(length = 512)
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private ExtensionStatus status = ExtensionStatus.PENDING;

    @Builder.Default
    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public enum ExtensionStatus {
        PENDING,
        APPROVED,
        REJECTED
    }
}