package edu.cit.saligue.cebunest.properties.edit;

import edu.cit.saligue.cebunest.notifications.core.NotificationService;
import edu.cit.saligue.cebunest.properties.admin.AuditLog;
import edu.cit.saligue.cebunest.properties.admin.AuditLogRepository;
import edu.cit.saligue.cebunest.properties.shared.Property;
import edu.cit.saligue.cebunest.properties.shared.PropertyImage;
import edu.cit.saligue.cebunest.properties.shared.PropertyImageRepository;
import edu.cit.saligue.cebunest.properties.shared.PropertyRepository;
import edu.cit.saligue.cebunest.properties.shared.PropertyTypeRepository;
import edu.cit.saligue.cebunest.users.shared.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PropertyEditRequestService {

    private final PropertyEditRequestRepository editRequestRepository;
    private final PropertyRepository            propertyRepository;
    private final PropertyTypeRepository        propertyTypeRepository;
    private final PropertyImageRepository       propertyImageRepository;
    private final AuditLogRepository            auditLogRepository;
    private final NotificationService           notificationService;

    // ── Helper: convert list of longs to/from CSV ─────────────────────────
    private static String toCsv(List<Long> ids) {
        if (ids == null || ids.isEmpty()) return null;
        return ids.stream().map(String::valueOf).collect(Collectors.joining(","));
    }

    private static List<Long> fromCsv(String csv) {
        if (csv == null || csv.isBlank()) return Collections.emptyList();
        return java.util.Arrays.stream(csv.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(Long::parseLong)
                .collect(Collectors.toList());
    }

    // ── Owner: submit an edit request ────────────────────────────────────
    @Transactional
    public PropertyEditRequestDTO submitEditRequest(Long propertyId,
                                                    SubmitEditRequestDTO dto,
                                                    User owner) {
        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new IllegalArgumentException("Property not found."));

        if (!property.getOwner().getId().equals(owner.getId()))
            throw new IllegalArgumentException("You do not own this property.");

        if (property.getStatus() == Property.PropertyStatus.PENDING_REVIEW)
            throw new IllegalArgumentException("This property is already pending admin review.");

        if (property.getStatus() == Property.PropertyStatus.REJECTED)
            throw new IllegalArgumentException("Rejected properties cannot be edited.");

        if (editRequestRepository.existsByPropertyIdAndEditStatus(
                propertyId, PropertyEditRequest.EditStatus.PENDING))
            throw new IllegalArgumentException(
                    "This property already has a pending edit request awaiting admin review.");

        // Resolve the proposed type name
        String proposedTypeName = propertyTypeRepository.findById(dto.getTypeId())
                .orElseThrow(() -> new IllegalArgumentException("Invalid property type."))
                .getName();

        // Validate that pendingImageIds actually belong to this property and are marked pending
        List<Long> pendingIds = dto.getPendingImageIds() != null ? dto.getPendingImageIds() : Collections.emptyList();
        if (!pendingIds.isEmpty()) {
            List<PropertyImage> pendingImages = propertyImageRepository.findAllById(pendingIds);
            for (PropertyImage img : pendingImages) {
                if (!img.getProperty().getId().equals(propertyId))
                    throw new IllegalArgumentException("Image " + img.getId() + " does not belong to this property.");
                if (!img.isPending())
                    throw new IllegalArgumentException("Image " + img.getId() + " is not a pending image.");
            }
        }

        // Validate that removedImageIds belong to this property
        List<Long> removedIds = dto.getRemovedImageIds() != null ? dto.getRemovedImageIds() : Collections.emptyList();
        if (!removedIds.isEmpty()) {
            List<PropertyImage> toRemove = propertyImageRepository.findAllById(removedIds);
            for (PropertyImage img : toRemove) {
                if (!img.getProperty().getId().equals(propertyId))
                    throw new IllegalArgumentException("Image " + img.getId() + " does not belong to this property.");
            }
        }

        String previousPropertyStatus = property.getStatus().name();

        PropertyEditRequest editRequest = PropertyEditRequest.builder()
                .property(property)
                .submittedBy(owner)
                .editStatus(PropertyEditRequest.EditStatus.PENDING)

                // Previous (live) snapshot
                .previousTitle(property.getTitle())
                .previousDescription(property.getDescription())
                .previousPrice(property.getPrice())
                .previousLocation(property.getLocation())
                .previousTypeId(property.getType() != null ? property.getType().getId() : null)
                .previousTypeName(property.getType() != null ? property.getType().getName() : null)
                .previousBeds(property.getBeds())
                .previousBaths(property.getBaths())
                .previousSqm(property.getSqm())
                .previousPropertyStatus(previousPropertyStatus)

                // Proposed (new) values
                .proposedTitle(dto.getTitle().trim())
                .proposedDescription(dto.getDescription() != null ? dto.getDescription().trim() : "")
                .proposedPrice(dto.getPrice())
                .proposedLocation(dto.getLocation().trim())
                .proposedTypeId(dto.getTypeId())
                .proposedTypeName(proposedTypeName)
                .proposedBeds(dto.getBeds())
                .proposedBaths(dto.getBaths())
                .proposedSqm(dto.getSqm())

                // Image tracking
                .removedImageIds(toCsv(removedIds))
                .pendingImageIds(toCsv(pendingIds))

                .build();

        editRequestRepository.save(editRequest);

        // Move property to holding status
        property.setStatus(Property.PropertyStatus.PENDING_EDIT_REVIEW);
        propertyRepository.save(property);

        return PropertyEditRequestDTO.from(editRequest);
    }

    // ── Admin: list all pending edit requests ────────────────────────────
    @Transactional(readOnly = true)
    public List<PropertyEditRequestDTO> getPendingEditRequests() {
        return editRequestRepository
                .findByEditStatusOrderByCreatedAtDesc(PropertyEditRequest.EditStatus.PENDING)
                .stream()
                .map(PropertyEditRequestDTO::from)
                .toList();
    }

    // ── Admin: get single edit request detail ────────────────────────────
    @Transactional(readOnly = true)
    public PropertyEditRequestDTO getEditRequestDetail(Long editRequestId) {
        PropertyEditRequest req = editRequestRepository.findById(editRequestId)
                .orElseThrow(() -> new IllegalArgumentException("Edit request not found."));
        return PropertyEditRequestDTO.from(req);
    }

    // ── Admin: approve ───────────────────────────────────────────────────
    @Transactional
    public PropertyEditRequestDTO approveEditRequest(Long editRequestId,
                                                     String note,
                                                     User admin) {
        PropertyEditRequest req = editRequestRepository.findById(editRequestId)
                .orElseThrow(() -> new IllegalArgumentException("Edit request not found."));

        if (req.getEditStatus() != PropertyEditRequest.EditStatus.PENDING)
            throw new IllegalArgumentException("This edit request has already been reviewed.");

        Property property = req.getProperty();

        // Apply proposed text/field values
        var type = propertyTypeRepository.findById(req.getProposedTypeId())
                .orElseThrow(() -> new IllegalArgumentException("Proposed property type no longer exists."));

        property.setTitle(req.getProposedTitle());
        property.setDescription(req.getProposedDescription());
        property.setPrice(req.getProposedPrice());
        property.setLocation(req.getProposedLocation());
        property.setType(type);
        property.setBeds(req.getProposedBeds());
        property.setBaths(req.getProposedBaths());
        property.setSqm(req.getProposedSqm());

        // ── Apply image changes ───────────────────────────────────────────

        // 1. Delete the images the owner marked for removal
        List<Long> removedIds = fromCsv(req.getRemovedImageIds());
        if (!removedIds.isEmpty()) {
            for (Long imageId : removedIds) {
                propertyImageRepository.deleteByIdAndPropertyId(imageId, property.getId());
            }
            propertyImageRepository.flush();
        }

        // 2. Activate the pending images (flip isPending → false so they become live)
        List<Long> pendingIds = fromCsv(req.getPendingImageIds());
        if (!pendingIds.isEmpty()) {
            List<PropertyImage> toActivate = propertyImageRepository.findAllById(pendingIds);
            toActivate.forEach(img -> img.setPending(false));
            propertyImageRepository.saveAll(toActivate);
        }

        // Restore property to its pre-submission status
        property.setStatus(Property.PropertyStatus.valueOf(req.getPreviousPropertyStatus()));
        propertyRepository.save(property);

        // Mark edit request as approved
        req.setEditStatus(PropertyEditRequest.EditStatus.APPROVED);
        req.setReviewedBy(admin);
        req.setReviewedAt(LocalDateTime.now());
        editRequestRepository.save(req);

        // Audit log
        AuditLog log = AuditLog.builder()
                .admin(admin)
                .targetId(property.getId())
                .targetTitle(property.getTitle())
                .targetType("PROPERTY_EDIT")
                .action("PROPERTY_EDIT_APPROVED")
                .reason(note != null && !note.isBlank() ? note : "Approved by admin")
                .ownerName(property.getOwner().getName())
                .ownerEmail(property.getOwner().getEmail())
                .build();
        auditLogRepository.save(log);

        // Notify owner
        notificationService.send(
                property.getOwner(),
                "PROPERTY_EDIT_APPROVED",
                "Your edits to '" + property.getTitle() + "' have been approved and are now live.",
                null,
                property.getId()
        );

        return PropertyEditRequestDTO.from(req);
    }

    // ── Admin: reject ────────────────────────────────────────────────────
    @Transactional
    public PropertyEditRequestDTO rejectEditRequest(Long editRequestId,
                                                    String reason,
                                                    User admin) {
        if (reason == null || reason.isBlank())
            throw new IllegalArgumentException("Rejection reason is required.");

        PropertyEditRequest req = editRequestRepository.findById(editRequestId)
                .orElseThrow(() -> new IllegalArgumentException("Edit request not found."));

        if (req.getEditStatus() != PropertyEditRequest.EditStatus.PENDING)
            throw new IllegalArgumentException("This edit request has already been reviewed.");

        Property property = req.getProperty();

        // ── Discard image changes ─────────────────────────────────────────

        // Delete the pending images that were uploaded for this edit request
        // (they were never made live, so we just remove them entirely)
        List<Long> pendingIds = fromCsv(req.getPendingImageIds());
        if (!pendingIds.isEmpty()) {
            List<PropertyImage> toDelete = propertyImageRepository.findAllById(pendingIds);
            propertyImageRepository.deleteAll(toDelete);
            propertyImageRepository.flush();
        }
        // The removedImageIds are NOT deleted — we simply don't apply them.
        // The live images remain as-is.

        // Restore property to its previous status
        property.setStatus(Property.PropertyStatus.valueOf(req.getPreviousPropertyStatus()));
        propertyRepository.save(property);

        // Mark edit request as rejected
        req.setEditStatus(PropertyEditRequest.EditStatus.REJECTED);
        req.setReviewedBy(admin);
        req.setReviewedAt(LocalDateTime.now());
        req.setRejectionReason(reason);
        editRequestRepository.save(req);

        // Audit log
        AuditLog log = AuditLog.builder()
                .admin(admin)
                .targetId(property.getId())
                .targetTitle(property.getTitle())
                .targetType("PROPERTY_EDIT")
                .action("PROPERTY_EDIT_REJECTED")
                .reason(reason)
                .ownerName(property.getOwner().getName())
                .ownerEmail(property.getOwner().getEmail())
                .build();
        auditLogRepository.save(log);

        // Notify owner
        notificationService.send(
                property.getOwner(),
                "PROPERTY_EDIT_REJECTED",
                "Your edits to '" + property.getTitle() + "' were rejected. Reason: " + reason,
                null,
                property.getId()
        );

        return PropertyEditRequestDTO.from(req);
    }
}