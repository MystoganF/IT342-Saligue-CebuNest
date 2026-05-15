package edu.cit.saligue.cebunest.auth.register;

import edu.cit.saligue.cebunest.auth.shared.AuthResponse;
import edu.cit.saligue.cebunest.auth.shared.JwtUtil;
import edu.cit.saligue.cebunest.users.shared.UserDTO;
import edu.cit.saligue.cebunest.users.shared.Role;
import edu.cit.saligue.cebunest.users.shared.User;
import edu.cit.saligue.cebunest.users.shared.RoleRepository;
import edu.cit.saligue.cebunest.users.shared.UserRepository;
import edu.cit.saligue.cebunest.infrastructure.mail.EmailService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
public class RegisterService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final EmailService emailService;

    public AuthResponse register(RegisterRequest request) {
        if (!request.getPassword().equals(request.getConfirmPassword())) {
            throw new IllegalArgumentException("Passwords do not match.");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email is already registered.");
        }

        String roleName = (request.getRole() != null) ? request.getRole().toUpperCase() : "TENANT";

        Role role = roleRepository.findByName(roleName)
                .orElseThrow(() -> new IllegalArgumentException("Invalid role: " + roleName));

        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .phoneNumber(request.getPhoneNumber())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(role)
                .createdAt(LocalDateTime.now())
                .facebookUrl(request.getFacebookUrl())
                .instagramUrl(request.getInstagramUrl())
                .twitterUrl(request.getTwitterUrl())
                .build();

        userRepository.save(user);

        // Send the Welcome Email
        sendWelcomeEmail(user, roleName);

        return buildAuthResponse(user, roleName);
    }

    private void sendWelcomeEmail(User user, String roleName) {
        String subject = "Welcome to CebuNest, " + user.getName() + "! 🎉";
        String body = "Hi " + user.getName() + ",\n\n" +
                "Welcome to CebuNest! Your account has been successfully created as a " + roleName + ".\n\n" +
                "You can now log in to browse listings, submit rental requests, and manage your properties " +
                "all in one place.\n\n" +
                "We're excited to have you with us!\n\n" +
                "— The CebuNest Team";

        emailService.sendEmail(user.getEmail(), subject, body);
    }

    private AuthResponse buildAuthResponse(User user, String roleName) {
        String accessToken  = jwtUtil.generateAccessToken(user.getEmail(), roleName);
        String refreshToken = jwtUtil.generateRefreshToken(user.getEmail());

        UserDTO userDTO = UserDTO.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .phoneNumber(user.getPhoneNumber())
                .role(roleName)
                .avatarUrl(user.getAvatarUrl())
                .facebookUrl(user.getFacebookUrl())
                .instagramUrl(user.getInstagramUrl())
                .twitterUrl(user.getTwitterUrl())
                .build();

        return AuthResponse.builder()
                .success(true)
                .data(AuthResponse.AuthData.builder()
                        .user(userDTO)
                        .accessToken(accessToken)
                        .refreshToken(refreshToken)
                        .build())
                .error(null)
                .timestamp(LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME))
                .build();
    }
}