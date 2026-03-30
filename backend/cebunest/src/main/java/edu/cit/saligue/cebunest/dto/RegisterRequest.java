package edu.cit.saligue.cebunest.dto;

import lombok.Data;

@Data
public class RegisterRequest {
    private String name;
    private String email;
    private String phoneNumber;
    private String password;
    private String confirmPassword;
    private String role;
    private String facebookUrl;
    private String instagramUrl;
    private String twitterUrl;
}