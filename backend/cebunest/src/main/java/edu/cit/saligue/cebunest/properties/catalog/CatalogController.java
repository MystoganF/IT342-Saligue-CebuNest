package edu.cit.saligue.cebunest.properties.catalog;

import edu.cit.saligue.cebunest.properties.shared.PropertyDTO;
import edu.cit.saligue.cebunest.properties.shared.PropertyType;
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
public class CatalogController {

    private final CatalogService catalogService;

    @GetMapping
    public ResponseEntity<?> getProperties(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) Double minPrice,
            @RequestParam(required = false) Double maxPrice
    ) {
        try {
            List<PropertyDTO> properties = catalogService.getProperties(search, type, minPrice, maxPrice);
            return buildSuccess(Map.of("properties", properties));
        } catch (Exception e) {
            return buildError("SYSTEM-001", e.getClass().getSimpleName() + ": " + e.getMessage(),
                    HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @GetMapping("/types")
    public ResponseEntity<?> getPropertyTypes() {
        try {
            List<PropertyType> types = catalogService.getPropertyTypes();
            List<Map<String, Object>> result = types.stream().map(t -> {
                Map<String, Object> m = new HashMap<>();
                m.put("id",   t.getId());
                m.put("name", t.getName());
                return m;
            }).toList();
            return buildSuccess(Map.of("types", result));
        } catch (Exception e) {
            return buildError("SYSTEM-001", e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getPropertyById(@PathVariable Long id) {
        try {
            PropertyDTO propertyDTO = catalogService.getPropertyById(id);
            return buildSuccess(Map.of("property", propertyDTO));
        } catch (IllegalArgumentException e) {
            return buildError("DB-001", e.getMessage(), HttpStatus.NOT_FOUND);
        } catch (Exception e) {
            return buildError("SYSTEM-001", e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    private ResponseEntity<?> buildSuccess(Object data) {
        Map<String, Object> body = new HashMap<>();
        body.put("success",   true);
        body.put("data",      data);
        body.put("error",     null);
        body.put("timestamp", LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME));
        return ResponseEntity.ok(body);
    }

    private ResponseEntity<?> buildError(String code, String message, HttpStatus status) {
        Map<String, Object> error = new HashMap<>();
        error.put("code",    code);
        error.put("message", message);
        error.put("details", null);

        Map<String, Object> body = new HashMap<>();
        body.put("success",   false);
        body.put("data",      null);
        body.put("error",     error);
        body.put("timestamp", LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME));
        return ResponseEntity.status(status).body(body);
    }
}