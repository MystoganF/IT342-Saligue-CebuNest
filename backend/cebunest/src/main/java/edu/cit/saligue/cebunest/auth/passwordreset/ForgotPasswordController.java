package edu.cit.saligue.cebunest.auth.passwordreset;

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
public class ForgotPasswordController {

    private final ForgotPasswordService forgotPasswordService;

    // ── Step 1: Request reset code ────────────────────────────────────────

    /**
     * POST /api/auth/forgot-password
     * Body: { "email": "user@example.com" }
     *
     * Always returns 200 to prevent email enumeration.
     */
    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> body) {
        String email = body.get("email");

        if (email == null || email.isBlank()) {
            return buildError("VALID-001", "Email is required.", HttpStatus.BAD_REQUEST);
        }

        // Fire-and-forget — service silently skips unknown emails
        forgotPasswordService.requestReset(email.trim().toLowerCase());

        return buildSuccess(
                Map.of("message", "If an account with that email exists, a reset code has been sent."),
                HttpStatus.OK
        );
    }

    // ── Step 2: Verify the code ───────────────────────────────────────────

    /**
     * POST /api/auth/verify-reset-code
     * Body: { "email": "user@example.com", "code": "123456" }
     */
    @PostMapping("/verify-reset-code")
    public ResponseEntity<?> verifyCode(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String code  = body.get("code");

        if (email == null || email.isBlank()) {
            return buildError("VALID-001", "Email is required.", HttpStatus.BAD_REQUEST);
        }
        if (code == null || code.isBlank()) {
            return buildError("VALID-001", "Verification code is required.", HttpStatus.BAD_REQUEST);
        }

        try {
            forgotPasswordService.verifyCode(email.trim().toLowerCase(), code.trim());
            return buildSuccess(Map.of("message", "Code verified successfully."), HttpStatus.OK);
        } catch (IllegalArgumentException e) {
            return buildError("AUTH-003", e.getMessage(), HttpStatus.BAD_REQUEST);
        }
    }

    // ── Step 3: Reset the password ────────────────────────────────────────

    /**
     * POST /api/auth/reset-password
     * Body: { "email": "user@example.com", "code": "123456", "newPassword": "..." }
     */
    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> body) {
        String email       = body.get("email");
        String code        = body.get("code");
        String newPassword = body.get("newPassword");

        if (email == null || email.isBlank()) {
            return buildError("VALID-001", "Email is required.", HttpStatus.BAD_REQUEST);
        }
        if (code == null || code.isBlank()) {
            return buildError("VALID-001", "Verification code is required.", HttpStatus.BAD_REQUEST);
        }
        if (newPassword == null || newPassword.isBlank()) {
            return buildError("VALID-001", "New password is required.", HttpStatus.BAD_REQUEST);
        }

        try {
            forgotPasswordService.resetPassword(
                    email.trim().toLowerCase(),
                    code.trim(),
                    newPassword
            );
            return buildSuccess(Map.of("message", "Password has been reset successfully."), HttpStatus.OK);
        } catch (IllegalArgumentException e) {
            return buildError("AUTH-003", e.getMessage(), HttpStatus.BAD_REQUEST);
        }
    }

    // ── Response builders (matching AuthController pattern) ───────────────

    private ResponseEntity<?> buildSuccess(Object data, HttpStatus status) {
        Map<String, Object> resp = new HashMap<>();
        resp.put("success", true);
        resp.put("data", data);
        resp.put("error", null);
        resp.put("timestamp", LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME));
        return ResponseEntity.status(status).body(resp);
    }

    private ResponseEntity<?> buildError(String code, String message, HttpStatus status) {
        Map<String, Object> error = new HashMap<>();
        error.put("code", code);
        error.put("message", message);
        error.put("details", null);

        Map<String, Object> body = new HashMap<>();
        body.put("success", false);
        body.put("data", null);
        body.put("error", error);
        body.put("timestamp", LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME));
        return ResponseEntity.status(status).body(body);
    }
}