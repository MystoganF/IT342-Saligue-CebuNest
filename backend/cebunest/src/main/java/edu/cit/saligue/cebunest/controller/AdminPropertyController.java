package edu.cit.saligue.cebunest.controller;

import edu.cit.saligue.cebunest.dto.PropertyDTO;
import edu.cit.saligue.cebunest.entity.Property;
import edu.cit.saligue.cebunest.entity.User;
import edu.cit.saligue.cebunest.repository.AuditLogRepository;
import edu.cit.saligue.cebunest.repository.PropertyRepository;
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
    private final PropertyRepository   propertyRepository;
    private final AuditLogRepository   auditLogRepository;

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

    // ── GET /api/admin/rental-requests/{id} — full property detail ────────
    @GetMapping("/api/admin/rental-requests/{id}")
    public ResponseEntity<?> getPropertyDetail(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        if (!isAdmin(currentUser)) return forbidden();
        try {
            Property property = propertyRepository.findById(id)
                    .orElseThrow(() -> new IllegalArgumentException("Property not found."));

            String rejectionReason = null;
            if (property.getStatus() == Property.PropertyStatus.REJECTED) {
                rejectionReason = auditLogRepository.findLatestRejectionReason(id).orElse(null);
            }

            return ok(Map.of("property", PropertyDTO.from(property, rejectionReason)));
        } catch (IllegalArgumentException e) {
            return err("DB-001", e.getMessage(), HttpStatus.NOT_FOUND);
        } catch (Exception e) {
            e.printStackTrace();
            return err("SYSTEM-001", e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
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

    // ── Inner DTO ─────────────────────────────────────────────────────────
    @Data
    public static class StatusUpdateDTO {
        private String status;
        private String reason;
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
}