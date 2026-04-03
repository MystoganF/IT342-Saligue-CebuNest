package edu.cit.saligue.cebunest.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.util.List;
import java.util.ArrayList;

@Entity
@Table(name = "properties")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Property {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private Double price;

    @Column(nullable = false)
    private String location;

    @ManyToOne
    @JoinColumn(name = "type_id", nullable = false)
    private PropertyType type;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private PropertyStatus status;

    // --- NEW: Admin Lockout Fields ---
    @Column(nullable = false)
    @Builder.Default
    private boolean isAdminDisabled = false;

    @Column(columnDefinition = "TEXT")
    private String adminNote;
    // --------------------------------

    private Integer beds;
    private Integer baths;
    private Integer sqm;

    @OneToMany(mappedBy = "property", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<PropertyImage> images = new ArrayList<>();

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    public enum PropertyStatus {
        AVAILABLE, UNAVAILABLE, PENDING_REVIEW, APPROVED, REJECTED
    }
}