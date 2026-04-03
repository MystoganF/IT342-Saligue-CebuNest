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

    // ─── Inside GoogleAuthService.java ───

    @Transactional
    public Map<String, Object> processGoogleLogin(String googleAccessToken, String requestedRole) {
        // 1. Fetch profile from Google
        Map<String, Object> googleUser = fetchGoogleProfile(googleAccessToken);
        String email = (String) googleUser.get("email");
        String name = (String) googleUser.get("name");

        if (email == null) throw new IllegalArgumentException("Google identity not found.");

        // 2. LOGIN FLOW (No role provided)
        if (requestedRole == null || requestedRole.isBlank()) {
            if (!userRepository.existsByEmail(email)) {
                return Map.of("requiresRoleSelection", true, "email", email, "name", name);
            }
            return buildTokenMap(userRepository.findByEmail(email).get());
        }

        // 3. REGISTRATION FLOW (Role provided)
        // CRITICAL FIX: If we are here, the user is trying to REGISTER.
        // If they already exist, return the flag and STOP. Do not generate tokens.
        if (userRepository.existsByEmail(email)) {
            return Map.of("alreadyExists", true);
        }

        // 4. Create brand new user
        Role role = roleRepository.findByName(requestedRole.toUpperCase())
                .orElseThrow(() -> new RuntimeException("Role not found."));

        User newUser = userRepository.save(User.builder()
                .name(name != null ? name : email.split("@")[0])
                .email(email)
                .password("GOOGLE_OAUTH_" + UUID.randomUUID())
                .role(role)
                .createdAt(LocalDateTime.now())
                .active(true)
                .build());

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

        return Map.of(
                "user", userDTO,
                "accessToken", accessToken,
                "refreshToken", refreshToken
        );
    }
}