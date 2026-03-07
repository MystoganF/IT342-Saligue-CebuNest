package edu.cit.saligue.cebunest.service;

import edu.cit.saligue.cebunest.dto.AuthResponse;
import edu.cit.saligue.cebunest.dto.RegisterRequest;
import edu.cit.saligue.cebunest.dto.UserDTO;
import edu.cit.saligue.cebunest.entity.Role;
import edu.cit.saligue.cebunest.entity.User;
import edu.cit.saligue.cebunest.repository.RoleRepository;
import edu.cit.saligue.cebunest.repository.UserRepository;
import edu.cit.saligue.cebunest.security.JwtUtil;

import edu.cit.saligue.cebunest.dto.AuthResponse;

import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public AuthResponse register(RegisterRequest request) {
        // 1. Validate passwords match
        if (!request.getPassword().equals(request.getConfirmPassword())) {
            throw new IllegalArgumentException("Passwords do not match.");
        }

        // 2. Check for duplicate email
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email is already registered.");
        }

        // 3. Resolve role (default to TENANT if not provided)
        String roleName = (request.getRole() != null) ? request.getRole().toUpperCase() : "TENANT";
        Role role = roleRepository.findByName(roleName)
                .orElseThrow(() -> new IllegalArgumentException("Invalid role: " + roleName));

        // 4. Hash password and save user
        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .phoneNumber(request.getPhoneNumber())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(role)
                .createdAt(LocalDateTime.now())
                .build();

        userRepository.save(user);

        // 5. Generate tokens
        String accessToken = jwtUtil.generateAccessToken(user.getEmail(), roleName);
        String refreshToken = jwtUtil.generateRefreshToken(user.getEmail());

        // 6. Build response (no password exposed)
        UserDTO userDTO = UserDTO.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .phoneNumber(user.getPhoneNumber())
                .role(roleName)
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