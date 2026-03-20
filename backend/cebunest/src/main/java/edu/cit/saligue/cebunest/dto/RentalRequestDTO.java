package edu.cit.saligue.cebunest.dto;

import edu.cit.saligue.cebunest.entity.RentalRequest;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RentalRequestDTO {

    private Long id;
    private Long propertyId;
    private String propertyTitle;
    private String propertyLocation;
    private Long tenantId;
    private String tenantName;
    private String tenantEmail;
    private LocalDate startDate;
    private Integer leaseDurationMonths;
    private String status;
    private LocalDateTime createdAt;

    public static RentalRequestDTO from(RentalRequest r) {
        return RentalRequestDTO.builder()
                .id(r.getId())
                .propertyId(r.getProperty().getId())
                .propertyTitle(r.getProperty().getTitle())
                .propertyLocation(r.getProperty().getLocation())
                .tenantId(r.getTenant().getId())
                .tenantName(r.getTenant().getName())
                .tenantEmail(r.getTenant().getEmail())
                .startDate(r.getStartDate())
                .leaseDurationMonths(r.getLeaseDurationMonths())
                .status(r.getStatus().name())
                .createdAt(r.getCreatedAt())
                .build();
    }
}