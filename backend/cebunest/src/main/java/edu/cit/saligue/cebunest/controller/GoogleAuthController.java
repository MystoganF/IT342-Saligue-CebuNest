package edu.cit.saligue.cebunest.controller;

import edu.cit.saligue.cebunest.dto.AuthResponse;
import edu.cit.saligue.cebunest.dto.UserDTO;
import edu.cit.saligue.cebunest.entity.Role;
import edu.cit.saligue.cebunest.entity.User;
import edu.cit.saligue.cebunest.repository.RoleRepository;
import edu.cit.saligue.cebunest.repository.UserRepository;
import edu.cit.saligue.cebunest.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;


@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class GoogleAuthController {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final JwtUtil jwtUtil;

    private ResponseEntity<?> buildError(String code, String message, HttpStatus status) {
        Map<String, Object> error = new HashMap<>();
        error.put("code", code);
        error.put("message", message);

        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("data", null);
        response.put("error", error);
        response.put("timestamp", LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME));

        return new ResponseEntity<>(response, status);
    }

    @PostMapping("/google")
    public ResponseEntity<?> googleLogin(@RequestBody Map<String, String> body) {
        String email        = body.get("email");
        String name         = body.get("name");
        String requestedRole = body.get("role"); // null means "check only"

        if (email == null || email.isBlank()) {
            return buildError("VALID-001", "Email is required.", HttpStatus.BAD_REQUEST);
        }

        try {
            // If no role provided, just check if user exists
            if (requestedRole == null || requestedRole.isBlank()) {
                boolean exists = userRepository.existsByEmail(email);
                if (!exists) {
                    // Signal frontend to show role picker
                    Map<String, Object> data = new HashMap<>();
                    data.put("requiresRoleSelection", true);
                    data.put("email", email);
                    data.put("name", name);

                    Map<String, Object> resp = new HashMap<>();
                    resp.put("success", true);
                    resp.put("data", data);
                    resp.put("error", null);
                    resp.put("timestamp", LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME));
                    return ResponseEntity.ok(resp);
                }
                // Existing user — log them in
                User user = userRepository.findByEmail(email).get();
                return buildTokenResponse(user);
            }

            // Role provided — check if user already exists first
            if (userRepository.existsByEmail(email)) {
                Map<String, Object> data = new HashMap<>();
                data.put("alreadyExists", true);

                Map<String, Object> resp = new HashMap<>();
                resp.put("success", true);
                resp.put("data", data);
                resp.put("error", null);
                resp.put("timestamp", LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME));
                return ResponseEntity.ok(resp);
            }

            // Brand new user — create and return tokens
            Role role = roleRepository.findByName(requestedRole.toUpperCase())
                    .orElseThrow(() -> new RuntimeException("Role not found."));
            User newUser = userRepository.save(User.builder()
                    .name(name != null ? name : email.split("@")[0])
                    .email(email)
                    .password("GOOGLE_OAUTH_" + UUID.randomUUID())
                    .role(role)
                    .createdAt(LocalDateTime.now())
                    .build());

            return buildTokenResponse(newUser);

        } catch (Exception e) {
            return buildError("SYSTEM-001", e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    private ResponseEntity<?> buildTokenResponse(User user) {
        String roleName     = user.getRole().getName();
        String accessToken  = jwtUtil.generateAccessToken(user.getEmail(), roleName);
        String refreshToken = jwtUtil.generateRefreshToken(user.getEmail());

        UserDTO userDTO = UserDTO.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(roleName)
                .avatarUrl(user.getAvatarUrl())
                .build();

        AuthResponse response = AuthResponse.builder()
                .success(true)
                .data(AuthResponse.AuthData.builder()
                        .user(userDTO)
                        .accessToken(accessToken)
                        .refreshToken(refreshToken)
                        .build())
                .error(null)
                .timestamp(LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME))
                .build();

        return ResponseEntity.ok(response);
    }
}
