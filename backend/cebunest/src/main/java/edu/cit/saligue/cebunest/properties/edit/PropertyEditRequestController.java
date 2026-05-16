package edu.cit.saligue.cebunest.properties.edit;

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
@RequiredArgsConstructor
public class PropertyEditRequestController {

    private final PropertyEditRequestService editRequestService;

    // ── Owner: POST /api/properties/{id}/edit-request ────────────────────
    // Called instead of PUT /api/properties/{id} when the property is AVAILABLE or UNAVAILABLE.
    // Saves a snapshot and moves the property to PENDING_EDIT_REVIEW.
    @PostMapping("/api/properties/{id}/edit-request")
    public ResponseEntity<?> submitEditRequest(
            @PathVariable Long id,
            @RequestBody SubmitEditRequestDTO dto,
            @AuthenticationPrincipal User currentUser) {

        if (currentUser == null)
            return err("AUTH-001", "Not authenticated.", HttpStatus.UNAUTHORIZED);

        // Basic validation
        if (dto.getTitle() == null || dto.getTitle().isBlank())
            return err("VALID-001", "Title is required.", HttpStatus.BAD_REQUEST);
        if (dto.getPrice() == null || dto.getPrice() <= 0)
            return err("VALID-001", "Price must be greater than 0.", HttpStatus.BAD_REQUEST);
        if (dto.getLocation() == null || dto.getLocation().isBlank())
            return err("VALID-001", "Location is required.", HttpStatus.BAD_REQUEST);
        if (dto.getTypeId() == null)
            return err("VALID-001", "Property type is required.", HttpStatus.BAD_REQUEST);

        try {
            PropertyEditRequestDTO result = editRequestService.submitEditRequest(id, dto, currentUser);
            return ok(Map.of("editRequest", result));
        } catch (IllegalArgumentException e) {
            return err("BUSINESS-001", e.getMessage(), HttpStatus.BAD_REQUEST);
        } catch (Exception e) {
            return err("SYSTEM-001", e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // ── Admin: GET /api/admin/property-edit-requests ──────────────────────
    @GetMapping("/api/admin/property-edit-requests")
    public ResponseEntity<?> getPendingEditRequests(
            @AuthenticationPrincipal User currentUser) {

        if (!isAdmin(currentUser)) return forbidden();
        try {
            List<PropertyEditRequestDTO> list = editRequestService.getPendingEditRequests();
            return ok(Map.of("editRequests", list, "count", list.size()));
        } catch (Exception e) {
            return err("SYSTEM-001", e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // ── Admin: GET /api/admin/property-edit-requests/{id} ────────────────
    @GetMapping("/api/admin/property-edit-requests/{id}")
    public ResponseEntity<?> getEditRequestDetail(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {

        if (!isAdmin(currentUser)) return forbidden();
        try {
            PropertyEditRequestDTO dto = editRequestService.getEditRequestDetail(id);
            return ok(Map.of("editRequest", dto));
        } catch (IllegalArgumentException e) {
            return err("DB-001", e.getMessage(), HttpStatus.NOT_FOUND);
        } catch (Exception e) {
            return err("SYSTEM-001", e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // ── Admin: PUT /api/admin/property-edit-requests/{id}/decision ────────
    @PutMapping("/api/admin/property-edit-requests/{id}/decision")
    public ResponseEntity<?> reviewEditRequest(
            @PathVariable Long id,
            @RequestBody EditDecisionDTO body,
            @AuthenticationPrincipal User currentUser) {

        if (!isAdmin(currentUser)) return forbidden();

        if (body.getDecision() == null || body.getDecision().isBlank())
            return err("VALID-001", "Decision is required.", HttpStatus.BAD_REQUEST);

        String decision = body.getDecision().toUpperCase();
        if (!decision.equals("APPROVED") && !decision.equals("REJECTED"))
            return err("VALID-001", "Decision must be APPROVED or REJECTED.", HttpStatus.BAD_REQUEST);

        if (decision.equals("REJECTED") && (body.getReason() == null || body.getReason().isBlank()))
            return err("VALID-001", "Rejection reason is required.", HttpStatus.BAD_REQUEST);

        try {
            PropertyEditRequestDTO result = decision.equals("APPROVED")
                    ? editRequestService.approveEditRequest(id, body.getReason(), currentUser)
                    : editRequestService.rejectEditRequest(id, body.getReason(), currentUser);

            return ok(Map.of("editRequest", result));
        } catch (IllegalArgumentException e) {
            return err("BUSINESS-001", e.getMessage(), HttpStatus.BAD_REQUEST);
        } catch (Exception e) {
            e.printStackTrace();
            return err("SYSTEM-001", e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────
    private boolean isAdmin(User u) {
        return u != null && u.getRole() != null
                && u.getRole().getName().equalsIgnoreCase("ADMIN");
    }

    private String ts() {
        return LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME);
    }

    private ResponseEntity<?> ok(Object data) {
        Map<String, Object> b = new HashMap<>();
        b.put("success", true);
        b.put("data", data);
        b.put("error", null);
        b.put("timestamp", ts());
        return ResponseEntity.ok(b);
    }

    private ResponseEntity<?> forbidden() {
        return err("AUTH-002", "Admin access required.", HttpStatus.FORBIDDEN);
    }

    private ResponseEntity<?> err(String code, String msg, HttpStatus status) {
        Map<String, Object> error = new HashMap<>();
        error.put("code", code);
        error.put("message", msg);
        error.put("details", null);
        Map<String, Object> b = new HashMap<>();
        b.put("success", false);
        b.put("data", null);
        b.put("error", error);
        b.put("timestamp", ts());
        return ResponseEntity.status(status).body(b);
    }

    @Data
    public static class EditDecisionDTO {
        private String decision;
        private String reason;
    }
}