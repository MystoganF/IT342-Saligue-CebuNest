package edu.cit.saligue.cebunest.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

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

    @ManyToOne
    @JoinColumn(name = "property_id", nullable = false)
    private Property property;

    @ManyToOne
    @JoinColumn(name = "tenant_id", nullable = false)
    private User tenant;

    @Column(nullable = false)
    private LocalDate startDate;

    @Column(nullable = false)
    private Integer leaseDurationMonths;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RentalStatus status;

    private LocalDateTime createdAt = LocalDateTime.now();

    public enum RentalStatus {
        PENDING, APPROVED, REJECTED, CONFIRMED
    }
}