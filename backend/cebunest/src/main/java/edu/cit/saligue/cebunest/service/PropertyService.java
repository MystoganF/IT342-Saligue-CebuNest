package edu.cit.saligue.cebunest.service;

import edu.cit.saligue.cebunest.dto.PropertyDTO;
import edu.cit.saligue.cebunest.entity.Property;
import edu.cit.saligue.cebunest.repository.PropertyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PropertyService {

    private final PropertyRepository propertyRepository;

    public List<PropertyDTO> getProperties(
            String search,
            String type,
            Double minPrice,
            Double maxPrice
    ) {
        String cleanSearch = (search == null || search.isBlank()) ? null : search.trim();
        String cleanType   = (type == null || type.isBlank() || type.equalsIgnoreCase("All")) ? null : type.trim();

        return propertyRepository
                .findFiltered(
                        Property.PropertyStatus.AVAILABLE,
                        cleanSearch,
                        cleanType,
                        minPrice,
                        maxPrice
                )
                .stream()
                .map(PropertyDTO::from)
                .toList();
    }
}