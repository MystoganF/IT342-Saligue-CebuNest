package edu.cit.saligue.cebunest.service;

import edu.cit.saligue.cebunest.entity.User;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Notification stub — logs to console now.
 * Replace the body of notify() with email/push/DB logic later.
 */
@Service
@RequiredArgsConstructor
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

    public void notify(User recipient, String subject, String message) {
        // TODO: replace with email (JavaMailSender) or push notification
        log.info("[NOTIFICATION] To: {} <{}> | Subject: {} | Message: {}",
                recipient.getName(), recipient.getEmail(), subject, message);
    }
}