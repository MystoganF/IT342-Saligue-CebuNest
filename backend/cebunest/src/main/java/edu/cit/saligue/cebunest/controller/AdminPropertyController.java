package edu.cit.saligue.cebunest.controller;

import edu.cit.saligue.cebunest.dto.PropertyDTO;
import edu.cit.saligue.cebunest.entity.User;
import edu.cit.saligue.cebunest.service.AdminPropertyService;
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
    public ResponseEntity<?> getPendingRequests(
            @AuthenticationPrincipal User currentUser
    ) {
        if (currentUser == null) return buildError("AUTH-001", "Not authenticated.", HttpStatus.UNAUTHORIZED);
        if (!isAdmin(currentUser)) return buildError("AUTH-002", "Admin access required.", HttpStatus.FORBIDDEN);

        try {
            List<PropertyDTO> pending = adminPropertyService.getPendingProperties();
            return buildSuccess(Map.of("properties", pending, "count", pending.size()));
        } catch (Exception e) {
            e.printStackTrace();
            return buildError("SYSTEM-001", e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // ── PUT /api/admin/rental-requests/{id}/status ────────────────────────
    @PutMapping("/api/admin/rental-requests/{id}/status")
    public ResponseEntity<?> updateStatus(
            @PathVariable Long id,
            @RequestBody StatusUpdateDTO body,
            @AuthenticationPrincipal User currentUser
    ) {
        if (currentUser == null) return buildError("AUTH-001", "Not authenticated.", HttpStatus.UNAUTHORIZED);
        if (!isAdmin(currentUser)) return buildError("AUTH-002", "Admin access required.", HttpStatus.FORBIDDEN);

        if (body.getStatus() == null || body.getStatus().isBlank())
            return buildError("VALID-001", "Status is required.", HttpStatus.BAD_REQUEST);

        String status = body.getStatus().toUpperCase();
        if (!status.equals("APPROVED") && !status.equals("REJECTED"))
            return buildError("VALID-001", "Status must be APPROVED or REJECTED.", HttpStatus.BAD_REQUEST);

        if (status.equals("REJECTED") && (body.getReason() == null || body.getReason().isBlank()))
            return buildError("VALID-001", "Rejection reason is required.", HttpStatus.BAD_REQUEST);

        try {
            PropertyDTO updated = adminPropertyService.updatePropertyStatus(
                    id, status, body.getReason(), currentUser);
            return buildSuccess(Map.of("property", updated));
        } catch (IllegalArgumentException e) {
            return buildError("BUSINESS-001", e.getMessage(), HttpStatus.BAD_REQUEST);
        } catch (Exception e) {
            e.printStackTrace();
            return buildError("SYSTEM-001", e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // ── Inner DTO ─────────────────────────────────────────────────────────
    @lombok.Data
    public static class StatusUpdateDTO {
        private String status;
        private String reason;
    }

    // ── Helpers ───────────────────────────────────────────────────────────
    private boolean isAdmin(User user) {
        return user.getRole() != null
                && user.getRole().getName().equalsIgnoreCase("ADMIN");
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