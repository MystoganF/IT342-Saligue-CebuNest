package edu.cit.saligue.cebunest.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Stores every admin broadcast for the history panel.
 * One row per broadcast event (not per recipient).
 */
@Entity
@Table(name = "admin_broadcasts")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminBroadcast {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Who sent it
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sent_by_id", nullable = false)
    private User sentBy;

    @Column(nullable = false)
    private String type;          // e.g. ADMIN_BROADCAST, MAINTENANCE

    @Column(nullable = false, length = 512)
    private String message;

    // Comma-separated: "OWNER,TENANT" or "OWNER" or "TENANT"
    @Column(nullable = false)
    private String targetRoles;

    @Column(nullable = false)
    private long recipientCount;

    @Builder.Default
    @Column(nullable = false)
    private LocalDateTime sentAt = LocalDateTime.now();
}