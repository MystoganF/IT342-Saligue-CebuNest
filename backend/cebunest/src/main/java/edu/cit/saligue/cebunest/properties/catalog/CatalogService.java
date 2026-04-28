package edu.cit.saligue.cebunest.properties.catalog;

import edu.cit.saligue.cebunest.properties.shared.Property;
import edu.cit.saligue.cebunest.properties.shared.PropertyDTO;
import edu.cit.saligue.cebunest.properties.shared.PropertyType;
import edu.cit.saligue.cebunest.properties.shared.PropertyRepository;
import edu.cit.saligue.cebunest.properties.shared.PropertyTypeRepository;
import edu.cit.saligue.cebunest.repository.AuditLogRepository; // Kept in original repo for now
import edu.cit.saligue.cebunest.repository.RentalRequestRepository; // Kept in original repo for now
import edu.cit.saligue.cebunest.entity.RentalRequest; // Kept in original entity for now
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CatalogService {

    private final PropertyRepository propertyRepository;
    private final PropertyTypeRepository propertyTypeRepository;
    private final RentalRequestRepository rentalRequestRepository;
    private final AuditLogRepository auditLogRepository;

    @Transactional(readOnly = true)
    public List<PropertyDTO> getProperties(String search, String type, Double minPrice, Double maxPrice) {
        String cleanSearch = blank(search) ? null : search.trim();
        String cleanType   = blank(type) || type.equalsIgnoreCase("All") ? null : type.trim();

        return propertyRepository.findFiltered(cleanSearch, cleanType, minPrice, maxPrice)
                .stream()
                .filter(p -> p.getStatus() == Property.PropertyStatus.AVAILABLE)
                .filter(p -> rentalRequestRepository.findByPropertyIdAndStatus(
                        p.getId(), RentalRequest.RentalStatus.CONFIRMED).isEmpty())
                .map(PropertyDTO::from).toList();
    }

    @Transactional(readOnly = true)
    public List<PropertyType> getPropertyTypes() {
        return propertyTypeRepository.findAll();
    }

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

    private boolean blank(String s) {
        return s == null || s.isBlank();
    }
}