package edu.cit.saligue.cebunest.auth.passwordreset;

import edu.cit.saligue.cebunest.infrastructure.mail.EmailService;
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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ForgotPasswordServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordResetTokenRepository tokenRepository;

    @Mock
    private EmailService emailService;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private ForgotPasswordService forgotPasswordService;

    @Test
    void verifyCode_ExpiredOrInvalidToken_ThrowsException() {
        // Arrange
        // Mock the custom query to return empty, simulating a token that doesn't exist or is expired
        when(tokenRepository.findValidToken(anyString(), anyString(), any()))
                .thenReturn(Optional.empty());

        // Act & Assert
        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> forgotPasswordService.verifyCode("user@test.com", "123456")
        );

        assertEquals("Invalid or expired verification code. Please request a new one.", exception.getMessage());
    }

    @Test
    void verifyCode_UsedToken_ThrowsException() {
        // Arrange
        // Create a token that exists but has already been used
        PasswordResetToken usedToken = PasswordResetToken.builder()
                .email("user@test.com")
                .code("123456")
                .used(true)
                .build();

        when(tokenRepository.findValidToken(anyString(), anyString(), any()))
                .thenReturn(Optional.of(usedToken));

        // Act & Assert
        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> forgotPasswordService.verifyCode("user@test.com", "123456")
        );

        assertEquals("This code has already been used. Please request a new one.", exception.getMessage());
    }

    @Test
    void resetPassword_UsedToken_ThrowsException() {
        // Arrange
        PasswordResetToken usedToken = PasswordResetToken.builder()
                .email("user@test.com")
                .code("123456")
                .used(true)
                .build();

        when(tokenRepository.findValidToken(anyString(), anyString(), any()))
                .thenReturn(Optional.of(usedToken));

        // Act & Assert
        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> forgotPasswordService.resetPassword("user@test.com", "123456", "newSecurePassword123")
        );

        assertEquals("This code has already been used. Please request a new one.", exception.getMessage());
    }
}