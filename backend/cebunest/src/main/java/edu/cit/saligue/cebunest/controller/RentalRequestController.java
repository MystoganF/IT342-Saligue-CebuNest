package edu.cit.saligue.cebunest.controller;

import edu.cit.saligue.cebunest.dto.CreateRentalRequestDTO;
import edu.cit.saligue.cebunest.dto.RentalRequestDTO;
import edu.cit.saligue.cebunest.entity.User;
import edu.cit.saligue.cebunest.service.RentalRequestService;
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
@RequestMapping("/api/rental-requests")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class RentalRequestController {

    private final RentalRequestService rentalRequestService;

    // ── POST /api/rental-requests — tenant submits a request ─────────────
    @PostMapping
    public ResponseEntity<?> createRequest(
            @RequestBody CreateRentalRequestDTO dto,
            @AuthenticationPrincipal User currentUser
    ) {
        if (currentUser == null)
            return buildError("AUTH-001", "Not authenticated.", HttpStatus.UNAUTHORIZED);
        try {
            RentalRequestDTO created = rentalRequestService.createRequest(dto, currentUser);
            return buildSuccess(Map.of("request", created));
        } catch (IllegalArgumentException e) {
            return buildError("BUSINESS-001", e.getMessage(), HttpStatus.BAD_REQUEST);
        } catch (Exception e) {
            e.printStackTrace();
            return buildError("SYSTEM-001", e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // ── GET /api/rental-requests/my — tenant views own requests ──────────
    @GetMapping("/my")
    public ResponseEntity<?> getMyRequests(@AuthenticationPrincipal User currentUser) {
        if (currentUser == null)
            return buildError("AUTH-001", "Not authenticated.", HttpStatus.UNAUTHORIZED);
        try {
            List<RentalRequestDTO> requests = rentalRequestService.getMyRequests(currentUser);
            return buildSuccess(Map.of("requests", requests));
        } catch (Exception e) {
            return buildError("SYSTEM-001", e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // ── GET /api/rental-requests/property/{propertyId} — owner views requests
    @GetMapping("/property/{propertyId}")
    public ResponseEntity<?> getRequestsForProperty(
            @PathVariable Long propertyId,
            @AuthenticationPrincipal User currentUser
    ) {
        if (currentUser == null)
            return buildError("AUTH-001", "Not authenticated.", HttpStatus.UNAUTHORIZED);
        try {
            List<RentalRequestDTO> requests =
                    rentalRequestService.getRequestsForProperty(propertyId, currentUser);
            return buildSuccess(Map.of("requests", requests));
        } catch (IllegalArgumentException e) {
            return buildError("BUSINESS-001", e.getMessage(), HttpStatus.BAD_REQUEST);
        } catch (Exception e) {
            return buildError("SYSTEM-001", e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // ── PUT /api/rental-requests/{id}/status — owner approves or rejects ─
    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(
            @PathVariable Long id,
            @RequestBody StatusUpdateDTO body,
            @AuthenticationPrincipal User currentUser
    ) {
        if (currentUser == null)
            return buildError("AUTH-001", "Not authenticated.", HttpStatus.UNAUTHORIZED);

        if (body.getStatus() == null || body.getStatus().isBlank())
            return buildError("VALID-001", "Status is required.", HttpStatus.BAD_REQUEST);

        String s = body.getStatus().toUpperCase();
        if (!s.equals("APPROVED") && !s.equals("REJECTED"))
            return buildError("VALID-001", "Status must be APPROVED or REJECTED.", HttpStatus.BAD_REQUEST);

        try {
            RentalRequestDTO updated = rentalRequestService.updateRequestStatus(id, s, currentUser);
            return buildSuccess(Map.of("request", updated));
        } catch (IllegalArgumentException e) {
            return buildError("BUSINESS-001", e.getMessage(), HttpStatus.BAD_REQUEST);
        } catch (Exception e) {
            e.printStackTrace();
            return buildError("SYSTEM-001", e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // ── Inner DTO ─────────────────────────────────────────────────────────
    @Data
    public static class StatusUpdateDTO {
        private String status;
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

    // ── GET /api/rental-requests/property/{propertyId}/active — owner gets active tenant ──
    @GetMapping("/property/{propertyId}/active")
    public ResponseEntity<?> getActiveTenant(
            @PathVariable Long propertyId,
            @AuthenticationPrincipal User currentUser
    ) {
        if (currentUser == null)
            return buildError("AUTH-001", "Not authenticated.", HttpStatus.UNAUTHORIZED);
        try {
            RentalRequestDTO active = rentalRequestService.getActiveTenant(propertyId, currentUser);
            return buildSuccess(Map.of("activeTenant", active != null ? active : Map.of()));
        } catch (IllegalArgumentException e) {
            return buildError("BUSINESS-001", e.getMessage(), HttpStatus.BAD_REQUEST);
        } catch (Exception e) {
            return buildError("SYSTEM-001", e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // ── PUT /api/rental-requests/{id}/lease — owner extends or reduces lease ──
    @PutMapping("/{id}/lease")
    public ResponseEntity<?> updateLease(
            @PathVariable Long id,
            @RequestBody LeaseUpdateDTO body,
            @AuthenticationPrincipal User currentUser
    ) {
        if (currentUser == null)
            return buildError("AUTH-001", "Not authenticated.", HttpStatus.UNAUTHORIZED);
        if (body.getAdjustMonths() == null || body.getAdjustMonths() == 0)
            return buildError("VALID-001", "adjustMonths must be a non-zero integer.", HttpStatus.BAD_REQUEST);
        try {
            RentalRequestDTO updated = rentalRequestService.updateLease(id, body.getAdjustMonths(), currentUser);
            return buildSuccess(Map.of("request", updated));
        } catch (IllegalArgumentException e) {
            return buildError("BUSINESS-001", e.getMessage(), HttpStatus.BAD_REQUEST);
        } catch (Exception e) {
            e.printStackTrace();
            return buildError("SYSTEM-001", e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // ── PUT /api/rental-requests/{id}/terminate — owner terminates lease ──
    @PutMapping("/{id}/terminate")
    public ResponseEntity<?> terminateLease(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser
    ) {
        if (currentUser == null)
            return buildError("AUTH-001", "Not authenticated.", HttpStatus.UNAUTHORIZED);
        try {
            RentalRequestDTO terminated = rentalRequestService.terminateLease(id, currentUser);
            return buildSuccess(Map.of("request", terminated));
        } catch (IllegalArgumentException e) {
            return buildError("BUSINESS-001", e.getMessage(), HttpStatus.BAD_REQUEST);
        } catch (Exception e) {
            e.printStackTrace();
            return buildError("SYSTEM-001", e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // ── GET /api/rental-requests/my/property/{propertyId} — tenant checks own request ──
    @GetMapping("/my/property/{propertyId}")
    public ResponseEntity<?> getMyRequestForProperty(
            @PathVariable Long propertyId,
            @AuthenticationPrincipal User currentUser
    ) {
        if (currentUser == null)
            return buildError("AUTH-001", "Not authenticated.", HttpStatus.UNAUTHORIZED);
        try {
            RentalRequestDTO req = rentalRequestService.getMyRequestForProperty(propertyId, currentUser);
            return buildSuccess(Map.of("request", req != null ? req : Map.of()));
        } catch (Exception e) {
            return buildError("SYSTEM-001", e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // Add this inner DTO class alongside StatusUpdateDTO:
    @Data
    public static class LeaseUpdateDTO {
        private Integer adjustMonths;
    }
}