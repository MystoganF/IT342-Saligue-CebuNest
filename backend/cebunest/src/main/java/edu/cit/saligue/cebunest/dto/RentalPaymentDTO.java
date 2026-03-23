package edu.cit.saligue.cebunest.dto;

import edu.cit.saligue.cebunest.entity.RentalPayment;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RentalPaymentDTO {

    private Long   id;
    private Long   rentalRequestId;
    private Integer installmentNumber;
    private Double amount;
    private String dueDate;
    private String paidAt;
    private String status;
    private String checkoutUrl;
    private String paymongoPaymentId;
    private String createdAt;

    public static RentalPaymentDTO from(RentalPayment p) {
        return RentalPaymentDTO.builder()
                .id(p.getId())
                .rentalRequestId(p.getRentalRequest().getId())
                .installmentNumber(p.getInstallmentNumber())
                .amount(p.getAmount())
                .dueDate(p.getDueDate() != null ? p.getDueDate().toString() : null)
                .paidAt(p.getPaidAt() != null ? p.getPaidAt().toString() : null)
                .status(p.getStatus().name())
                .checkoutUrl(p.getCheckoutUrl())
                .paymongoPaymentId(p.getPaymongoPaymentId())
                .createdAt(p.getCreatedAt() != null
                        ? p.getCreatedAt().format(java.time.format.DateTimeFormatter.ISO_DATE_TIME)
                        : null)
                .build();
    }
}