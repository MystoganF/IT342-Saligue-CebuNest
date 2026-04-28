package edu.cit.saligue.cebunest.notifications.core;

import edu.cit.saligue.cebunest.notifications.shared.Notification;
import edu.cit.saligue.cebunest.notifications.shared.NotificationDTO;
import edu.cit.saligue.cebunest.notifications.shared.NotificationRepository;
import edu.cit.saligue.cebunest.service.EmailService; // Keep here until Infrastructure slice
import edu.cit.saligue.cebunest.users.shared.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final EmailService emailService;

    // ── System Sender Logic (Used by Rentals, Properties, Payments) ──────────

    private void dispatchEmail(User user, String type, String message) {
        String subject = "CebuNest Update: " + type.replace("_", " ");
        String body = "Hi " + user.getName() + ",\n\n" +
                message +
                "\n\nLog in to your CebuNest dashboard for more details.\n\n— CebuNest Team";
        emailService.sendEmail(user.getEmail(), subject, body);
    }

    @Transactional
    public void send(User user, String type, String message, Long rentalRequestId, Long propertyId) {
        notificationRepository.save(Notification.builder()
                .user(user).type(type).message(message)
                .rentalRequestId(rentalRequestId).propertyId(propertyId)
                .build());

        // Automatically send email
        dispatchEmail(user, type, message);
    }

    @Transactional
    public void send(User user, String type, String message, Long rentalRequestId) {
        send(user, type, message, rentalRequestId, null);
    }

    // ── User Inbox Logic (Used by NotificationController) ────────────────────

    @Transactional(readOnly = true)
    public List<NotificationDTO> getForUser(User user) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(user.getId())
                .stream().map(NotificationDTO::from).toList();
    }

    @Transactional
    public NotificationDTO markRead(Long notificationId, User user) {
        Notification n = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new IllegalArgumentException("Notification not found."));

        if (!n.getUser().getId().equals(user.getId()))
            throw new IllegalArgumentException("Not your notification.");

        n.setRead(true);
        return NotificationDTO.from(notificationRepository.save(n));
    }

    @Transactional
    public void markAllRead(User user) {
        notificationRepository.markAllReadByUserId(user.getId());
    }
}