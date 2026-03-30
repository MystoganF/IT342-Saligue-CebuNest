package edu.cit.saligue.cebunest.controller;

import edu.cit.saligue.cebunest.dto.CreateReviewDTO;
import edu.cit.saligue.cebunest.dto.PropertyReviewDTO;
import edu.cit.saligue.cebunest.entity.User;
import edu.cit.saligue.cebunest.service.PropertyReviewService;
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
@RequestMapping("/api/property-reviews")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class PropertyReviewController {

    private final PropertyReviewService reviewService;

    // ── POST /api/property-reviews — tenant submits a review ─────────────
    @PostMapping
    public ResponseEntity<?> createReview(
            @RequestBody CreateReviewDTO dto,
            @AuthenticationPrincipal User currentUser
    ) {
        if (currentUser == null)
            return buildError("AUTH-001", "Not authenticated.", HttpStatus.UNAUTHORIZED);

        if (dto.getRentalRequestId() == null)
            return buildError("VALID-001", "Rental request ID is required.", HttpStatus.BAD_REQUEST);

        try {
            PropertyReviewDTO created = reviewService.createReview(dto, currentUser);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(buildSuccessBody(Map.of("review", created)));
        } catch (IllegalArgumentException e) {
            return buildError("BUSINESS-001", e.getMessage(), HttpStatus.BAD_REQUEST);
        } catch (Exception e) {
            e.printStackTrace();
            return buildError("SYSTEM-001", e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // ── GET /api/property-reviews/property/{propertyId} — public ─────────
    @GetMapping("/property/{propertyId}")
    public ResponseEntity<?> getReviewsForProperty(@PathVariable Long propertyId) {
        try {
            List<PropertyReviewDTO> reviews = reviewService.getReviewsForProperty(propertyId);
            return ResponseEntity.ok(buildSuccessBody(Map.of("reviews", reviews)));
        } catch (IllegalArgumentException e) {
            return buildError("DB-001", e.getMessage(), HttpStatus.NOT_FOUND);
        } catch (Exception e) {
            return buildError("SYSTEM-001", e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────
    private Map<String, Object> buildSuccessBody(Object data) {
        Map<String, Object> body = new HashMap<>();
        body.put("success",   true);
        body.put("data",      data);
        body.put("error",     null);
        body.put("timestamp", LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME));
        return body;
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