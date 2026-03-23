package edu.cit.saligue.cebunest.dto;

import edu.cit.saligue.cebunest.entity.RentalRequest;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
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
    private Long    tenantId;
    private String  tenantName;
    private String  tenantEmail;
    private String  startDate;
    private Integer leaseDurationMonths;
    private String  status;
    private String  paymentPlan;   // "MONTHLY" | "FULL" | null (not yet chosen)
    private String  createdAt;

    // Payments only populated when fetching detail
    private List<RentalPaymentDTO> payments;

    public static RentalRequestDTO from(RentalRequest r) {
        String img = (r.getProperty().getImages() != null && !r.getProperty().getImages().isEmpty())
                ? r.getProperty().getImages().get(0).getImageUrl()
                : null;

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
                .tenantId(r.getTenant().getId())
                .tenantName(r.getTenant().getName())
                .tenantEmail(r.getTenant().getEmail())
                .startDate(r.getStartDate() != null ? r.getStartDate().toString() : null)
                .leaseDurationMonths(r.getLeaseDurationMonths())
                .status(r.getStatus().name())
                .paymentPlan(r.getPaymentPlan())
                .createdAt(r.getCreatedAt() != null
                        ? r.getCreatedAt().format(java.time.format.DateTimeFormatter.ISO_DATE_TIME)
                        : null)
                .build();
    }
}