package edu.cit.saligue.cebunest.service;

import edu.cit.saligue.cebunest.dto.NotificationDTO;
import edu.cit.saligue.cebunest.entity.Notification;
import edu.cit.saligue.cebunest.entity.User;
import edu.cit.saligue.cebunest.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;

    // ── Called internally by other services ─────────────────────────────

    /**
     * Create and persist a notification for a user.
     *
     * @param user            recipient
     * @param type            e.g. "REQUEST_APPROVED"
     * @param message         human-readable message shown in the bell dropdown
     * @param rentalRequestId the request this links to (may be null)
     */
    @Transactional
    public void send(User user, String type, String message, Long rentalRequestId) {
        Notification notification = Notification.builder()
                .user(user)
                .type(type)
                .message(message)
                .rentalRequestId(rentalRequestId)
                .build();
        notificationRepository.save(notification);
    }

    // ── Tenant: fetch their notifications ───────────────────────────────

    @Transactional(readOnly = true)
    public List<NotificationDTO> getForUser(User user) {
        return notificationRepository
                .findByUserIdOrderByCreatedAtDesc(user.getId())
                .stream()
                .map(NotificationDTO::from)
                .toList();
    }

    // ── Tenant: mark one as read ─────────────────────────────────────────

    @Transactional
    public NotificationDTO markRead(Long notificationId, User user) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new IllegalArgumentException("Notification not found."));

        if (!notification.getUser().getId().equals(user.getId()))
            throw new IllegalArgumentException("Not your notification.");

        notification.setRead(true);
        return NotificationDTO.from(notificationRepository.save(notification));
    }

    // ── Tenant: mark all as read ─────────────────────────────────────────

    @Transactional
    public void markAllRead(User user) {
        notificationRepository.markAllReadByUserId(user.getId());
    }
}