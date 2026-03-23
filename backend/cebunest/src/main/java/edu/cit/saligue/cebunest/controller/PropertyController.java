package edu.cit.saligue.cebunest.controller;

import edu.cit.saligue.cebunest.dto.PropertyDTO;
import edu.cit.saligue.cebunest.entity.Property;
import edu.cit.saligue.cebunest.entity.PropertyType;
import edu.cit.saligue.cebunest.entity.User;
import edu.cit.saligue.cebunest.repository.PropertyRepository;
import edu.cit.saligue.cebunest.service.PropertyService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
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

    private final PropertyService    propertyService;
    private final PropertyRepository propertyRepository;

    // ── GET /api/properties — public listing (tenants) ───────────────────
    @GetMapping
    public ResponseEntity<?> getProperties(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) Double minPrice,
            @RequestParam(required = false) Double maxPrice
    ) {
        try {
            List<PropertyDTO> properties = propertyService.getProperties(search, type, minPrice, maxPrice);
            return buildSuccess(Map.of("properties", properties));
        } catch (Exception e) {
            return buildError("SYSTEM-001", e.getClass().getSimpleName() + ": " + e.getMessage(),
                    HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // ── GET /api/properties/types — dynamic filter chips ─────────────────
    @GetMapping("/types")
    public ResponseEntity<?> getPropertyTypes() {
        try {
            List<PropertyType> types = propertyService.getPropertyTypes();
            // Return as list of {id, name} objects
            List<Map<String, Object>> result = types.stream()
                    .map(t -> {
                        Map<String, Object> m = new HashMap<>();
                        m.put("id",   t.getId());
                        m.put("name", t.getName());
                        return m;
                    })
                    .toList();
            return buildSuccess(Map.of("types", result));
        } catch (Exception e) {
            return buildError("SYSTEM-001", e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // ── GET /api/properties/my — owner's own listings ────────────────────
    @GetMapping("/my")
    public ResponseEntity<?> getMyProperties(
            @AuthenticationPrincipal User currentUser,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Double minPrice,
            @RequestParam(required = false) Double maxPrice
    ) {
        try {
            List<PropertyDTO> properties = propertyService.getMyProperties(
                    currentUser, search, minPrice, maxPrice);
            return buildSuccess(Map.of("properties", properties));
        } catch (Exception e) {
            return buildError("SYSTEM-001", e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // ── GET /api/properties/{id} ─────────────────────────────────────────
    @GetMapping("/{id}")
    public ResponseEntity<?> getPropertyById(@PathVariable Long id) {
        try {
            Property property = propertyRepository.findById(id)
                    .orElseThrow(() -> new IllegalArgumentException("Property not found."));
            return buildSuccess(Map.of("property", PropertyDTO.from(property)));
        } catch (IllegalArgumentException e) {
            return buildError("DB-001", e.getMessage(), HttpStatus.NOT_FOUND);
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────
    private ResponseEntity<?> buildSuccess(Object data) {
        Map<String, Object> body = new HashMap<>();
        body.put("success", true);
        body.put("data",    data);
        body.put("error",   null);
        body.put("timestamp", LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME));
        return ResponseEntity.ok(body);
    }

    private ResponseEntity<?> buildError(String code, String message, HttpStatus status) {
        Map<String, Object> error = new HashMap<>();
        error.put("code",    code);
        error.put("message", message);
        error.put("details", null);

        Map<String, Object> body = new HashMap<>();
        body.put("success", false);
        body.put("data",    null);
        body.put("error",   error);
        body.put("timestamp", LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME));
        return ResponseEntity.status(status).body(body);
    }
}