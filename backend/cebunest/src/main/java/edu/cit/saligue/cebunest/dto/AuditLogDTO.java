package edu.cit.saligue.cebunest.dto;

import edu.cit.saligue.cebunest.entity.AuditLog;
import lombok.Builder;
import lombok.Data;

import java.time.format.DateTimeFormatter;

@Data
@Builder
public class AuditLogDTO {
    private Long   id;
    private Long   adminId;
    private String adminName;
    private String action;
    private String targetType;
    private Long   targetId;
    private String targetTitle;
    private String reason;
    private String ownerName;
    private String ownerEmail;
    private String createdAt;

    public static AuditLogDTO from(AuditLog a) {
        return AuditLogDTO.builder()
                .id(a.getId())
                .adminId(a.getAdmin().getId())
                .adminName(a.getAdmin().getName())
                .action(a.getAction())
                .targetType(a.getTargetType())
                .targetId(a.getTargetId())
                .targetTitle(a.getTargetTitle())
                .reason(a.getReason())
                .ownerName(a.getOwnerName())
                .ownerEmail(a.getOwnerEmail())
                .createdAt(a.getCreatedAt() != null
                        ? a.getCreatedAt().format(DateTimeFormatter.ISO_DATE_TIME) : null)
                .build();
    }
}