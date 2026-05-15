package edu.cit.saligue.cebunest.auth.login;

import edu.cit.saligue.cebunest.auth.shared.JwtUtil;
import edu.cit.saligue.cebunest.users.shared.User;
import edu.cit.saligue.cebunest.users.shared.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LoginServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtUtil jwtUtil;

    @InjectMocks
    private LoginService loginService;

    @Test
    void login_DeactivatedUser_ThrowsException() {
        // Arrange
        String email = "tenant@test.com";
        String rawPassword = "password123";
        String encodedPassword = "encodedPassword123";

        LoginRequest request = new LoginRequest(email, rawPassword);

        // Create a user that is explicitly set to inactive
        User inactiveUser = User.builder()
                .email(email)
                .password(encodedPassword)
                .active(false)
                .build();

        // Mock the repository to return our inactive user
        when(userRepository.findByEmail(email)).thenReturn(Optional.of(inactiveUser));

        // Mock the password encoder to simulate a correct password guess
        when(passwordEncoder.matches(rawPassword, encodedPassword)).thenReturn(true);

        // Act & Assert
        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> loginService.login(request)
        );

        // Verify the exact error message defined in LoginService
        assertEquals("Your account has been deactivated.", exception.getMessage());
    }
}