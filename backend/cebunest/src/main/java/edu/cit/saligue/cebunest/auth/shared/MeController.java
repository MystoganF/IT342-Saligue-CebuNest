package edu.cit.saligue.cebunest.auth.shared;

import edu.cit.saligue.cebunest.users.profile.ProfileService;
import edu.cit.saligue.cebunest.users.shared.UserDTO;
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
public class MeController {

    private final JwtUtil jwtUtil;
    private final ProfileService profileService;

    @GetMapping("/me")
    public ResponseEntity<?> me(@RequestHeader("Authorization") String authHeader) {
        try {
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                return buildError("AUTH-002", "Missing or invalid token.", HttpStatus.UNAUTHORIZED);
            }

            String token = authHeader.substring(7);
            String email = jwtUtil.extractEmail(token);

            UserDTO user = profileService.getByEmail(email);

            Map<String, Object> resp = new HashMap<>();
            resp.put("success", true);
            resp.put("data", Map.of("user", user));
            resp.put("error", null);
            resp.put("timestamp", LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME));
            return ResponseEntity.ok(resp);

        } catch (Exception e) {
            return buildError("AUTH-001", "Invalid or expired token.", HttpStatus.UNAUTHORIZED);
        }
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