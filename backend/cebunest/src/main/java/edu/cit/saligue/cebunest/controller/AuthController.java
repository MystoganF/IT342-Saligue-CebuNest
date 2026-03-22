package edu.cit.saligue.cebunest.controller;

import edu.cit.saligue.cebunest.dto.AuthResponse;
import edu.cit.saligue.cebunest.dto.LoginRequest;
import edu.cit.saligue.cebunest.dto.RegisterRequest;
import edu.cit.saligue.cebunest.dto.UserDTO;
import edu.cit.saligue.cebunest.security.JwtUtil;
import edu.cit.saligue.cebunest.service.AuthService;
import edu.cit.saligue.cebunest.service.UserService;
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
public class AuthController {

    private final AuthService authService;
    private final UserService userService;
    private final JwtUtil jwtUtil;

    @GetMapping("/me")
    public ResponseEntity<?> me(@RequestHeader("Authorization") String authHeader) {
        try {
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                return buildError("AUTH-002", "Missing or invalid token.", HttpStatus.UNAUTHORIZED);
            }
            String token = authHeader.substring(7);
            String email = jwtUtil.extractEmail(token);      // use whatever your JwtUtil method is named
            UserDTO user = userService.getByEmail(email);

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

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        try {
            AuthResponse response = authService.register(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (IllegalArgumentException e) {
            return buildError("VALID-001", e.getMessage(), HttpStatus.BAD_REQUEST);
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        try {
            AuthResponse response = authService.login(request);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return buildError("AUTH-001", e.getMessage(), HttpStatus.UNAUTHORIZED);
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