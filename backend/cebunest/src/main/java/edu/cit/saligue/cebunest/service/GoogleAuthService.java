package edu.cit.saligue.cebunest.service;

import edu.cit.saligue.cebunest.dto.UserDTO;
import edu.cit.saligue.cebunest.entity.Role;
import edu.cit.saligue.cebunest.entity.User;
import edu.cit.saligue.cebunest.repository.RoleRepository;
import edu.cit.saligue.cebunest.repository.UserRepository;
import edu.cit.saligue.cebunest.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class GoogleAuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final JwtUtil jwtUtil;

    @Transactional
    public Map<String, Object> processGoogleLogin(String googleAccessToken, String requestedRole) {
        // 1. Securely fetch user info from Google using the token
        Map<String, Object> googleUser = fetchGoogleProfile(googleAccessToken);
        String email = (String) googleUser.get("email");
        String name = (String) googleUser.get("name");

        if (email == null) {
            throw new IllegalArgumentException("Invalid token: Could not retrieve email from Google.");
        }

        // 2. Logic: No role provided (Existing Login attempt)
        if (requestedRole == null || requestedRole.isBlank()) {
            if (!userRepository.existsByEmail(email)) {
                return Map.of(
                        "requiresRoleSelection", true,
                        "email", email,
                        "name", name
                );
            }
            User user = userRepository.findByEmail(email).get();
            return buildTokenMap(user);
        }

        // 3. Logic: Role provided (New Registration attempt)
        if (userRepository.existsByEmail(email)) {
            // If they somehow bypass the UI and try to register an existing email
            User user = userRepository.findByEmail(email).get();
            return buildTokenMap(user);
        }

        Role role = roleRepository.findByName(requestedRole.toUpperCase())
                .orElseThrow(() -> new IllegalArgumentException("Role not found: " + requestedRole));

        User newUser = User.builder()
                .name(name != null ? name : email.split("@")[0])
                .email(email)
                .password("GOOGLE_OAUTH_" + UUID.randomUUID()) // Random pass for security
                .role(role)
                .createdAt(LocalDateTime.now())
                .active(true)
                .build();

        userRepository.save(newUser);
        return buildTokenMap(newUser);
    }

    private Map<String, Object> fetchGoogleProfile(String token) {
        RestTemplate restTemplate = new RestTemplate();
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        HttpEntity<String> entity = new HttpEntity<>(headers);

        try {
            ResponseEntity<Map> response = restTemplate.exchange(
                    "https://www.googleapis.com/oauth2/v3/userinfo",
                    HttpMethod.GET,
                    entity,
                    Map.class
            );
            return response.getBody();
        } catch (Exception e) {
            throw new IllegalArgumentException("Google token verification failed.");
        }
    }

    private Map<String, Object> buildTokenMap(User user) {
        String roleName = user.getRole().getName();
        String accessToken = jwtUtil.generateAccessToken(user.getEmail(), roleName);
        String refreshToken = jwtUtil.generateRefreshToken(user.getEmail());

        UserDTO userDTO = UserDTO.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(roleName)
                .avatarUrl(user.getAvatarUrl())
                .build();

        return Map.of("user", userDTO, "accessToken", accessToken, "refreshToken", refreshToken);
    }
}