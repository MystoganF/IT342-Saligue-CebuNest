package edu.cit.saligue.cebunest.service;

import edu.cit.saligue.cebunest.entity.PasswordResetToken;
import edu.cit.saligue.cebunest.entity.User;
import edu.cit.saligue.cebunest.repository.PasswordResetTokenRepository;
import edu.cit.saligue.cebunest.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class ForgotPasswordService {

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;

    private static final int CODE_LENGTH = 6;
    private static final int EXPIRY_MINUTES = 15;

    // ── Step 1: Request a reset code ──────────────────────────────────────

    /**
     * Generates a 6-digit code, saves it, and emails it.
     * Always returns success even if the email doesn't exist (prevents enumeration).
     */
    @Transactional
    public void requestReset(String email) {
        // Silently skip unknown emails — don't leak account existence
        userRepository.findByEmail(email).ifPresent(user -> {
            // Invalidate any existing unused tokens for this email
            tokenRepository.invalidateAllForEmail(email);

            String code = generateCode();

            PasswordResetToken token = PasswordResetToken.builder()
                    .email(email)
                    .code(code)
                    .expiresAt(LocalDateTime.now().plusMinutes(EXPIRY_MINUTES))
                    .build();

            tokenRepository.save(token);

            String subject = "CebuNest — Your Password Reset Code";
            String body = String.format(
                    "Hi %s,\n\n" +
                            "We received a request to reset your CebuNest password.\n\n" +
                            "Your verification code is:\n\n" +
                            "    %s\n\n" +
                            "This code expires in %d minutes. If you did not request a password reset, " +
                            "you can safely ignore this email.\n\n" +
                            "— The CebuNest Team",
                    user.getName(), code, EXPIRY_MINUTES
            );

            emailService.sendEmail(email, subject, body);
        });
    }

    // ── Step 2: Verify the code ───────────────────────────────────────────

    /**
     * Validates that the code exists, belongs to the email, and is not expired/used.
     * Does NOT mark the token as used yet — that happens on final password reset.
     *
     * @throws IllegalArgumentException with a user-facing message on failure.
     */
    public void verifyCode(String email, String code) {
        PasswordResetToken token = tokenRepository
                .findValidToken(email, code, LocalDateTime.now())
                .orElseThrow(() -> new IllegalArgumentException(
                        "Invalid or expired verification code. Please request a new one."));

        if (token.isUsed()) {
            throw new IllegalArgumentException("This code has already been used. Please request a new one.");
        }
    }

    // ── Step 3: Reset the password ────────────────────────────────────────

    /**
     * Re-validates the code and updates the user's password.
     *
     * @throws IllegalArgumentException with a user-facing message on failure.
     */
    @Transactional
    public void resetPassword(String email, String code, String newPassword) {
        if (newPassword == null || newPassword.length() < 8) {
            throw new IllegalArgumentException("Password must be at least 8 characters.");
        }

        PasswordResetToken token = tokenRepository
                .findValidToken(email, code, LocalDateTime.now())
                .orElseThrow(() -> new IllegalArgumentException(
                        "Invalid or expired verification code. Please request a new one."));

        if (token.isUsed()) {
            throw new IllegalArgumentException("This code has already been used. Please request a new one.");
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Account not found."));

        // Update password
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        // Mark token as used
        token.setUsed(true);
        tokenRepository.save(token);

        // Confirmation email
        String subject = "CebuNest — Your Password Has Been Reset";
        String body = String.format(
                "Hi %s,\n\n" +
                        "Your CebuNest password was successfully reset.\n\n" +
                        "If you did not make this change, please contact our support team immediately.\n\n" +
                        "— The CebuNest Team",
                user.getName()
        );
        emailService.sendEmail(email, subject, body);
    }

    // ── Helpers ───────────────────────────────────────────────────────────

    private String generateCode() {
        SecureRandom random = new SecureRandom();
        int num = 100_000 + random.nextInt(900_000); // Always 6 digits
        return String.valueOf(num);
    }
}