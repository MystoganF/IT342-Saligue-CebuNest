package edu.cit.saligue.cebunest.service;

import edu.cit.saligue.cebunest.dto.PropertyDTO;
import edu.cit.saligue.cebunest.entity.PropertyType;
import edu.cit.saligue.cebunest.entity.User;
import edu.cit.saligue.cebunest.repository.PropertyRepository;
import edu.cit.saligue.cebunest.repository.PropertyTypeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PropertyService {

    private final PropertyRepository     propertyRepository;
    private final PropertyTypeRepository propertyTypeRepository;

    // ── All available properties (tenant view) ──────────────────────────
    public List<PropertyDTO> getProperties(
            String search,
            String type,
            Double minPrice,
            Double maxPrice
    ) {
        String cleanSearch = (search == null || search.isBlank()) ? null : search.trim();
        String cleanType   = (type   == null || type.isBlank()   || type.equalsIgnoreCase("All")) ? null : type.trim();

        return propertyRepository
                .findFiltered(cleanSearch, cleanType, minPrice, maxPrice)
                .stream()
                .map(PropertyDTO::from)
                .toList();
    }

    // ── Owner's own properties ───────────────────────────────────────────
    public List<PropertyDTO> getMyProperties(
            User owner,
            String search,
            Double minPrice,
            Double maxPrice
    ) {
        String cleanSearch = (search == null || search.isBlank()) ? null : search.trim();

        return propertyRepository
                .findByOwnerFiltered(owner.getId(), cleanSearch, minPrice, maxPrice)
                .stream()
                .map(PropertyDTO::from)
                .toList();
    }

    // ── All property types (for dynamic filter chips) ────────────────────
    public List<PropertyType> getPropertyTypes() {
        return propertyTypeRepository.findAll();
    }
}