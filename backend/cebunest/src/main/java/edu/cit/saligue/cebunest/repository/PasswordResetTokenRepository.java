package edu.cit.saligue.cebunest.repository;

import edu.cit.saligue.cebunest.entity.PasswordResetToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {

    /**
     * Find a valid (not used, not expired) token matching both email and code.
     */
    @Query("""
        SELECT t FROM PasswordResetToken t
        WHERE t.email = :email
          AND t.code = :code
          AND t.used = false
          AND t.expiresAt > :now
        ORDER BY t.createdAt DESC
        LIMIT 1
    """)
    Optional<PasswordResetToken> findValidToken(
            @Param("email") String email,
            @Param("code") String code,
            @Param("now") LocalDateTime now
    );

    /**
     * Mark all existing tokens for this email as used before issuing a new one.
     * Prevents old codes from remaining valid after a resend.
     */
    @Modifying
    @Query("""
        UPDATE PasswordResetToken t
        SET t.used = true
        WHERE t.email = :email
          AND t.used = false
    """)
    void invalidateAllForEmail(@Param("email") String email);
}