package edu.cit.saligue.cebunest.properties.edit;

import edu.cit.saligue.cebunest.notifications.core.NotificationService;
import edu.cit.saligue.cebunest.properties.admin.AuditLog;
import edu.cit.saligue.cebunest.properties.admin.AuditLogRepository;
import edu.cit.saligue.cebunest.properties.shared.Property;
import edu.cit.saligue.cebunest.properties.shared.PropertyRepository;
import edu.cit.saligue.cebunest.properties.shared.PropertyTypeRepository;
import edu.cit.saligue.cebunest.users.shared.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PropertyEditRequestService {

    private final PropertyEditRequestRepository editRequestRepository;
    private final PropertyRepository            propertyRepository;
    private final PropertyTypeRepository        propertyTypeRepository;
    private final AuditLogRepository            auditLogRepository;
    private final NotificationService           notificationService;

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

        // Resolve the proposed type name for display
        String proposedTypeName = propertyTypeRepository.findById(dto.getTypeId())
                .orElseThrow(() -> new IllegalArgumentException("Invalid property type."))
                .getName();

        // Snapshot the CURRENT live values before anything changes
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

                // Proposed (new) values from owner
                .proposedTitle(dto.getTitle().trim())
                .proposedDescription(dto.getDescription() != null ? dto.getDescription().trim() : "")
                .proposedPrice(dto.getPrice())
                .proposedLocation(dto.getLocation().trim())
                .proposedTypeId(dto.getTypeId())
                .proposedTypeName(proposedTypeName)
                .proposedBeds(dto.getBeds())
                .proposedBaths(dto.getBaths())
                .proposedSqm(dto.getSqm())

                .build();

        editRequestRepository.save(editRequest);

        // Move the property into the holding status
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

        // Apply proposed values to the live property
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

        // Restore to the status the property had before submission
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

        // Restore the property to its previous status WITHOUT applying the proposed changes
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