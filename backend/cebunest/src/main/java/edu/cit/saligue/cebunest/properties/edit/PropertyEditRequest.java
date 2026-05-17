package edu.cit.saligue.cebunest.properties.edit;

import edu.cit.saligue.cebunest.properties.shared.Property;
import edu.cit.saligue.cebunest.users.shared.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "property_edit_requests")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PropertyEditRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ── Linked property ──────────────────────────────────────────────────
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "property_id", nullable = false)
    private Property property;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "submitted_by", nullable = false)
    private User submittedBy;

    // ── Status ───────────────────────────────────────────────────────────
    public enum EditStatus { PENDING, APPROVED, REJECTED }

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private EditStatus editStatus = EditStatus.PENDING;

    // ── Snapshot of the PREVIOUS (live) values ───────────────────────────
    @Column(nullable = false)
    private String previousTitle;

    @Column(columnDefinition = "TEXT")
    private String previousDescription;

    @Column(nullable = false)
    private Double previousPrice;

    @Column(nullable = false)
    private String previousLocation;

    private Long previousTypeId;
    private String previousTypeName;

    private Integer previousBeds;
    private Integer previousBaths;
    private Integer previousSqm;

    // The status the property had BEFORE the owner submitted this edit
    @Column(nullable = false)
    private String previousPropertyStatus;

    // ── Snapshot of the PROPOSED (new) values ────────────────────────────
    @Column(nullable = false)
    private String proposedTitle;

    @Column(columnDefinition = "TEXT")
    private String proposedDescription;

    @Column(nullable = false)
    private Double proposedPrice;

    @Column(nullable = false)
    private String proposedLocation;

    private Long proposedTypeId;
    private String proposedTypeName;

    private Integer proposedBeds;
    private Integer proposedBaths;
    private Integer proposedSqm;

    // ── Image tracking ───────────────────────────────────────────────────
    // Comma-separated IDs of PropertyImage rows the owner wants to REMOVE
    // e.g. "1,2,5" — applied on approval, discarded on rejection
    @Column(columnDefinition = "TEXT")
    private String removedImageIds;

    // Comma-separated IDs of PropertyImage rows that were uploaded as isPending=true
    // alongside this edit request — activated on approval, deleted on rejection
    @Column(columnDefinition = "TEXT")
    private String pendingImageIds;

    // ── Admin decision ───────────────────────────────────────────────────
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by")
    private User reviewedBy;

    @Column(columnDefinition = "TEXT")
    private String rejectionReason;

    private LocalDateTime reviewedAt;

    // ── Timestamps ───────────────────────────────────────────────────────
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}