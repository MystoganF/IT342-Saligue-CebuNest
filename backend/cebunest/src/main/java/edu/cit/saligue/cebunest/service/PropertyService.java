package edu.cit.saligue.cebunest.service;

import edu.cit.saligue.cebunest.dto.CreatePropertyDTO;
import edu.cit.saligue.cebunest.dto.PropertyDTO;
import edu.cit.saligue.cebunest.dto.UpdatePropertyDTO;
import edu.cit.saligue.cebunest.entity.*;
import edu.cit.saligue.cebunest.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PropertyService {

    private final PropertyRepository      propertyRepository;
    private final PropertyTypeRepository  propertyTypeRepository;
    private final PropertyImageRepository propertyImageRepository;
    private final SupabaseStorageService  storageService;
    private final RentalRequestRepository rentalRequestRepository;
    private final AuditLogRepository      auditLogRepository;

    // ── All available properties (tenant view) ───────────────────────────
    @Transactional(readOnly = true)
    public List<PropertyDTO> getProperties(
            String search, String type, Double minPrice, Double maxPrice) {
        String cleanSearch = blank(search) ? null : search.trim();
        String cleanType   = blank(type) || type.equalsIgnoreCase("All") ? null : type.trim();

        return propertyRepository.findFiltered(cleanSearch, cleanType, minPrice, maxPrice)
                .stream()
                .filter(p -> p.getStatus() == Property.PropertyStatus.AVAILABLE)
                .filter(p -> rentalRequestRepository.findByPropertyIdAndStatus(
                        p.getId(), RentalRequest.RentalStatus.CONFIRMED).isEmpty())
                .map(PropertyDTO::from).toList();
    }

    // ── Owner's own properties ───────────────────────────────────────────
    @Transactional(readOnly = true)
    public List<PropertyDTO> getMyProperties(
            User owner, String search, Double minPrice, Double maxPrice) {
        String cleanSearch = blank(search) ? null : search.trim();
        return propertyRepository.findByOwnerFiltered(owner.getId(), cleanSearch, minPrice, maxPrice)
                .stream().map(p -> {
                    PropertyDTO dto = PropertyDTO.from(p);
                    boolean hasActiveTenant = rentalRequestRepository
                            .findByPropertyIdAndStatus(p.getId(), RentalRequest.RentalStatus.CONFIRMED)
                            .isPresent();
                    dto.setHasActiveTenant(hasActiveTenant);
                    return dto;
                }).toList();
    }

    // ── All property types ───────────────────────────────────────────────
    public List<PropertyType> getPropertyTypes() {
        return propertyTypeRepository.findAll();
    }

    // ── Get Single Property By ID (WITH REJECTION REASON) ────────────────
    @Transactional(readOnly = true)
    public PropertyDTO getPropertyById(Long propertyId) {
        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new IllegalArgumentException("Property not found."));

        String rejectionReason = null;
        if (property.getStatus() == Property.PropertyStatus.REJECTED) {
            rejectionReason = auditLogRepository.findLatestRejectionReason(propertyId).orElse(null);
        }

        return PropertyDTO.from(property, rejectionReason);
    }

    // ── Create property ──────────────────────────────────────────────────
    @Transactional
    public PropertyDTO createProperty(CreatePropertyDTO dto, User owner) {
        PropertyType type = propertyTypeRepository.findById(dto.getTypeId())
                .orElseThrow(() -> new IllegalArgumentException("Invalid property type."));

        Property property = Property.builder()
                .owner(owner)
                .title(dto.getTitle().trim())
                .description(dto.getDescription() != null ? dto.getDescription().trim() : "")
                .price(dto.getPrice())
                .location(dto.getLocation().trim())
                .type(type)
                .status(Property.PropertyStatus.PENDING_REVIEW)
                .beds(dto.getBeds())
                .baths(dto.getBaths())
                .sqm(dto.getSqm())
                .build();

        Property saved = propertyRepository.saveAndFlush(property);
        return PropertyDTO.from(saved);
    }

    // ── Update property (Owner View with Admin Lock Check) ────────────────
    @Transactional
    public PropertyDTO updateProperty(Long propertyId, UpdatePropertyDTO dto, User owner) {
        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new IllegalArgumentException("Property not found."));

        if (!property.getOwner().getId().equals(owner.getId()))
            throw new IllegalArgumentException("You do not own this property.");

        // --- NEW: ADMIN LOCKOUT GUARD ---
        if (property.isAdminDisabled() && "AVAILABLE".equalsIgnoreCase(dto.getStatus())) {
            throw new IllegalArgumentException("This listing is restricted by an administrator. Reason: " + property.getAdminNote());
        }

        PropertyType type = propertyTypeRepository.findById(dto.getTypeId())
                .orElseThrow(() -> new IllegalArgumentException("Invalid property type."));

        // Check if property currently has an active tenant
        boolean hasActiveTenant = rentalRequestRepository.findByPropertyIdAndStatus(
                propertyId, RentalRequest.RentalStatus.CONFIRMED).isPresent();

        // Update scalar fields
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
            // Allow toggle only for approved listings (AVAILABLE/UNAVAILABLE)
            if (current == Property.PropertyStatus.AVAILABLE || current == Property.PropertyStatus.UNAVAILABLE) {
                if (dto.getStatus().equals("AVAILABLE"))
                    property.setStatus(Property.PropertyStatus.AVAILABLE);
                else if (dto.getStatus().equals("UNAVAILABLE"))
                    property.setStatus(Property.PropertyStatus.UNAVAILABLE);
            }
        }

        propertyRepository.save(property);

        // Delete removed images
        if (dto.getRemovedImageIds() != null && !dto.getRemovedImageIds().isEmpty()) {
            for (Long imageId : dto.getRemovedImageIds()) {
                propertyImageRepository.deleteByIdAndPropertyId(imageId, propertyId);
            }
        }

        propertyImageRepository.flush();
        propertyRepository.flush();

        Property reloaded = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new IllegalArgumentException("Property not found after update."));

        return PropertyDTO.fromWithCover(reloaded, dto.getCoverImageId());
    }

    // ── Upload images ────────────────────────────────────────────────────
    @Transactional
    public PropertyDTO uploadImages(Long propertyId, User owner, List<MultipartFile> files)
            throws IOException {
        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new IllegalArgumentException("Property not found."));

        if (!property.getOwner().getId().equals(owner.getId()))
            throw new IllegalArgumentException("You do not own this property.");

        for (MultipartFile file : files) {
            String url = storageService.uploadPropertyImage(propertyId, file);
            PropertyImage image = PropertyImage.builder()
                    .property(property)
                    .imageUrl(url)
                    .build();
            propertyImageRepository.save(image);
        }

        return PropertyDTO.from(propertyRepository.findById(propertyId).get());
    }

    // ── Delete property ──────────────────────────────────────────────────
    @Transactional
    public void deleteProperty(Long propertyId, User owner) {
        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new IllegalArgumentException("Property not found."));

        if (!property.getOwner().getId().equals(owner.getId()))
            throw new IllegalArgumentException("You do not own this property.");

        rentalRequestRepository
                .findByPropertyIdAndStatus(propertyId, RentalRequest.RentalStatus.CONFIRMED)
                .ifPresent(r -> {
                    throw new IllegalArgumentException(
                            "Cannot delete this property while it has an active tenant. " +
                                    "Please end the lease first before deleting."
                    );
                });

        propertyRepository.delete(property);
    }

    private boolean blank(String s) {
        return s == null || s.isBlank();
    }
}