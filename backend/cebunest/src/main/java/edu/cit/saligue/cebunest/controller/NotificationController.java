package edu.cit.saligue.cebunest.controller;

import edu.cit.saligue.cebunest.dto.NotificationDTO;
import edu.cit.saligue.cebunest.entity.User;
import edu.cit.saligue.cebunest.service.NotificationService;
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
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173", allowedHeaders = "*", methods = {
        org.springframework.web.bind.annotation.RequestMethod.GET,
        org.springframework.web.bind.annotation.RequestMethod.POST,
        org.springframework.web.bind.annotation.RequestMethod.PATCH,
        org.springframework.web.bind.annotation.RequestMethod.PUT,
        org.springframework.web.bind.annotation.RequestMethod.DELETE,
        org.springframework.web.bind.annotation.RequestMethod.OPTIONS
})
public class NotificationController {

    private final NotificationService notificationService;

    // ── GET /api/notifications — fetch all for current user ─────────────
    @GetMapping
    public ResponseEntity<?> getAll(@AuthenticationPrincipal User currentUser) {
        if (currentUser == null)
            return buildError("AUTH-001", "Not authenticated.", HttpStatus.UNAUTHORIZED);
        try {
            List<NotificationDTO> notifications = notificationService.getForUser(currentUser);
            return buildSuccess(Map.of("notifications", notifications));
        } catch (Exception e) {
            return buildError("SYSTEM-001", e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // ── PATCH /api/notifications/{id}/read — mark one as read ───────────
    @PatchMapping("/{id}/read")
    public ResponseEntity<?> markRead(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser
    ) {
        if (currentUser == null)
            return buildError("AUTH-001", "Not authenticated.", HttpStatus.UNAUTHORIZED);
        try {
            NotificationDTO updated = notificationService.markRead(id, currentUser);
            return buildSuccess(Map.of("notification", updated));
        } catch (IllegalArgumentException e) {
            return buildError("BUSINESS-001", e.getMessage(), HttpStatus.BAD_REQUEST);
        } catch (Exception e) {
            return buildError("SYSTEM-001", e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // ── PATCH /api/notifications/read-all — mark all as read ────────────
    @PatchMapping("/read-all")
    public ResponseEntity<?> markAllRead(@AuthenticationPrincipal User currentUser) {
        if (currentUser == null)
            return buildError("AUTH-001", "Not authenticated.", HttpStatus.UNAUTHORIZED);
        try {
            notificationService.markAllRead(currentUser);
            return buildSuccess(Map.of("message", "All notifications marked as read."));
        } catch (Exception e) {
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
}