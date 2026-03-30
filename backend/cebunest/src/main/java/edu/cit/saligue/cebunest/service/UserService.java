package edu.cit.saligue.cebunest.service;

import edu.cit.saligue.cebunest.dto.UpdateProfileRequest;
import edu.cit.saligue.cebunest.dto.UserDTO;
import edu.cit.saligue.cebunest.entity.User;
import edu.cit.saligue.cebunest.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    public UserDTO getById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found."));
        return toDTO(user);
    }

    public UserDTO getByEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found."));
        return toDTO(user);
    }

    public UserDTO updateProfile(Long id, UpdateProfileRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found."));

        if (request.getName() != null && !request.getName().isBlank()) {
            user.setName(request.getName());
        }
        if (request.getPhoneNumber() != null) {
            user.setPhoneNumber(request.getPhoneNumber());
        }
        if (request.getAvatarUrl() != null) {
            user.setAvatarUrl(request.getAvatarUrl());
        }
        if (request.getFacebookUrl() != null) {
            user.setFacebookUrl(request.getFacebookUrl().isBlank() ? null : request.getFacebookUrl().trim());
        }
        if (request.getInstagramUrl() != null) {
            user.setInstagramUrl(request.getInstagramUrl().isBlank() ? null : request.getInstagramUrl().trim());
        }
        if (request.getTwitterUrl() != null) {
            user.setTwitterUrl(request.getTwitterUrl().isBlank() ? null : request.getTwitterUrl().trim());
        }

        userRepository.save(user);
        return toDTO(user);
    }

    private UserDTO toDTO(User user) {
        return UserDTO.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .phoneNumber(user.getPhoneNumber())
                .role(user.getRole().getName())
                .avatarUrl(user.getAvatarUrl())
                .facebookUrl(user.getFacebookUrl())
                .instagramUrl(user.getInstagramUrl())
                .twitterUrl(user.getTwitterUrl())
                .build();
    }
}