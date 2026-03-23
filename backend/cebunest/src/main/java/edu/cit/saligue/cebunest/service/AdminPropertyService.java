package edu.cit.saligue.cebunest.service;

import edu.cit.saligue.cebunest.dto.PropertyDTO;
import edu.cit.saligue.cebunest.entity.Property;
import edu.cit.saligue.cebunest.entity.User;
import edu.cit.saligue.cebunest.repository.PropertyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminPropertyService {

    private final PropertyRepository propertyRepository;
    private final NotificationService notificationService;

    // ── Fetch all PENDING_REVIEW properties ──────────────────────────────
    @Transactional(readOnly = true)
    public List<PropertyDTO> getPendingProperties() {
        return propertyRepository.findByStatus(Property.PropertyStatus.PENDING_REVIEW)
                .stream()
                .map(PropertyDTO::from)
                .toList();
    }

    // ── Approve or reject a property ─────────────────────────────────────
    @Transactional
    public PropertyDTO updatePropertyStatus(Long propertyId, String status, String reason, User admin) {
        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new IllegalArgumentException("Property not found."));

        if (property.getStatus() != Property.PropertyStatus.PENDING_REVIEW) {
            throw new IllegalArgumentException(
                    "Only properties with PENDING_REVIEW status can be approved or rejected.");
        }

        Property.PropertyStatus newStatus = status.equals("APPROVED")
                ? Property.PropertyStatus.AVAILABLE
                : Property.PropertyStatus.REJECTED;
        property.setStatus(newStatus);
        propertyRepository.save(property);

        // Notify the owner
        String ownerName  = property.getOwner().getName();
        String title      = property.getTitle();

        if (newStatus == Property.PropertyStatus.APPROVED) {
            notificationService.notify(
                    property.getOwner(),
                    "Property Approved",
                    "Congratulations " + ownerName + "! Your property \"" + title + "\" has been approved and is now listed."
            );
        } else {
            notificationService.notify(
                    property.getOwner(),
                    "Property Rejected",
                    "Your property \"" + title + "\" was not approved. Reason: " + reason
            );
        }

        return PropertyDTO.from(property);
    }
}