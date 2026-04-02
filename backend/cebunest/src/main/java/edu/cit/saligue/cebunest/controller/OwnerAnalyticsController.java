package edu.cit.saligue.cebunest.controller;

import edu.cit.saligue.cebunest.entity.User;
import edu.cit.saligue.cebunest.service.OwnerAnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class OwnerAnalyticsController {

    private final OwnerAnalyticsService analyticsService;

    @GetMapping("/owner")
    public ResponseEntity<?> getOwnerAnalytics(@AuthenticationPrincipal User currentUser) {
        if (currentUser == null)
            return buildError("AUTH-001", "Not authenticated.", HttpStatus.UNAUTHORIZED);

        try {
            Map<String, Object> data = analyticsService.getOwnerAnalytics(currentUser);
            return buildSuccess(data);
        } catch (Exception e) {
            e.printStackTrace();
            return buildError("SYSTEM-001", e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    private ResponseEntity<?> buildSuccess(Object data) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("success", true); body.put("data", data); body.put("error", null);
        body.put("timestamp", LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME));
        return ResponseEntity.ok(body);
    }

    private ResponseEntity<?> buildError(String code, String message, HttpStatus status) {
        Map<String, Object> error = new LinkedHashMap<>();
        error.put("code", code); error.put("message", message); error.put("details", null);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("success", false); body.put("data", null); body.put("error", error);
        body.put("timestamp", LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME));
        return ResponseEntity.status(status).body(body);
    }
}