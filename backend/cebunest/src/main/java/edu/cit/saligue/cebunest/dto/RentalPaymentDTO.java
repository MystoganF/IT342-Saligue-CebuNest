package edu.cit.saligue.cebunest.dto;

import edu.cit.saligue.cebunest.entity.RentalPayment;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RentalPaymentDTO {

    private Long    id;
    private Long    rentalRequestId;
    private Integer installmentNumber;
    private Integer totalInstallments;   // lease duration months — for "Month X of Y"
    private Double  amount;
    private String  dueDate;
    private String  paidAt;
    private String  status;
    private String  checkoutUrl;
    private String  paymongoPaymentId;
    private String  createdAt;

    // ── Tenant info ───────────────────────────────────────────────────────
    private Long   tenantId;
    private String tenantName;
    private String tenantEmail;

    // ── Property info ─────────────────────────────────────────────────────
    private Long   propertyId;
    private String propertyTitle;
    private String propertyLocation;

    // ── Standard mapping (no enrichment) — kept for existing call sites ───
    public static RentalPaymentDTO from(RentalPayment p) {
        return RentalPaymentDTO.builder()
                .id(p.getId())
                .rentalRequestId(p.getRentalRequest().getId())
                .installmentNumber(p.getInstallmentNumber())
                .totalInstallments(p.getRentalRequest().getLeaseDurationMonths())
                .amount(p.getAmount())
                .dueDate(p.getDueDate() != null ? p.getDueDate().toString() : null)
                .paidAt(p.getPaidAt() != null ? p.getPaidAt().toString() : null)
                .status(p.getStatus().name())
                .checkoutUrl(p.getCheckoutUrl())
                .paymongoPaymentId(p.getPaymongoPaymentId())
                .createdAt(p.getCreatedAt() != null
                        ? p.getCreatedAt().format(java.time.format.DateTimeFormatter.ISO_DATE_TIME)
                        : null)
                // Tenant
                .tenantId(p.getRentalRequest().getTenant().getId())
                .tenantName(p.getRentalRequest().getTenant().getName())
                .tenantEmail(p.getRentalRequest().getTenant().getEmail())
                // Property
                .propertyId(p.getRentalRequest().getProperty().getId())
                .propertyTitle(p.getRentalRequest().getProperty().getTitle())
                .propertyLocation(p.getRentalRequest().getProperty().getLocation())
                .build();
    }
}