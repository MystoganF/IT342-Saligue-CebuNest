package edu.cit.saligue.cebunest.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "password_reset_tokens")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PasswordResetToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String email;

    /**
     * 6-digit numeric code sent to the user's email.
     */
    @Column(nullable = false, length = 6)
    private String code;

    /**
     * Token expires 15 minutes after creation.
     */
    @Column(nullable = false)
    private LocalDateTime expiresAt;

    /**
     * Marks the token as used so it cannot be replayed.
     */
    @Builder.Default
    @Column(nullable = false)
    private boolean used = false;

    @Column(nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}