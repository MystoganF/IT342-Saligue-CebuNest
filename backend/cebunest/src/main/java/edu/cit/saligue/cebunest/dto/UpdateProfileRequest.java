package edu.cit.saligue.cebunest.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class UpdateProfileRequest {
    private String name;
    private String phoneNumber;
    private String avatarUrl;
    private String facebookUrl;
    private String instagramUrl;
    private String twitterUrl;


}