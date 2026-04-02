package edu.cit.saligue.cebunest.service;

import edu.cit.saligue.cebunest.dto.UpdateProfileRequest;
import edu.cit.saligue.cebunest.dto.UserDTO;
import edu.cit.saligue.cebunest.entity.Role;
import edu.cit.saligue.cebunest.entity.User;
import edu.cit.saligue.cebunest.repository.RoleRepository;
import edu.cit.saligue.cebunest.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;

    // ── Existing ──────────────────────────────────────────────────────────
    public UserDTO getById(Long id) {
        return UserDTO.from(userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found.")));
    }

    public UserDTO getByEmail(String email) {
        return UserDTO.from(userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found.")));
    }

    @Transactional
    public UserDTO updateProfile(Long id, UpdateProfileRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found."));

        if (request.getName() != null && !request.getName().isBlank())
            user.setName(request.getName());
        if (request.getAvatarUrl() != null)
            user.setAvatarUrl(request.getAvatarUrl());

        user.setPhoneNumber(blank(request.getPhoneNumber()) ? null : request.getPhoneNumber().trim());
        user.setFacebookUrl(blank(request.getFacebookUrl()) ? null : request.getFacebookUrl().trim());
        user.setInstagramUrl(blank(request.getInstagramUrl()) ? null : request.getInstagramUrl().trim());
        user.setTwitterUrl(blank(request.getTwitterUrl()) ? null : request.getTwitterUrl().trim());

        return UserDTO.from(userRepository.save(user));
    }

    // ── Admin: list all users ─────────────────────────────────────────────
    @Transactional(readOnly = true)
    public List<UserDTO> getAllUsers() {
        return userRepository.findAll().stream().map(UserDTO::from).toList();
    }

    // ── Admin: create user with role ──────────────────────────────────────
    @Transactional
    public UserDTO adminCreateUser(String name, String email, String password, String roleName) {
        if (userRepository.existsByEmail(email))
            throw new IllegalArgumentException("Email already in use.");

        Role role = roleRepository.findByNameIgnoreCase(roleName)
                .orElseThrow(() -> new IllegalArgumentException("Role not found: " + roleName));

        User user = User.builder()
                .name(name.trim())
                .email(email.trim().toLowerCase())
                .password(password) // caller must pass already-encoded password
                .role(role)
                .active(true)
                .build();

        return UserDTO.from(userRepository.save(user));
    }

    // ── Admin: update role ────────────────────────────────────────────────
    @Transactional
    public UserDTO adminUpdateRole(Long userId, String roleName) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found."));
        Role role = roleRepository.findByNameIgnoreCase(roleName)
                .orElseThrow(() -> new IllegalArgumentException("Role not found: " + roleName));
        user.setRole(role);
        return UserDTO.from(userRepository.save(user));
    }

    // ── Admin: toggle active ──────────────────────────────────────────────
    @Transactional
    public UserDTO adminSetActive(Long userId, boolean active) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found."));
        user.setActive(active);
        return UserDTO.from(userRepository.save(user));
    }

    // ── Admin: delete user ────────────────────────────────────────────────
    @Transactional
    public void adminDeleteUser(Long userId) {
        if (!userRepository.existsById(userId))
            throw new IllegalArgumentException("User not found.");
        userRepository.deleteById(userId);
    }

    @Transactional
    public UserDTO adminUpdateEmail(Long userId, String newEmail) {
        String trimmed = newEmail.trim().toLowerCase();
        if (userRepository.existsByEmail(trimmed))
            throw new IllegalArgumentException("Email already in use.");
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found."));
        user.setEmail(trimmed);
        return UserDTO.from(userRepository.save(user));
    }

    private boolean blank(String s) { return s == null || s.isBlank(); }
}