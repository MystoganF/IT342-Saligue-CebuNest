package edu.cit.saligue.cebunest.controller;

import edu.cit.saligue.cebunest.dto.LeaseExtensionRequestDTO;
import edu.cit.saligue.cebunest.entity.User;
import edu.cit.saligue.cebunest.service.LeaseExtensionService;
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
@RequestMapping("/api/lease-extensions")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class LeaseExtensionController {

    private final LeaseExtensionService leaseExtensionService;

    // ── POST /api/lease-extensions — tenant requests extension ──────────
    @PostMapping
    public ResponseEntity<?> requestExtension(
            @RequestBody RequestExtensionDTO body,
            @AuthenticationPrincipal User currentUser
    ) {
        if (currentUser == null)
            return buildError("AUTH-001", "Not authenticated.", HttpStatus.UNAUTHORIZED);
        if (body.getRentalRequestId() == null)
            return buildError("VALID-001", "rentalRequestId is required.", HttpStatus.BAD_REQUEST);
        if (body.getRequestedMonths() == null || body.getRequestedMonths() < 1)
            return buildError("VALID-001", "requestedMonths must be at least 1.", HttpStatus.BAD_REQUEST);
        try {
            LeaseExtensionRequestDTO dto = leaseExtensionService.requestExtension(
                    body.getRentalRequestId(),
                    body.getRequestedMonths(),
                    body.getReason(),
                    currentUser
            );
            return buildSuccess(Map.of("extensionRequest", dto));
        } catch (IllegalArgumentException e) {
            return buildError("BUSINESS-001", e.getMessage(), HttpStatus.BAD_REQUEST);
        } catch (Exception e) {
            e.printStackTrace();
            return buildError("SYSTEM-001", e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // ── PUT /api/lease-extensions/{id}/respond — owner approves/rejects ─
    @PutMapping("/{id}/respond")
    public ResponseEntity<?> respond(
            @PathVariable Long id,
            @RequestBody RespondDTO body,
            @AuthenticationPrincipal User currentUser
    ) {
        if (currentUser == null)
            return buildError("AUTH-001", "Not authenticated.", HttpStatus.UNAUTHORIZED);
        if (body.getDecision() == null || (!body.getDecision().equalsIgnoreCase("APPROVED")
                && !body.getDecision().equalsIgnoreCase("REJECTED")))
            return buildError("VALID-001", "decision must be APPROVED or REJECTED.", HttpStatus.BAD_REQUEST);
        try {
            LeaseExtensionRequestDTO dto = leaseExtensionService.respondToExtension(id, body.getDecision(), currentUser);
            return buildSuccess(Map.of("extensionRequest", dto));
        } catch (IllegalArgumentException e) {
            return buildError("BUSINESS-001", e.getMessage(), HttpStatus.BAD_REQUEST);
        } catch (Exception e) {
            e.printStackTrace();
            return buildError("SYSTEM-001", e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // ── GET /api/lease-extensions/rental/{rentalRequestId} ──────────────
    @GetMapping("/rental/{rentalRequestId}")
    public ResponseEntity<?> getForRental(
            @PathVariable Long rentalRequestId,
            @AuthenticationPrincipal User currentUser
    ) {
        if (currentUser == null)
            return buildError("AUTH-001", "Not authenticated.", HttpStatus.UNAUTHORIZED);
        try {
            List<LeaseExtensionRequestDTO> list = leaseExtensionService.getForRental(rentalRequestId, currentUser);
            return buildSuccess(Map.of("extensionRequests", list));
        } catch (IllegalArgumentException e) {
            return buildError("BUSINESS-001", e.getMessage(), HttpStatus.BAD_REQUEST);
        } catch (Exception e) {
            return buildError("SYSTEM-001", e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // ── Inner DTOs ────────────────────────────────────────────────────────
    @Data
    public static class RequestExtensionDTO {
        private Long    rentalRequestId;
        private Integer requestedMonths;
        private String  reason;
    }

    @Data
    public static class RespondDTO {
        private String decision; // "APPROVED" or "REJECTED"
    }

    // ── Helpers ───────────────────────────────────────────────────────────
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