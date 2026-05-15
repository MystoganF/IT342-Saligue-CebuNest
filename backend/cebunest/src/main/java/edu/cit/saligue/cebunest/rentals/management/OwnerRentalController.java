package edu.cit.saligue.cebunest.rentals.management;

import edu.cit.saligue.cebunest.rentals.shared.RentalRequestDTO;
import edu.cit.saligue.cebunest.users.shared.User;
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
@RequestMapping("/api/rental-requests") // Kept as original to avoid frontend breakage
@RequiredArgsConstructor
public class OwnerRentalController {

    private final OwnerRentalService ownerRentalService;

    @GetMapping("/property/{propertyId}")
    public ResponseEntity<?> getRequestsForProperty(@PathVariable Long propertyId, @AuthenticationPrincipal User currentUser) {
        if (currentUser == null) return buildError("AUTH-001", "Not authenticated.", HttpStatus.UNAUTHORIZED);
        try {
            List<RentalRequestDTO> requests = ownerRentalService.getRequestsForProperty(propertyId, currentUser);
            return buildSuccess(Map.of("requests", requests));
        } catch (IllegalArgumentException e) {
            return buildError("BUSINESS-001", e.getMessage(), HttpStatus.BAD_REQUEST);
        } catch (Exception e) {
            return buildError("SYSTEM-001", e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(@PathVariable Long id, @RequestBody StatusUpdateDTO body, @AuthenticationPrincipal User currentUser) {
        if (currentUser == null) return buildError("AUTH-001", "Not authenticated.", HttpStatus.UNAUTHORIZED);
        if (body.getStatus() == null || body.getStatus().isBlank()) return buildError("VALID-001", "Status is required.", HttpStatus.BAD_REQUEST);
        String s = body.getStatus().toUpperCase();
        if (!s.equals("APPROVED") && !s.equals("REJECTED")) return buildError("VALID-001", "Status must be APPROVED or REJECTED.", HttpStatus.BAD_REQUEST);
        try {
            RentalRequestDTO updated = ownerRentalService.updateRequestStatus(id, s, currentUser);
            return buildSuccess(Map.of("request", updated));
        } catch (IllegalArgumentException e) {
            return buildError("BUSINESS-001", e.getMessage(), HttpStatus.BAD_REQUEST);
        } catch (Exception e) {
            return buildError("SYSTEM-001", e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @GetMapping("/property/{propertyId}/active")
    public ResponseEntity<?> getActiveTenant(@PathVariable Long propertyId, @AuthenticationPrincipal User currentUser) {
        if (currentUser == null) return buildError("AUTH-001", "Not authenticated.", HttpStatus.UNAUTHORIZED);
        try {
            RentalRequestDTO active = ownerRentalService.getActiveTenant(propertyId, currentUser);
            return buildSuccess(Map.of("activeTenant", active != null ? active : Map.of()));
        } catch (IllegalArgumentException e) {
            return buildError("BUSINESS-001", e.getMessage(), HttpStatus.BAD_REQUEST);
        } catch (Exception e) {
            return buildError("SYSTEM-001", e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @PutMapping("/{id}/lease")
    public ResponseEntity<?> updateLease(@PathVariable Long id, @RequestBody LeaseUpdateDTO body, @AuthenticationPrincipal User currentUser) {
        if (currentUser == null) return buildError("AUTH-001", "Not authenticated.", HttpStatus.UNAUTHORIZED);
        if (body.getAdjustMonths() == null || body.getAdjustMonths() == 0) return buildError("VALID-001", "adjustMonths must be a non-zero integer.", HttpStatus.BAD_REQUEST);
        try {
            RentalRequestDTO updated = ownerRentalService.updateLease(id, body.getAdjustMonths(), currentUser);
            return buildSuccess(Map.of("request", updated));
        } catch (IllegalArgumentException e) {
            return buildError("BUSINESS-001", e.getMessage(), HttpStatus.BAD_REQUEST);
        } catch (Exception e) {
            return buildError("SYSTEM-001", e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @PutMapping("/{id}/terminate")
    public ResponseEntity<?> terminateLease(@PathVariable Long id, @AuthenticationPrincipal User currentUser) {
        if (currentUser == null) return buildError("AUTH-001", "Not authenticated.", HttpStatus.UNAUTHORIZED);
        try {
            RentalRequestDTO terminated = ownerRentalService.terminateLease(id, currentUser);
            return buildSuccess(Map.of("request", terminated));
        } catch (IllegalArgumentException e) {
            return buildError("BUSINESS-001", e.getMessage(), HttpStatus.BAD_REQUEST);
        } catch (Exception e) {
            return buildError("SYSTEM-001", e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Data
    public static class StatusUpdateDTO { private String status; }

    @Data
    public static class LeaseUpdateDTO { private Integer adjustMonths; }

    // --- Standard Response Builders (omitted for brevity, copy your buildSuccess/buildError here) ---
    private ResponseEntity<?> buildSuccess(Object data) {
        Map<String, Object> body = new HashMap<>();
        body.put("success", true); body.put("data", data); body.put("error", null);
        body.put("timestamp", LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME));
        return ResponseEntity.ok(body);
    }
    private ResponseEntity<?> buildError(String code, String message, HttpStatus status) {
        Map<String, Object> error = new HashMap<>();
        error.put("code", code); error.put("message", message); error.put("details", null);
        Map<String, Object> body = new HashMap<>();
        body.put("success", false); body.put("data", null); body.put("error", error);
        body.put("timestamp", LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME));
        return ResponseEntity.status(status).body(body);
    }
}