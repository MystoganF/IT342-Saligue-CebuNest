package edu.cit.saligue.cebunest.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class EmailService {

    public void sendEmail(String to, String subject, String body) {
        // SMTP not configured yet — logs only
        log.info("📧 [EMAIL STUB] To: {} | Subject: {}", to, subject);
        log.info("📧 [EMAIL STUB] Body: {}", body);
    }
}