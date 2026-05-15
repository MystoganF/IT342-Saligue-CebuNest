package edu.cit.saligue.cebunest.rentals.application;

import edu.cit.saligue.cebunest.rentals.shared.RentalRequestDTO;
import edu.cit.saligue.cebunest.users.shared.User;
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
public class TenantRentalController {

    private final TenantRentalService tenantRentalService;

    @PostMapping
    public ResponseEntity<?> createRequest(@RequestBody CreateRentalRequestDTO dto, @AuthenticationPrincipal User currentUser) {
        if (currentUser == null) return buildError("AUTH-001", "Not authenticated.", HttpStatus.UNAUTHORIZED);
        try {
            RentalRequestDTO created = tenantRentalService.createRequest(dto, currentUser);
            return buildSuccess(Map.of("request", created));
        } catch (IllegalArgumentException e) {
            return buildError("BUSINESS-001", e.getMessage(), HttpStatus.BAD_REQUEST);
        } catch (Exception e) {
            return buildError("SYSTEM-001", e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @GetMapping("/my")
    public ResponseEntity<?> getMyRequests(@AuthenticationPrincipal User currentUser) {
        if (currentUser == null) return buildError("AUTH-001", "Not authenticated.", HttpStatus.UNAUTHORIZED);
        try {
            List<RentalRequestDTO> requests = tenantRentalService.getMyRequests(currentUser);
            return buildSuccess(Map.of("requests", requests));
        } catch (Exception e) {
            return buildError("SYSTEM-001", e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @GetMapping("/my/property/{propertyId}")
    public ResponseEntity<?> getMyRequestForProperty(@PathVariable Long propertyId, @AuthenticationPrincipal User currentUser) {
        if (currentUser == null) return buildError("AUTH-001", "Not authenticated.", HttpStatus.UNAUTHORIZED);
        try {
            RentalRequestDTO req = tenantRentalService.getMyRequestForProperty(propertyId, currentUser);
            return buildSuccess(Map.of("request", req != null ? req : Map.of()));
        } catch (Exception e) {
            return buildError("SYSTEM-001", e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

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