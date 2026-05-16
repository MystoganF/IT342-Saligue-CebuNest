package edu.cit.saligue.cebunest.properties.management;

import edu.cit.saligue.cebunest.properties.shared.PropertyDTO;
import edu.cit.saligue.cebunest.users.shared.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/properties")
@RequiredArgsConstructor
public class PropertyManagementController {

    private final PropertyManagementService propertyManagementService;

    @GetMapping("/my")
    public ResponseEntity<?> getMyProperties(
            @AuthenticationPrincipal User currentUser,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Double minPrice,
            @RequestParam(required = false) Double maxPrice
    ) {
        try {
            List<PropertyDTO> properties = propertyManagementService.getMyProperties(
                    currentUser, search, minPrice, maxPrice, status);
            return buildSuccess(Map.of("properties", properties));
        } catch (Exception e) {
            return buildError("SYSTEM-001", e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @PostMapping
    public ResponseEntity<?> createProperty(
            @RequestBody CreatePropertyDTO dto,
            @AuthenticationPrincipal User currentUser
    ) {
        if (currentUser == null)
            return buildError("AUTH-001", "Not authenticated.", HttpStatus.UNAUTHORIZED);

        try {
            if (dto.getTitle() == null || dto.getTitle().isBlank())
                return buildError("VALID-001", "Title is required.", HttpStatus.BAD_REQUEST);
            if (dto.getPrice() == null || dto.getPrice() <= 0)
                return buildError("VALID-001", "Price must be greater than 0.", HttpStatus.BAD_REQUEST);
            if (dto.getLocation() == null || dto.getLocation().isBlank())
                return buildError("VALID-001", "Location is required.", HttpStatus.BAD_REQUEST);
            if (dto.getTypeId() == null)
                return buildError("VALID-001", "Property type is required.", HttpStatus.BAD_REQUEST);

            PropertyDTO created = propertyManagementService.createProperty(dto, currentUser);

            Map<String, Object> body = new HashMap<>();
            body.put("success", true);
            body.put("data", Map.of("property", created));
            body.put("error", null);
            body.put("timestamp", LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME));
            return ResponseEntity.status(HttpStatus.CREATED).body(body);

        } catch (IllegalArgumentException e) {
            return buildError("VALID-001", e.getMessage(), HttpStatus.BAD_REQUEST);
        } catch (Exception e) {
            return buildError("SYSTEM-001", e.getClass().getName() + ": " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateProperty(
            @PathVariable Long id,
            @RequestBody UpdatePropertyDTO dto,
            @AuthenticationPrincipal User currentUser
    ) {
        if (currentUser == null)
            return buildError("AUTH-001", "Not authenticated.", HttpStatus.UNAUTHORIZED);

        try {
            if (dto.getTitle() == null || dto.getTitle().isBlank())
                return buildError("VALID-001", "Title is required.", HttpStatus.BAD_REQUEST);
            if (dto.getPrice() == null || dto.getPrice() <= 0)
                return buildError("VALID-001", "Price must be greater than 0.", HttpStatus.BAD_REQUEST);
            if (dto.getLocation() == null || dto.getLocation().isBlank())
                return buildError("VALID-001", "Location is required.", HttpStatus.BAD_REQUEST);
            if (dto.getTypeId() == null)
                return buildError("VALID-001", "Property type is required.", HttpStatus.BAD_REQUEST);

            PropertyDTO updated = propertyManagementService.updateProperty(id, dto, currentUser);
            return buildSuccess(Map.of("property", updated));

        } catch (IllegalArgumentException e) {
            return buildError("BUSINESS-001", e.getMessage(), HttpStatus.BAD_REQUEST);
        } catch (Exception e) {
            return buildError("SYSTEM-001", e.getClass().getName() + ": " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @PostMapping("/{id}/images")
    public ResponseEntity<?> uploadImages(
            @PathVariable Long id,
            @RequestParam("files") List<MultipartFile> files,
            @AuthenticationPrincipal User currentUser
    ) {
        if (files == null || files.isEmpty())
            return buildError("VALID-001", "At least one image is required.", HttpStatus.BAD_REQUEST);
        if (files.size() > 10)
            return buildError("VALID-001", "Maximum 10 images allowed.", HttpStatus.BAD_REQUEST);

        for (MultipartFile file : files) {
            String ct = file.getContentType();
            if (ct == null || !ct.startsWith("image/"))
                return buildError("VALID-001", "Only image files are allowed.", HttpStatus.BAD_REQUEST);
            if (file.getSize() > 5 * 1024 * 1024)
                return buildError("VALID-001", "Each image must be under 5MB.", HttpStatus.BAD_REQUEST);
        }

        try {
            PropertyDTO updated = propertyManagementService.uploadImages(id, currentUser, files);
            return buildSuccess(Map.of("property", updated));
        } catch (IllegalArgumentException e) {
            return buildError("BUSINESS-001", e.getMessage(), HttpStatus.BAD_REQUEST);
        } catch (Exception e) {
            return buildError("SYSTEM-001", "Image upload failed: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteProperty(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser
    ) {
        if (currentUser == null)
            return buildError("AUTH-001", "Not authenticated.", HttpStatus.UNAUTHORIZED);

        try {
            propertyManagementService.deleteProperty(id, currentUser);
            return buildSuccess(Map.of("deleted", true, "id", id));
        } catch (IllegalArgumentException e) {
            return buildError("BUSINESS-001", e.getMessage(), HttpStatus.BAD_REQUEST);
        } catch (Exception e) {
            return buildError("SYSTEM-001", e.getClass().getName() + ": " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────

    private ResponseEntity<?> buildSuccess(Object data) {
        Map<String, Object> body = new HashMap<>();
        body.put("success", true);
        body.put("data", data);
        body.put("error", null);
        body.put("timestamp", LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME));
        return ResponseEntity.ok(body);
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