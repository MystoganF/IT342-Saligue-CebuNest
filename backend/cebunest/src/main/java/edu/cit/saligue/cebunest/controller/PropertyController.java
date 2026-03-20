package edu.cit.saligue.cebunest.controller;

import edu.cit.saligue.cebunest.dto.PropertyDTO;
import edu.cit.saligue.cebunest.entity.Property;
import edu.cit.saligue.cebunest.repository.PropertyRepository;
import edu.cit.saligue.cebunest.service.PropertyService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/properties")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class PropertyController {

    private final PropertyService propertyService;
    private final PropertyRepository propertyRepository;

    @GetMapping
    public ResponseEntity<?> getProperties(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) Double minPrice,
            @RequestParam(required = false) Double maxPrice
    ) {
        try {
            List<PropertyDTO> properties = propertyService.getProperties(search, type, minPrice, maxPrice);

            Map<String, Object> data = new HashMap<>();
            data.put("properties", properties);

            Map<String, Object> body = new HashMap<>();
            body.put("success", true);
            body.put("data", data);
            body.put("error", null);
            body.put("timestamp", LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME));

            return ResponseEntity.ok(body);

        } catch (Exception e) {
            // TEMPORARY — shows real error in response for debugging
            return buildError("SYSTEM-001",
                    e.getClass().getSimpleName() + ": " + e.getMessage(),
                    HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getPropertyById(@PathVariable Long id) {
        try {
            Property property = propertyRepository.findById(id)
                    .orElseThrow(() -> new IllegalArgumentException("Property not found."));

            Map<String, Object> data = new HashMap<>();
            data.put("property", PropertyDTO.from(property));

            Map<String, Object> body = new HashMap<>();
            body.put("success", true);
            body.put("data", data);
            body.put("error", null);
            body.put("timestamp", LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME));

            return ResponseEntity.ok(body);
        } catch (IllegalArgumentException e) {
            return buildError("DB-001", e.getMessage(), HttpStatus.NOT_FOUND);
        }
    }

    private ResponseEntity<?> buildError(String code, String message, HttpStatus status) {
        Map<String, Object> error = new HashMap<>();
        error.put("code", code);
        error.put("message", message);
        error.put("details", null);

        Map<String, Object> body = new HashMap<>();
        body.put("success", false);
        body.put("data", null);
        body.put("error", error);
        body.put("timestamp", LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME));

        return ResponseEntity.status(status).body(body);
    }
}