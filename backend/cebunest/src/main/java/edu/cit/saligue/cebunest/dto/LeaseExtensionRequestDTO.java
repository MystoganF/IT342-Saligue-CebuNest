package edu.cit.saligue.cebunest.dto;

import edu.cit.saligue.cebunest.entity.LeaseExtensionRequest;
import lombok.*;

import java.time.format.DateTimeFormatter;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LeaseExtensionRequestDTO {

    private Long   id;
    private Long   rentalRequestId;
    private String propertyTitle;
    private String tenantName;
    private String ownerName;
    private Integer requestedMonths;
    private String reason;
    private String status;
    private String createdAt;

    public static LeaseExtensionRequestDTO from(LeaseExtensionRequest e) {
        return LeaseExtensionRequestDTO.builder()
                .id(e.getId())
                .rentalRequestId(e.getRentalRequest().getId())
                .propertyTitle(e.getRentalRequest().getProperty().getTitle())
                .tenantName(e.getRentalRequest().getTenant().getName())
                .ownerName(e.getRentalRequest().getProperty().getOwner().getName())
                .requestedMonths(e.getRequestedMonths())
                .reason(e.getReason())
                .status(e.getStatus().name())
                .createdAt(e.getCreatedAt() != null
                        ? e.getCreatedAt().format(DateTimeFormatter.ISO_DATE_TIME)
                        : null)
                .build();
    }
}