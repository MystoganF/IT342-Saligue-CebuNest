package edu.cit.saligue.cebunest.controller;

import edu.cit.saligue.cebunest.service.GoogleAuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class GoogleAuthController {

    private final GoogleAuthService googleAuthService;

    @PostMapping("/google")
    public ResponseEntity<?> googleLogin(@RequestBody Map<String, String> body) {
        String token = body.get("token");
        String requestedRole = body.get("role");

        if (token == null || token.isBlank()) {
            return err("VALID-001", "Google access token is required.", HttpStatus.BAD_REQUEST);
        }

        try {
            Map<String, Object> result = googleAuthService.processGoogleLogin(token, requestedRole);
            return ok(result);
        } catch (IllegalArgumentException e) {
            return err("AUTH-001", e.getMessage(), HttpStatus.UNAUTHORIZED);
        } catch (Exception e) {
            return err("SYSTEM-001", "Authentication failed.", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    private String ts() { return LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME); }

    private ResponseEntity<?> ok(Object data) {
        Map<String, Object> b = new HashMap<>();
        b.put("success", true); b.put("data", data); b.put("error", null); b.put("timestamp", ts());
        return ResponseEntity.ok(b);
    }

    private ResponseEntity<?> err(String code, String msg, HttpStatus status) {
        Map<String, Object> error = new HashMap<>();
        error.put("code", code); error.put("message", msg);
        Map<String, Object> b = new HashMap<>();
        b.put("success", false); b.put("data", null); b.put("error", error); b.put("timestamp", ts());
        return ResponseEntity.status(status).body(b);
    }
}