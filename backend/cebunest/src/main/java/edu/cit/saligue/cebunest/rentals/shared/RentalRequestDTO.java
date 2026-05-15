package edu.cit.saligue.cebunest.rentals.shared;

import edu.cit.saligue.cebunest.payments.shared.RentalPayment;
import edu.cit.saligue.cebunest.payments.shared.RentalPaymentDTO;
import lombok.*;

import java.time.format.DateTimeFormatter;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RentalRequestDTO {

    private Long    id;
    private Long    propertyId;
    private String  propertyTitle;
    private String  propertyLocation;
    private Double  propertyPrice;
    private String  propertyImage;

    private Long    ownerId;
    private String  ownerName;
    private String  ownerEmail;
    private String  ownerFacebookUrl;
    private String  ownerInstagramUrl;
    private String  ownerTwitterUrl;

    private Long    tenantId;
    private String  tenantName;
    private String  tenantEmail;
    private String  startDate;
    private Integer leaseDurationMonths;
    private String  status;
    private String  paymentPlan;   // "MONTHLY" | "FULL" | null (not yet chosen)
    private String  createdAt;
    private String  tenantFacebookUrl;
    private String  tenantInstagramUrl;
    private String  tenantTwitterUrl;

    // ── ADDED: Flag to tell frontend if this lease has debt ──
    private boolean hasOverdue;

    // Payments only populated when fetching detail
    private List<RentalPaymentDTO> payments;

    public static RentalRequestDTO from(RentalRequest r) {
        String img = (r.getProperty().getImages() != null && !r.getProperty().getImages().isEmpty())
                ? r.getProperty().getImages().get(0).getImageUrl()
                : null;

        // 1. Calculate Overdue Status
        boolean isOverdue = false;
        if (r.getPayments() != null) {
            isOverdue = r.getPayments().stream()
                    .anyMatch(p -> p.getStatus() == RentalPayment.PaymentStatus.OVERDUE);
        }

        // 2. Build the DTO
        return RentalRequestDTO.builder()
                .id(r.getId())
                .propertyId(r.getProperty().getId())
                .propertyTitle(r.getProperty().getTitle())
                .propertyLocation(r.getProperty().getLocation())
                .propertyPrice(r.getProperty().getPrice())
                .propertyImage(img)

                .ownerId(r.getProperty().getOwner().getId())
                .ownerName(r.getProperty().getOwner().getName())
                .ownerEmail(r.getProperty().getOwner().getEmail())
                .ownerFacebookUrl(r.getProperty().getOwner().getFacebookUrl())
                .ownerInstagramUrl(r.getProperty().getOwner().getInstagramUrl())
                .ownerTwitterUrl(r.getProperty().getOwner().getTwitterUrl())

                .tenantId(r.getTenant().getId())
                .tenantName(r.getTenant().getName())
                .tenantEmail(r.getTenant().getEmail())
                .tenantFacebookUrl(r.getTenant().getFacebookUrl())
                .tenantInstagramUrl(r.getTenant().getInstagramUrl())
                .tenantTwitterUrl(r.getTenant().getTwitterUrl())

                .startDate(r.getStartDate() != null ? r.getStartDate().toString() : null)
                .leaseDurationMonths(r.getLeaseDurationMonths())
                .status(r.getStatus().name())
                .paymentPlan(r.getPaymentPlan())
                .createdAt(r.getCreatedAt() != null
                        ? r.getCreatedAt().format(DateTimeFormatter.ISO_DATE_TIME)
                        : null)

                // ── ADDED: Map the overdue boolean ──
                .hasOverdue(isOverdue)
                .build();
    }
}