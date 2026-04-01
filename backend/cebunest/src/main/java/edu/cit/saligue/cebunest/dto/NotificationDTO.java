package edu.cit.saligue.cebunest.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import edu.cit.saligue.cebunest.entity.Notification;
import lombok.*;

import java.time.format.DateTimeFormatter;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationDTO {

    private Long    id;
    private String  type;
    private String  message;
    private Long    rentalRequestId;
    private Long    propertyId;          // ← NEW
    @JsonProperty("read")
    private boolean read;
    private String  createdAt;

    public static NotificationDTO from(Notification n) {
        return NotificationDTO.builder()
                .id(n.getId())
                .type(n.getType())
                .message(n.getMessage())
                .rentalRequestId(n.getRentalRequestId())
                .propertyId(n.getPropertyId())   // ← NEW
                .read(n.isRead())
                .createdAt(n.getCreatedAt() != null
                        ? n.getCreatedAt().format(DateTimeFormatter.ISO_DATE_TIME)
                        : null)
                .build();
    }
}