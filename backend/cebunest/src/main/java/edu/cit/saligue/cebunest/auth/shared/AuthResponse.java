package edu.cit.saligue.cebunest.auth.shared;

import edu.cit.saligue.cebunest.users.shared.UserDTO;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {
    private boolean success;
    private AuthData data;
    private Object error;
    private String timestamp;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AuthData {
        private UserDTO user;
        private String accessToken;
        private String refreshToken;
    }
}