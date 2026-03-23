package edu.cit.saligue.cebunest.service;

import edu.cit.saligue.cebunest.dto.CreatePropertyDTO;
import edu.cit.saligue.cebunest.dto.PropertyDTO;
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

    // ── All available properties (tenant view) ──────────────────────────
    @Transactional(readOnly = true)
    public List<PropertyDTO> getProperties(
            String search, String type, Double minPrice, Double maxPrice) {
        String cleanSearch = blank(search) ? null : search.trim();
        String cleanType   = blank(type) || type.equalsIgnoreCase("All") ? null : type.trim();
        return propertyRepository.findFiltered(cleanSearch, cleanType, minPrice, maxPrice)
                .stream().map(PropertyDTO::from).toList();
    }

    // ── Owner's own properties ───────────────────────────────────────────
    @Transactional(readOnly = true)
    public List<PropertyDTO> getMyProperties(
            User owner, String search, Double minPrice, Double maxPrice) {
        String cleanSearch = blank(search) ? null : search.trim();
        return propertyRepository.findByOwnerFiltered(owner.getId(), cleanSearch, minPrice, maxPrice)
                .stream().map(PropertyDTO::from).toList();
    }

    // ── All property types ───────────────────────────────────────────────
    public List<PropertyType> getPropertyTypes() {
        return propertyTypeRepository.findAll();
    }

    // ── Create property (no images yet) ─────────────────────────────────
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
                .status(Property.PropertyStatus.AVAILABLE)
                .beds(dto.getBeds())
                .baths(dto.getBaths())
                .sqm(dto.getSqm())
                .build();

        // saveAndFlush forces the INSERT so the generated ID is populated immediately
        Property saved = propertyRepository.saveAndFlush(property);

        // Force-initialize lazy associations inside the transaction
        saved.getOwner().getId();
        saved.getOwner().getName();
        saved.getType().getId();
        saved.getType().getName();

        // Map directly — images is already an empty ArrayList from @Builder.Default
        return PropertyDTO.from(saved);
    }

    // ── Upload images for a property ─────────────────────────────────────
    @Transactional
    public PropertyDTO uploadImages(Long propertyId, User owner, List<MultipartFile> files)
            throws IOException {
        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new IllegalArgumentException("Property not found."));

        if (!property.getOwner().getId().equals(owner.getId())) {
            throw new IllegalArgumentException("You do not own this property.");
        }

        for (MultipartFile file : files) {
            String url = storageService.uploadPropertyImage(propertyId, file);
            PropertyImage image = PropertyImage.builder()
                    .property(property)
                    .imageUrl(url)
                    .build();
            propertyImageRepository.save(image);
        }

        // Reload with images
        return PropertyDTO.from(propertyRepository.findById(propertyId).get());
    }

    // ── Delete property (owner only) ─────────────────────────────────────
    @Transactional
    public void deleteProperty(Long propertyId, User owner) {
        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new IllegalArgumentException("Property not found."));

        if (!property.getOwner().getId().equals(owner.getId())) {
            throw new IllegalArgumentException("You do not own this property.");
        }

        // Images are deleted automatically via CascadeType.ALL + orphanRemoval = true
        propertyRepository.delete(property);
    }

    // ── Helper ───────────────────────────────────────────────────────────
    private boolean blank(String s) {
        return s == null || s.isBlank();
    }
}