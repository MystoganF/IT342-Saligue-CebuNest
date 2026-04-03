package edu.cit.saligue.cebunest.dto;

import edu.cit.saligue.cebunest.entity.AdminBroadcast;
import lombok.*;

import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminBroadcastDTO {

    private Long         id;
    private String       type;
    private String       message;
    private List<String> targetRoles;
    private long         recipientCount;
    private String       sentByName;
    private String       sentAt;

    public static AdminBroadcastDTO from(AdminBroadcast b) {
        return AdminBroadcastDTO.builder()
                .id(b.getId())
                .type(b.getType())
                .message(b.getMessage())
                .targetRoles(Arrays.asList(b.getTargetRoles().split(",")))
                .recipientCount(b.getRecipientCount())
                .sentByName(b.getSentBy() != null ? b.getSentBy().getName() : "Admin")
                .sentAt(b.getSentAt() != null
                        ? b.getSentAt().format(DateTimeFormatter.ISO_DATE_TIME)
                        : null)
                .build();
    }
}