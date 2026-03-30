package edu.cit.saligue.cebunest.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UserDTO {
    private Long id;
    private String name;
    private String email;
    private String phoneNumber;
    private String role;
    private String avatarUrl;
    private String facebookUrl;
    private String instagramUrl;
    private String twitterUrl;
}