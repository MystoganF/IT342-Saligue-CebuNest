package edu.cit.saligue.cebunest.controller;

import edu.cit.saligue.cebunest.dto.RentalPaymentDTO;
import edu.cit.saligue.cebunest.dto.RentalRequestDTO;
import edu.cit.saligue.cebunest.entity.User;
import edu.cit.saligue.cebunest.service.RentalPaymentService;
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
@RequestMapping("/api/payments")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class RentalPaymentController {

    private final RentalPaymentService rentalPaymentService;

    // ── GET /api/payments/request/{requestId} — get payment schedule ─────
    @GetMapping("/request/{requestId}")
    public ResponseEntity<?> getPayments(
            @PathVariable Long requestId,
            @AuthenticationPrincipal User currentUser
    ) {
        if (currentUser == null)
            return buildError("AUTH-001", "Not authenticated.", HttpStatus.UNAUTHORIZED);
        try {
            List<RentalPaymentDTO> payments =
                    rentalPaymentService.getPaymentsForRequest(requestId, currentUser);
            return buildSuccess(Map.of("payments", payments));
        } catch (IllegalArgumentException e) {
            return buildError("BUSINESS-001", e.getMessage(), HttpStatus.BAD_REQUEST);
        } catch (Exception e) {
            return buildError("SYSTEM-001", e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // ── POST /api/payments/{id}/initiate — create PayMongo link ──────────
    @PostMapping("/{id}/initiate")
    public ResponseEntity<?> initiatePayment(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser
    ) {
        if (currentUser == null)
            return buildError("AUTH-001", "Not authenticated.", HttpStatus.UNAUTHORIZED);
        try {
            RentalPaymentDTO payment = rentalPaymentService.initiatePayment(id, currentUser);
            return buildSuccess(Map.of("payment", payment));
        } catch (IllegalArgumentException e) {
            return buildError("BUSINESS-001", e.getMessage(), HttpStatus.BAD_REQUEST);
        } catch (Exception e) {
            e.printStackTrace();
            return buildError("SYSTEM-001", e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // ── POST /api/payments/{id}/verify — manual / fallback verify ────────
    @PostMapping("/{id}/verify")
    public ResponseEntity<?> verifyPaymentPost(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser
    ) {
        return doVerify(id, currentUser);
    }

    // ── GET /api/payments/{id}/verify — auto-verify on PayMongo redirect ─
    // Called by PropertyDetail on mount when ?payment_id=X&payment=success
    // is present in the URL. Using GET so the frontend can call it without
    // a body and without triggering CORS preflight issues on page load.
    @GetMapping("/{id}/verify")
    public ResponseEntity<?> verifyPaymentGet(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser
    ) {
        return doVerify(id, currentUser);
    }


    @GetMapping("/{id}/cancel")
    public ResponseEntity<?> cancelPayment(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser
    ) {
        if (currentUser == null)
            return buildError("AUTH-001", "Not authenticated.", HttpStatus.UNAUTHORIZED);
        try {
            RentalPaymentDTO payment = rentalPaymentService.cancelPayment(id, currentUser);
            return buildSuccess(Map.of("payment", payment));
        } catch (IllegalArgumentException e) {
            return buildError("BUSINESS-001", e.getMessage(), HttpStatus.BAD_REQUEST);
        } catch (Exception e) {
            e.printStackTrace();
            return buildError("SYSTEM-001", e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    private ResponseEntity<?> doVerify(Long id, User currentUser) {
        if (currentUser == null)
            return buildError("AUTH-001", "Not authenticated.", HttpStatus.UNAUTHORIZED);
        try {
            RentalPaymentDTO payment = rentalPaymentService.verifyPayment(id, currentUser);
            return buildSuccess(Map.of("payment", payment));
        } catch (IllegalArgumentException e) {
            return buildError("BUSINESS-001", e.getMessage(), HttpStatus.BAD_REQUEST);
        } catch (Exception e) {
            e.printStackTrace();
            return buildError("SYSTEM-001", e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // ── POST /api/payments/confirm — tenant confirms approval ─────────────
    @PostMapping("/confirm")
    public ResponseEntity<?> confirmAndChoosePlan(
            @RequestBody ConfirmDTO body,
            @AuthenticationPrincipal User currentUser
    ) {
        if (currentUser == null)
            return buildError("AUTH-001", "Not authenticated.", HttpStatus.UNAUTHORIZED);
        if (body.getRequestId() == null)
            return buildError("VALID-001", "requestId is required.", HttpStatus.BAD_REQUEST);

        try {
            RentalRequestDTO updated = rentalPaymentService.confirmAndChoosePlan(
                    body.getRequestId(), "MONTHLY", currentUser);
            return buildSuccess(Map.of("request", updated));
        } catch (IllegalArgumentException e) {
            return buildError("BUSINESS-001", e.getMessage(), HttpStatus.BAD_REQUEST);
        } catch (Exception e) {
            e.printStackTrace();
            return buildError("SYSTEM-001", e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
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

    // ── Inner DTO ─────────────────────────────────────────────────────────
    @Data
    public static class ConfirmDTO {
        private Long requestId;
    }
}