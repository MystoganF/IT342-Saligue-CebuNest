package edu.cit.saligue.cebunest.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "audit_logs")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "admin_id", nullable = false)
    private User admin;

    @Column(nullable = false)
    private String action; // "PROPERTY_APPROVED", "PROPERTY_REJECTED"

    @Column(nullable = false)
    private String targetType; // "PROPERTY"

    private Long targetId; // propertyId

    private String targetTitle; // property title snapshot

    @Column(columnDefinition = "TEXT")
    private String reason; // rejection reason, null for approvals

    private String ownerName; // snapshot

    private String ownerEmail; // snapshot

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}