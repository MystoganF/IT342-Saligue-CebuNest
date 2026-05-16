package edu.cit.saligue.cebunest.users.admin;

import edu.cit.saligue.cebunest.users.shared.Role;
import edu.cit.saligue.cebunest.users.shared.RoleRepository;
import edu.cit.saligue.cebunest.users.shared.User;
import edu.cit.saligue.cebunest.users.shared.UserDTO;
import edu.cit.saligue.cebunest.users.shared.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminUserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;

    @Transactional(readOnly = true)
    public List<UserDTO> getAllUsers() {
        return userRepository.findAll().stream().map(UserDTO::from).toList();
    }

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

    @Transactional
    public UserDTO adminUpdateRole(Long userId, String roleName) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found."));

        Role role = roleRepository.findByNameIgnoreCase(roleName)
                .orElseThrow(() -> new IllegalArgumentException("Role not found: " + roleName));

        user.setRole(role);
        return UserDTO.from(userRepository.save(user));
    }

    @Transactional
    public UserDTO adminSetActive(Long userId, boolean active) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found."));

        user.setActive(active);
        return UserDTO.from(userRepository.save(user));
    }

    @Transactional
    public void adminDeleteUser(Long userId) {
        if (!userRepository.existsById(userId))
            throw new IllegalArgumentException("User not found.");

        userRepository.deleteById(userId);
    }

    @Transactional
    public UserDTO adminUpdateProfile(Long userId, String name, String phoneNumber,
                                      String facebookUrl, String instagramUrl, String twitterUrl) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found."));
        if (name != null && !name.isBlank()) user.setName(name.trim());
        user.setPhoneNumber(phoneNumber != null ? phoneNumber.trim() : null);
        user.setFacebookUrl(facebookUrl != null ? facebookUrl.trim() : null);
        user.setInstagramUrl(instagramUrl != null ? instagramUrl.trim() : null);
        user.setTwitterUrl(twitterUrl != null ? twitterUrl.trim() : null);
        return UserDTO.from(userRepository.save(user));
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
}