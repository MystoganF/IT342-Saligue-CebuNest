package edu.cit.saligue.cebunest.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "notifications")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // e.g. REQUEST_APPROVED, REQUEST_REJECTED, REQUEST_CONFIRMED,
    //      LEASE_TERMINATED, LEASE_EXTENDED, PAYMENT_DUE
    @Column(nullable = false)
    private String type;

    @Column(nullable = false, length = 512)
    private String message;

    // Which rental request this notification links to (nullable for generic ones)
    @Column
    private Long rentalRequestId;

    @Builder.Default
    @Column(nullable = false)
    private boolean read = false;

    @Builder.Default
    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "property_id")
    private Long propertyId;
}