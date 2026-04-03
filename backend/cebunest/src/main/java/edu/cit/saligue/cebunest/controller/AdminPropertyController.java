package edu.cit.saligue.cebunest.controller;

import edu.cit.saligue.cebunest.dto.PropertyDTO;
import edu.cit.saligue.cebunest.dto.UpdatePropertyDTO;
import edu.cit.saligue.cebunest.entity.User;
import edu.cit.saligue.cebunest.service.AdminPropertyService;
import lombok.Data;
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
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class AdminPropertyController {

    private final AdminPropertyService adminPropertyService;

    // ── GET /api/admin/rental-requests/pending ────────────────────────────
    @GetMapping("/api/admin/rental-requests/pending")
    public ResponseEntity<?> getPendingRequests(@AuthenticationPrincipal User currentUser) {
        if (!isAdmin(currentUser)) return forbidden();
        try {
            List<PropertyDTO> pending = adminPropertyService.getPendingProperties();
            return ok(Map.of("properties", pending, "count", pending.size()));
        } catch (Exception e) {
            e.printStackTrace();
            return err("SYSTEM-001", e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // ── GET /api/admin/rental-requests/{id} ───────────────────────────────
    @GetMapping("/api/admin/rental-requests/{id}")
    public ResponseEntity<?> getRentalRequestDetail(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        if (!isAdmin(currentUser)) return forbidden();
        return getSinglePropertyResponse(id);
    }

    // ── GET /api/admin/properties/{id} ────────────────────────────────────
    @GetMapping("/api/admin/properties/{id}")
    public ResponseEntity<?> getPropertyDetail(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        if (!isAdmin(currentUser)) return forbidden();
        return getSinglePropertyResponse(id);
    }

    // ── PUT /api/admin/rental-requests/{id}/status ────────────────────────
    @PutMapping("/api/admin/rental-requests/{id}/status")
    public ResponseEntity<?> updateStatus(
            @PathVariable Long id,
            @RequestBody StatusUpdateDTO body,
            @AuthenticationPrincipal User currentUser) {
        if (!isAdmin(currentUser)) return forbidden();

        if (body.getStatus() == null || body.getStatus().isBlank())
            return err("VALID-001", "Status is required.", HttpStatus.BAD_REQUEST);

        String status = body.getStatus().toUpperCase();
        if (!status.equals("APPROVED") && !status.equals("REJECTED"))
            return err("VALID-001", "Status must be APPROVED or REJECTED.", HttpStatus.BAD_REQUEST);
        if (status.equals("REJECTED") && (body.getReason() == null || body.getReason().isBlank()))
            return err("VALID-001", "Rejection reason is required.", HttpStatus.BAD_REQUEST);

        try {
            PropertyDTO updated = adminPropertyService.updatePropertyStatus(
                    id, status, body.getReason(), currentUser);
            return ok(Map.of("property", updated));
        } catch (IllegalArgumentException e) {
            return err("BUSINESS-001", e.getMessage(), HttpStatus.BAD_REQUEST);
        } catch (Exception e) {
            e.printStackTrace();
            return err("SYSTEM-001", e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // ── GET /api/admin/audit-logs ─────────────────────────────────────────
    @GetMapping("/api/admin/audit-logs")
    public ResponseEntity<?> getAuditLogs(
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal User currentUser) {
        if (!isAdmin(currentUser)) return forbidden();
        try {
            return ok(adminPropertyService.getAuditHistory(page, size));
        } catch (Exception e) {
            e.printStackTrace();
            return err("SYSTEM-001", e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // ── GET /api/admin/properties (List) ──────────────────────────────────
    @GetMapping("/api/admin/properties")
    public ResponseEntity<?> getAllProperties(@AuthenticationPrincipal User currentUser) {
        if (!isAdmin(currentUser)) return forbidden();
        try {
            List<PropertyDTO> properties = adminPropertyService.getAllProperties();
            return ok(Map.of("properties", properties, "count", properties.size()));
        } catch (Exception e) {
            e.printStackTrace();
            return err("SYSTEM-001", e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // ── PUT /api/admin/properties/{id} (Update) ───────────────────────────
    @PutMapping("/api/admin/properties/{id}")
    public ResponseEntity<?> updatePropertyAsAdmin(
            @PathVariable Long id,
            @RequestBody UpdatePropertyDTO dto,
            @AuthenticationPrincipal User currentUser) {
        if (!isAdmin(currentUser)) return forbidden();

        try {
            if (dto.getTitle() == null || dto.getTitle().isBlank())
                return err("VALID-001", "Title is required.", HttpStatus.BAD_REQUEST);
            if (dto.getPrice() == null || dto.getPrice() <= 0)
                return err("VALID-001", "Price must be greater than 0.", HttpStatus.BAD_REQUEST);

            PropertyDTO updated = adminPropertyService.updatePropertyAsAdmin(id, dto, currentUser);
            return ok(Map.of("property", updated));
        } catch (IllegalArgumentException e) {
            return err("BUSINESS-001", e.getMessage(), HttpStatus.BAD_REQUEST);
        } catch (Exception e) {
            e.printStackTrace();
            return err("SYSTEM-001", e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // ── PUT /api/admin/properties/{id}/visibility ─────────────────────────
    @PutMapping("/api/admin/properties/{id}/visibility")
    public ResponseEntity<?> toggleVisibility(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body, // NEW: Accepts a reason
            @AuthenticationPrincipal User currentUser) {

        if (!isAdmin(currentUser)) return forbidden();

        String reason = (body != null) ? body.get("reason") : "No reason provided by administrator.";

        try {
            // Updated service call
            PropertyDTO updated = adminPropertyService.togglePropertyVisibility(id, reason, currentUser);
            return ok(Map.of("property", updated));
        } catch (IllegalArgumentException e) {
            return err("BUSINESS-001", e.getMessage(), HttpStatus.BAD_REQUEST);
        } catch (Exception e) {
            e.printStackTrace();
            return err("SYSTEM-001", e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // ── POST /api/admin/properties/{id}/images ────────────────────────────
    @PostMapping("/api/admin/properties/{id}/images")
    public ResponseEntity<?> uploadImagesAsAdmin(
            @PathVariable Long id,
            @RequestParam("files") List<org.springframework.web.multipart.MultipartFile> files,
            @AuthenticationPrincipal User currentUser) {
        if (!isAdmin(currentUser)) return forbidden();

        if (files == null || files.isEmpty())
            return err("VALID-001", "At least one image is required.", HttpStatus.BAD_REQUEST);
        if (files.size() > 10)
            return err("VALID-001", "Maximum 10 images allowed.", HttpStatus.BAD_REQUEST);

        for (org.springframework.web.multipart.MultipartFile file : files) {
            String ct = file.getContentType();
            if (ct == null || !ct.startsWith("image/"))
                return err("VALID-001", "Only image files are allowed.", HttpStatus.BAD_REQUEST);
            if (file.getSize() > 5 * 1024 * 1024)
                return err("VALID-001", "Each image must be under 5MB.", HttpStatus.BAD_REQUEST);
        }

        try {
            PropertyDTO updated = adminPropertyService.uploadImagesAsAdmin(id, files);
            return ok(Map.of("property", updated));
        } catch (IllegalArgumentException e) {
            return err("BUSINESS-001", e.getMessage(), HttpStatus.BAD_REQUEST);
        } catch (Exception e) {
            return err("SYSTEM-001", "Image upload failed: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // ── Private Helper for fetching single property ──────────────────────
    private ResponseEntity<?> getSinglePropertyResponse(Long id) {
        try {
            // Delegated to the service layer!
            PropertyDTO dto = adminPropertyService.getPropertyDetail(id);
            return ok(Map.of("property", dto));
        } catch (IllegalArgumentException e) {
            return err("DB-001", e.getMessage(), HttpStatus.NOT_FOUND);
        } catch (Exception e) {
            return err("SYSTEM-001", "An unexpected error occurred.", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────
    private boolean isAdmin(User u) {
        return u != null && u.getRole() != null
                && u.getRole().getName().equalsIgnoreCase("ADMIN");
    }

    private String ts() { return LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME); }

    private ResponseEntity<?> ok(Object data) {
        Map<String, Object> b = new HashMap<>();
        b.put("success", true); b.put("data", data); b.put("error", null); b.put("timestamp", ts());
        return ResponseEntity.ok(b);
    }

    private ResponseEntity<?> forbidden() { return err("AUTH-002", "Admin access required.", HttpStatus.FORBIDDEN); }

    private ResponseEntity<?> err(String code, String msg, HttpStatus status) {
        Map<String, Object> error = new HashMap<>();
        error.put("code", code); error.put("message", msg); error.put("details", null);
        Map<String, Object> b = new HashMap<>();
        b.put("success", false); b.put("data", null); b.put("error", error); b.put("timestamp", ts());
        return ResponseEntity.status(status).body(b);
    }

    @Data
    public static class StatusUpdateDTO {
        private String status;
        private String reason;
    }
}