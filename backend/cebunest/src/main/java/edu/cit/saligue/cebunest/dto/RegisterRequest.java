package edu.cit.saligue.cebunest.dto;

import lombok.Data;

@Data
public class RegisterRequest {
    private String name;
    private String phoneNumber;
    private String email;
    private String password;
    private String confirmPassword;
    private String role; // "TENANT" or "OWNER"
}