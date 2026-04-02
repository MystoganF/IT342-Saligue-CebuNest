package edu.cit.saligue.cebunest.service;

import edu.cit.saligue.cebunest.dto.PropertyDTO;
import edu.cit.saligue.cebunest.entity.*;
import edu.cit.saligue.cebunest.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.LinkedHashMap;

@Service
@RequiredArgsConstructor
public class AdminPropertyService {

    private final PropertyRepository  propertyRepository;
    private final NotificationService notificationService;
    private final AuditLogRepository  auditLogRepository;

    @Transactional(readOnly = true)
    public List<PropertyDTO> getPendingProperties() {
        return propertyRepository.findByStatus(Property.PropertyStatus.PENDING_REVIEW)
                .stream().map(PropertyDTO::from).toList();
    }

    @Transactional
    public PropertyDTO updatePropertyStatus(Long propertyId, String status, String reason, User admin) {
        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new IllegalArgumentException("Property not found."));

        if (property.getStatus() != Property.PropertyStatus.PENDING_REVIEW)
            throw new IllegalArgumentException(
                    "Only properties with PENDING_REVIEW status can be approved or rejected.");

        Property.PropertyStatus newStatus = status.equals("APPROVED")
                ? Property.PropertyStatus.AVAILABLE
                : Property.PropertyStatus.REJECTED;
        property.setStatus(newStatus);
        propertyRepository.save(property);

        String ownerName  = property.getOwner().getName();
        String ownerEmail = property.getOwner().getEmail();
        String title      = property.getTitle();

        // ── Notification ──────────────────────────────────────────────────
        if (newStatus == Property.PropertyStatus.AVAILABLE) {
            notificationService.send(property.getOwner(), "PROPERTY_APPROVED",
                    "Congratulations " + ownerName + "! Your property \"" + title + "\" has been approved and is now listed.", null);
        } else {
            notificationService.send(property.getOwner(), "PROPERTY_REJECTED",
                    "Your property \"" + title + "\" was not approved. Reason: " + reason, null);
        }

        // ── Audit log ─────────────────────────────────────────────────────
        auditLogRepository.save(AuditLog.builder()
                .admin(admin)
                .action(newStatus == Property.PropertyStatus.AVAILABLE ? "PROPERTY_APPROVED" : "PROPERTY_REJECTED")
                .targetType("PROPERTY")
                .targetId(property.getId())
                .targetTitle(title)
                .reason(reason)
                .ownerName(ownerName)
                .ownerEmail(ownerEmail)
                .build());

        return PropertyDTO.from(property);
    }

    // ── Audit history (paginated) ─────────────────────────────────────────
    @Transactional(readOnly = true)
    public Map<String, Object> getAuditHistory(int page, int size) {
        Page<AuditLog> result = auditLogRepository.findAllByOrderByCreatedAtDesc(
                PageRequest.of(page, size));
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("logs",       result.getContent().stream().map(edu.cit.saligue.cebunest.dto.AuditLogDTO::from).toList());
        data.put("totalPages", result.getTotalPages());
        data.put("totalItems", result.getTotalElements());
        data.put("page",       page);
        data.put("size",       size);
        return data;
    }
}