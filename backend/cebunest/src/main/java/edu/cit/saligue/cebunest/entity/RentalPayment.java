package edu.cit.saligue.cebunest.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "rental_payments")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RentalPayment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rental_request_id", nullable = false)
    private RentalRequest rentalRequest;

    // Which installment number (1 = first month, 2 = second, etc. 0 = full payment)
    @Column(nullable = false)
    private Integer installmentNumber;

    @Column(nullable = false)
    private Double amount;

    @Column(nullable = false)
    private LocalDate dueDate;

    private LocalDate paidAt;

    // PayMongo payment intent / link ID
    private String paymongoPaymentId;

    // URL to redirect tenant to pay
    private String checkoutUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaymentStatus status;

    @Column(nullable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    public enum PaymentStatus {
        PENDING,   // not yet paid
        PAID,      // confirmed paid
        OVERDUE,   // past due date
        CANCELLED  // request was cancelled
    }
}