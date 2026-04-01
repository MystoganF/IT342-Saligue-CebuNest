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

    // ── Primary send — with propertyId ──────────────────────────────────
    @Transactional
    public void send(User user, String type, String message,
                     Long rentalRequestId, Long propertyId) {
        Notification notification = Notification.builder()
                .user(user)
                .type(type)
                .message(message)
                .rentalRequestId(rentalRequestId)
                .propertyId(propertyId)
                .build();
        notificationRepository.save(notification);
    }

    // ── Legacy overload — backward compat, propertyId = null ────────────
    @Transactional
    public void send(User user, String type, String message, Long rentalRequestId) {
        send(user, type, message, rentalRequestId, null);
    }

    @Transactional(readOnly = true)
    public List<NotificationDTO> getForUser(User user) {
        return notificationRepository
                .findByUserIdOrderByCreatedAtDesc(user.getId())
                .stream()
                .map(NotificationDTO::from)
                .toList();
    }

    @Transactional
    public NotificationDTO markRead(Long notificationId, User user) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new IllegalArgumentException("Notification not found."));
        if (!notification.getUser().getId().equals(user.getId()))
            throw new IllegalArgumentException("Not your notification.");
        notification.setRead(true);
        return NotificationDTO.from(notificationRepository.save(notification));
    }

    @Transactional
    public void markAllRead(User user) {
        notificationRepository.markAllReadByUserId(user.getId());
    }
}