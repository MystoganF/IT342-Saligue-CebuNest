package edu.cit.saligue.cebunest.properties.shared;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "property_images")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PropertyImage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "property_id", nullable = false)
    private Property property;

    @Column(name = "image_url", nullable = false)
    private String imageUrl;

    // When true, this image was uploaded as part of a pending edit request.
    // It is NOT shown publicly until an admin approves the edit request.
    @Builder.Default
    @Column(nullable = false)
    private boolean isPending = false;

    private LocalDateTime createdAt = LocalDateTime.now();
}