package edu.cit.saligue.cebunest.controller;

import edu.cit.saligue.cebunest.dto.AdminBroadcastDTO;
import edu.cit.saligue.cebunest.entity.User;
import edu.cit.saligue.cebunest.service.NotificationService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/notifications")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class AdminNotificationController {

    private final NotificationService notificationService;


    // ── POST /api/admin/notifications/broadcast ───────────────────────────
    @PostMapping("/broadcast")
    public ResponseEntity<?> broadcast(
            @RequestBody BroadcastDTO body,
            @AuthenticationPrincipal User currentUser
    ) {
        if (!isAdmin(currentUser)) return forbidden();
        if (blank(body.getMessage()))
            return bad("VALID-001", "Message is required.");
        if (body.getTargetRoles() == null || body.getTargetRoles().isEmpty())
            return bad("VALID-002", "At least one target role is required.");
        for (String role : body.getTargetRoles()) {
            if (!role.equalsIgnoreCase("OWNER") && !role.equalsIgnoreCase("TENANT"))
                return bad("VALID-003", "Invalid role: " + role + ". Must be OWNER or TENANT.");
        }

        String type = blank(body.getType()) ? "ADMIN_BROADCAST" : body.getType().toUpperCase();

        try {
            // Pass currentUser so the broadcast record knows who sent it
            long recipientCount = notificationService.sendBroadcast(
                    type, body.getMessage(), body.getTargetRoles(), currentUser);

            return ok(Map.of(
                    "message",        "Broadcast sent successfully.",
                    "type",           type,
                    "targetRoles",    body.getTargetRoles(),
                    "recipientCount", recipientCount
            ));
        } catch (Exception e) {
            return err("SYSTEM-001", e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // ── GET /api/admin/notifications/history ─────────────────────────────
    @GetMapping("/history")
    public ResponseEntity<?> getHistory(@AuthenticationPrincipal User currentUser) {
        if (!isAdmin(currentUser)) return forbidden();
        try {
            List<AdminBroadcastDTO> history = notificationService.getBroadcastHistory();
            return ok(Map.of("history", history, "count", history.size()));
        } catch (Exception e) {
            return err("SYSTEM-001", e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // ── Inner DTO ─────────────────────────────────────────────────────────
    @Data
    public static class BroadcastDTO {
        private String       type;
        private String       message;
        private List<String> targetRoles;
    }

    // ── Helpers ───────────────────────────────────────────────────────────
    private boolean isAdmin(User u) {
        return u != null && u.getRole() != null
                && u.getRole().getName().equalsIgnoreCase("ADMIN");
    }
    private boolean blank(String s) { return s == null || s.isBlank(); }
    private String  ts()            { return LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME); }

    private ResponseEntity<?> ok(Object data) {
        Map<String, Object> b = new LinkedHashMap<>();
        b.put("success", true); b.put("data", data); b.put("error", null); b.put("timestamp", ts());
        return ResponseEntity.ok(b);
    }
    private ResponseEntity<?> forbidden() { return err("AUTH-002", "Admin access required.", HttpStatus.FORBIDDEN); }
    private ResponseEntity<?> bad(String code, String msg) { return err(code, msg, HttpStatus.BAD_REQUEST); }
    private ResponseEntity<?> err(String code, String msg, HttpStatus status) {
        Map<String, Object> error = new LinkedHashMap<>();
        error.put("code", code); error.put("message", msg); error.put("details", null);
        Map<String, Object> b = new LinkedHashMap<>();
        b.put("success", false); b.put("data", null); b.put("error", error); b.put("timestamp", ts());
        return ResponseEntity.status(status).body(b);
    }
}