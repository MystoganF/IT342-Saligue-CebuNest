package edu.cit.saligue.cebunest.auth.google;

import edu.cit.saligue.cebunest.users.shared.UserDTO;
import edu.cit.saligue.cebunest.users.shared.Role;
import edu.cit.saligue.cebunest.users.shared.User;
import edu.cit.saligue.cebunest.users.shared.RoleRepository;
import edu.cit.saligue.cebunest.users.shared.UserRepository;
import edu.cit.saligue.cebunest.auth.shared.JwtUtil;
import edu.cit.saligue.cebunest.service.EmailService;
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
    private final EmailService emailService; // 1. Inject EmailService

    @Transactional
    public Map<String, Object> processGoogleLogin(String googleAccessToken, String requestedRole) {
        Map<String, Object> googleUser = fetchGoogleProfile(googleAccessToken);
        String email = (String) googleUser.get("email");
        String name = (String) googleUser.get("name");

        if (email == null) throw new IllegalArgumentException("Google identity not found.");

        // LOGIN FLOW
        if (requestedRole == null || requestedRole.isBlank()) {
            if (!userRepository.existsByEmail(email)) {
                return Map.of("requiresRoleSelection", true, "email", email, "name", name);
            }
            return buildTokenMap(userRepository.findByEmail(email).get());
        }

        // REGISTRATION FLOW
        if (userRepository.existsByEmail(email)) {
            return Map.of("alreadyExists", true);
        }

        Role role = roleRepository.findByName(requestedRole.toUpperCase())
                .orElseThrow(() -> new RuntimeException("Role not found."));

        // 2. Create brand new user
        User newUser = userRepository.save(User.builder()
                .name(name != null ? name : email.split("@")[0])
                .email(email)
                .password("GOOGLE_OAUTH_" + UUID.randomUUID()) // Secure placeholder
                .role(role)
                .createdAt(LocalDateTime.now())
                .active(true)
                .build());

        // 3. Send the Welcome Email for Google Registration
        sendGoogleWelcomeEmail(newUser, requestedRole.toUpperCase());

        return buildTokenMap(newUser);
    }

    // Helper method for the Google Welcome Email
    private void sendGoogleWelcomeEmail(User user, String roleName) {
        String subject = "Welcome to CebuNest, " + user.getName() + "! 🎉";
        String body = "Hi " + user.getName() + ",\n\n" +
                "Welcome to CebuNest! You have successfully registered using your Google account as a " + roleName + ".\n\n" +
                "Now that your account is set up, you can instantly manage your properties or browse listings " +
                "without needing a separate password.\n\n" +
                "We're happy to have you!\n\n" +
                "— The CebuNest Team";

        emailService.sendEmail(user.getEmail(), subject, body);
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