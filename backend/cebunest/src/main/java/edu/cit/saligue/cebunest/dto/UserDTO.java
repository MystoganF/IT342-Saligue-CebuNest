package edu.cit.saligue.cebunest.dto;

import edu.cit.saligue.cebunest.entity.User;
import lombok.Builder;
import lombok.Data;

import java.time.format.DateTimeFormatter;

@Data
@Builder
public class UserDTO {
    private Long   id;
    private String name;
    private String email;
    private String phoneNumber;
    private String role;
    private String avatarUrl;
    private String facebookUrl;
    private String instagramUrl;
    private String twitterUrl;
    private boolean active;
    private String createdAt;

    public static UserDTO from(User u) {
        return UserDTO.builder()
                .id(u.getId())
                .name(u.getName())
                .email(u.getEmail())
                .phoneNumber(u.getPhoneNumber())
                .role(u.getRole() != null ? u.getRole().getName() : null)
                .avatarUrl(u.getAvatarUrl())
                .facebookUrl(u.getFacebookUrl())
                .instagramUrl(u.getInstagramUrl())
                .twitterUrl(u.getTwitterUrl())
                .active(u.isActive())
                .createdAt(u.getCreatedAt() != null
                        ? u.getCreatedAt().format(DateTimeFormatter.ISO_DATE_TIME) : null)
                .build();
    }
}