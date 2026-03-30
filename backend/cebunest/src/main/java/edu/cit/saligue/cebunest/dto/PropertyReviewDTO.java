package edu.cit.saligue.cebunest.dto;

import edu.cit.saligue.cebunest.entity.PropertyReview;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.format.DateTimeFormatter;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PropertyReviewDTO {

    private Long   id;
    private Long   propertyId;
    private Long   tenantId;
    private String tenantName;
    private String tenantAvatarUrl;
    private Long   rentalRequestId;
    private Integer rating;
    private String  comment;
    private String  createdAt;

    public static PropertyReviewDTO from(PropertyReview r) {
        return PropertyReviewDTO.builder()
                .id(r.getId())
                .propertyId(r.getProperty().getId())
                .tenantId(r.getTenant().getId())
                .tenantName(r.getTenant().getName())
                .tenantAvatarUrl(r.getTenant().getAvatarUrl())
                .rentalRequestId(r.getRentalRequest().getId())
                .rating(r.getRating())
                .comment(r.getComment())
                .createdAt(r.getCreatedAt() != null
                        ? r.getCreatedAt().format(DateTimeFormatter.ISO_DATE_TIME)
                        : null)
                .build();
    }
}