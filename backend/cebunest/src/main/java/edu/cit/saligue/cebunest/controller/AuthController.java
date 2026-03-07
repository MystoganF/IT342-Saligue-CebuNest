package edu.cit.saligue.cebunest.controller;


import edu.cit.saligue.cebunest.dto.AuthResponse;
import edu.cit.saligue.cebunest.dto.RegisterRequest;
import edu.cit.saligue.cebunest.service.AuthService;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173") // tighten this to your frontend URL in production
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        try {
            AuthResponse response = authService.register(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "success", false,
                    "data", (Object) null,
                    "error", Map.of(
                            "code", "VALID-001",
                            "message", e.getMessage(),
                            "details", (Object) null
                    ),
                    "timestamp", LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME)
            ));
        }
    }
}