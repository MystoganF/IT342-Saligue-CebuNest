package edu.cit.saligue.cebunest.users.profile;

import edu.cit.saligue.cebunest.service.SupabaseStorageService; // Still in the old folder for now
import edu.cit.saligue.cebunest.users.shared.User;
import edu.cit.saligue.cebunest.users.shared.UserDTO;
import edu.cit.saligue.cebunest.users.shared.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@Service
@RequiredArgsConstructor
public class ProfileService {

    private final UserRepository userRepository;
    private final SupabaseStorageService storageService;

    @Transactional(readOnly = true)
    public UserDTO getById(Long id) {
        return UserDTO.from(userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found.")));
    }

    @Transactional(readOnly = true)
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

    // ── NEW: Avatar logic cleanly moved to the service ──
    @Transactional
    public UserDTO uploadAvatar(Long id, MultipartFile file) throws IOException {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found."));

        // Upload to Supabase and get the URL
        String avatarUrl = storageService.uploadAvatar(id, file);

        // Update the user entity
        user.setAvatarUrl(avatarUrl);

        // Save and return the updated DTO
        return UserDTO.from(userRepository.save(user));
    }

    private boolean blank(String s) { return s == null || s.isBlank(); }
}