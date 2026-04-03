package edu.cit.saligue.cebunest.service;

import edu.cit.saligue.cebunest.dto.AuditLogDTO; // FIXED: Imported the DTO
import edu.cit.saligue.cebunest.dto.PropertyDTO;
import edu.cit.saligue.cebunest.entity.AuditLog;
import edu.cit.saligue.cebunest.entity.Property;
import edu.cit.saligue.cebunest.entity.RentalRequest;
import edu.cit.saligue.cebunest.entity.User;
import edu.cit.saligue.cebunest.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AdminPropertyService {

    private final PropertyRepository propertyRepository;
    private final AuditLogRepository auditLogRepository;
    private final RentalRequestRepository rentalRequestRepository;
    private final PropertyTypeRepository propertyTypeRepository;
    private final PropertyImageRepository propertyImageRepository;
    private final SupabaseStorageService storageService;

    // ── Get pending properties ───────────────────────────────────────────
    @Transactional(readOnly = true)
    public List<PropertyDTO> getPendingProperties() {
        return propertyRepository.findByStatus(Property.PropertyStatus.PENDING_REVIEW)
                .stream().map(PropertyDTO::from).toList();
    }

    // ── Update property status (Approve/Reject) ──────────────────────────
    @Transactional
    public PropertyDTO updatePropertyStatus(Long propertyId, String statusStr, String reason, User admin) {
        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new IllegalArgumentException("Property not found."));

        if (property.getStatus() != Property.PropertyStatus.PENDING_REVIEW) {
            throw new IllegalArgumentException("Can only review pending properties.");
        }

        Property.PropertyStatus newStatus;
        String action;

        if ("APPROVED".equalsIgnoreCase(statusStr)) {
            newStatus = Property.PropertyStatus.AVAILABLE;
            action = "PROPERTY_APPROVED"; // FIXED: Ensure this matches your frontend exact string (was "APPROVED")
            reason = "Approved by admin";
        } else if ("REJECTED".equalsIgnoreCase(statusStr)) {
            newStatus = Property.PropertyStatus.REJECTED;
            action = "PROPERTY_REJECTED"; // FIXED: Ensure this matches your frontend exact string (was "REJECTED")
            if (reason == null || reason.isBlank()) {
                throw new IllegalArgumentException("Reason is required for rejection.");
            }
        } else {
            throw new IllegalArgumentException("Invalid status update.");
        }

        property.setStatus(newStatus);
        Property saved = propertyRepository.save(property);

        // Create audit log
        AuditLog log = AuditLog.builder()
                .admin(admin)
                .targetId(saved.getId())
                .targetTitle(saved.getTitle())
                .targetType("PROPERTY")
                .action(action)
                .reason(reason)
                // FIXED: Actually saving the owner details so they appear in the UI
                .ownerName(saved.getOwner().getName())
                .ownerEmail(saved.getOwner().getEmail())
                .build();
        auditLogRepository.save(log);

        return PropertyDTO.from(saved, "PROPERTY_REJECTED".equals(action) ? reason : null);
    }

    // ── Get Audit History ────────────────────────────────────────────────
    @Transactional(readOnly = true)
    public Map<String, Object> getAuditHistory(int page, int size) {
        Page<AuditLog> auditPage = auditLogRepository.findAll(
                PageRequest.of(page, size, Sort.by("createdAt").descending())
        );

        // FIXED: Replaced the manual HashMap mapping with your AuditLogDTO!
        List<AuditLogDTO> logs = auditPage.getContent().stream()
                .map(AuditLogDTO::from)
                .toList();

        Map<String, Object> res = new HashMap<>();
        res.put("logs", logs);
        res.put("totalElements", auditPage.getTotalElements());
        res.put("totalPages", auditPage.getTotalPages());
        res.put("currentPage", auditPage.getNumber());
        return res;
    }

    @Transactional(readOnly = true)
    public List<PropertyDTO> getAllProperties() {
        return propertyRepository.findAll().stream()
                .map(p -> {
                    PropertyDTO dto = PropertyDTO.from(p);

                    // Fetch active tenant
                    java.util.Optional<RentalRequest> activeReq = rentalRequestRepository
                            .findByPropertyIdAndStatus(p.getId(), RentalRequest.RentalStatus.CONFIRMED);

                    if (activeReq.isPresent()) {
                        dto.setHasActiveTenant(true);
                        RentalRequest req = activeReq.get();
                        dto.setActiveTenant(PropertyDTO.ActiveTenantDTO.builder()
                                .tenantId(req.getTenant().getId())
                                .tenantName(req.getTenant().getName())
                                .tenantEmail(req.getTenant().getEmail())
                                .startDate(req.getStartDate() != null ? req.getStartDate().toString() : null)
                                .leaseDurationMonths(req.getLeaseDurationMonths())
                                .build());
                    } else {
                        dto.setHasActiveTenant(false);
                    }
                    return dto;
                })
                .toList();
    }

    // ── Admin Edit Property (Bypasses Owner Check) ───────────────────────
    @Transactional
    public PropertyDTO updatePropertyAsAdmin(Long propertyId, edu.cit.saligue.cebunest.dto.UpdatePropertyDTO dto, User admin) {
        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new IllegalArgumentException("Property not found."));

        edu.cit.saligue.cebunest.entity.PropertyType type = propertyTypeRepository.findById(dto.getTypeId())
                .orElseThrow(() -> new IllegalArgumentException("Invalid property type."));

        boolean hasActiveTenant = rentalRequestRepository.findByPropertyIdAndStatus(
                propertyId, RentalRequest.RentalStatus.CONFIRMED).isPresent();

        // Update fields
        property.setTitle(dto.getTitle().trim());
        property.setDescription(dto.getDescription() != null ? dto.getDescription().trim() : "");
        property.setPrice(dto.getPrice());
        property.setLocation(dto.getLocation().trim());
        property.setType(type);
        property.setBeds(dto.getBeds());
        property.setBaths(dto.getBaths());
        property.setSqm(dto.getSqm());

        // Visibility logic
        if (hasActiveTenant) {
            property.setStatus(Property.PropertyStatus.UNAVAILABLE);
        } else if (dto.getStatus() != null) {
            Property.PropertyStatus current = property.getStatus();
            if (current == Property.PropertyStatus.AVAILABLE || current == Property.PropertyStatus.UNAVAILABLE) {
                if (dto.getStatus().equals("AVAILABLE"))
                    property.setStatus(Property.PropertyStatus.AVAILABLE);
                else if (dto.getStatus().equals("UNAVAILABLE"))
                    property.setStatus(Property.PropertyStatus.UNAVAILABLE);
            }
        }

        propertyRepository.save(property);

        if (dto.getRemovedImageIds() != null && !dto.getRemovedImageIds().isEmpty()) {
            for (Long imageId : dto.getRemovedImageIds()) {
                propertyImageRepository.deleteByIdAndPropertyId(imageId, propertyId);
            }
        }
        propertyImageRepository.flush();
        propertyRepository.flush();

        Property reloaded = propertyRepository.findById(propertyId).get();
        return PropertyDTO.fromWithCover(reloaded, dto.getCoverImageId());
    }

    // ── Toggle Visibility (Deactivate/Activate) ──────────────────────────
    @Transactional
    public PropertyDTO togglePropertyVisibility(Long id) {
        Property p = propertyRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Property not found."));

        // Check for active tenant before allowing a status toggle
        boolean hasActiveTenant = rentalRequestRepository
                .findByPropertyIdAndStatus(id, RentalRequest.RentalStatus.CONFIRMED)
                .isPresent();

        if (hasActiveTenant) {
            throw new IllegalArgumentException("Cannot toggle visibility: This property has an active tenant.");
        }

        // If it's available, hide it. If it's unavailable, show it.
        if (p.getStatus() == Property.PropertyStatus.AVAILABLE) {
            p.setStatus(Property.PropertyStatus.UNAVAILABLE);
        } else if (p.getStatus() == Property.PropertyStatus.UNAVAILABLE) {
            p.setStatus(Property.PropertyStatus.AVAILABLE);
        } else {
            throw new IllegalArgumentException("Can only toggle visibility for properties that are AVAILABLE or UNAVAILABLE.");
        }

        Property saved = propertyRepository.save(p);
        PropertyDTO dto = PropertyDTO.from(saved);
        dto.setHasActiveTenant(false); // We just verified there isn't one
        return dto;
    }

    // ── Admin Upload Images (Bypasses Owner Check) ───────────────────────
    @Transactional
    public PropertyDTO uploadImagesAsAdmin(Long propertyId, List<org.springframework.web.multipart.MultipartFile> files) throws java.io.IOException {
        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new IllegalArgumentException("Property not found."));

        // No owner check here! Admin bypasses it.

        for (org.springframework.web.multipart.MultipartFile file : files) {
            String url = storageService.uploadPropertyImage(propertyId, file);
            edu.cit.saligue.cebunest.entity.PropertyImage image = edu.cit.saligue.cebunest.entity.PropertyImage.builder()
                    .property(property)
                    .imageUrl(url)
                    .build();
            propertyImageRepository.save(image);
        }

        return PropertyDTO.from(propertyRepository.findById(propertyId).get());
    }
}