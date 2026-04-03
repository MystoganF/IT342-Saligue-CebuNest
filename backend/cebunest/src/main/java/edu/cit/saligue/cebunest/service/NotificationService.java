package edu.cit.saligue.cebunest.service;

import edu.cit.saligue.cebunest.dto.AdminBroadcastDTO;
import edu.cit.saligue.cebunest.dto.NotificationDTO;
import edu.cit.saligue.cebunest.entity.AdminBroadcast;
import edu.cit.saligue.cebunest.entity.Notification;
import edu.cit.saligue.cebunest.entity.User;
import edu.cit.saligue.cebunest.repository.AdminBroadcastRepository;
import edu.cit.saligue.cebunest.repository.NotificationRepository;
import edu.cit.saligue.cebunest.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository  notificationRepository;
    private final AdminBroadcastRepository broadcastRepository;
    private final UserRepository           userRepository;

    // ── Primary send — with propertyId ──────────────────────────────────
    @Transactional
    public void send(User user, String type, String message,
                     Long rentalRequestId, Long propertyId) {
        notificationRepository.save(Notification.builder()
                .user(user).type(type).message(message)
                .rentalRequestId(rentalRequestId).propertyId(propertyId)
                .build());
    }

    // ── Legacy overload ──────────────────────────────────────────────────
    @Transactional
    public void send(User user, String type, String message, Long rentalRequestId) {
        send(user, type, message, rentalRequestId, null);
    }

    // ── Admin broadcast — persists history + fans out to recipients ──────
    // Returns recipient count so the controller can include it in the response
    @Transactional
    public long sendBroadcast(String type, String message,
                              List<String> targetRoles, User sentBy) {
        // 1. Find all active users with the target roles
        List<User> targets = userRepository.findByRoleNameInAndActiveTrue(targetRoles);

        // 2. Fan out individual notifications
        List<Notification> notifications = targets.stream()
                .map(u -> Notification.builder()
                        .user(u).type(type).message(message)
                        .rentalRequestId(null).propertyId(null)
                        .build())
                .collect(Collectors.toList());
        notificationRepository.saveAll(notifications);

        // 3. Persist one broadcast record for the admin history panel
        broadcastRepository.save(AdminBroadcast.builder()
                .sentBy(sentBy)
                .type(type)
                .message(message)
                .targetRoles(String.join(",", targetRoles))
                .recipientCount(targets.size())
                .build());

        return targets.size();
    }

    // ── Backward-compat overload (UserRepository param ignored) ─────────
    @Transactional
    public void sendBroadcast(String type, String message,
                              List<String> targetRoles,
                              UserRepository ignoredRepo) {
        // sentBy is unknown in this path — use a minimal call
        sendBroadcastAnonymous(type, message, targetRoles);
    }

    @Transactional
    public void sendBroadcastAnonymous(String type, String message, List<String> targetRoles) {
        List<User> targets = userRepository.findByRoleNameInAndActiveTrue(targetRoles);
        List<Notification> notifications = targets.stream()
                .map(u -> Notification.builder()
                        .user(u).type(type).message(message)
                        .rentalRequestId(null).propertyId(null)
                        .build())
                .collect(Collectors.toList());
        notificationRepository.saveAll(notifications);
        broadcastRepository.save(AdminBroadcast.builder()
                .sentBy(null)
                .type(type)
                .message(message)
                .targetRoles(String.join(",", targetRoles))
                .recipientCount(targets.size())
                .build());
    }

    // ── Admin history ────────────────────────────────────────────────────
    @Transactional(readOnly = true)
    public List<AdminBroadcastDTO> getBroadcastHistory() {
        return broadcastRepository.findAllByOrderBySentAtDesc()
                .stream()
                .map(AdminBroadcastDTO::from)
                .collect(Collectors.toList());
    }

    // ── Per-user notifications ───────────────────────────────────────────
    @Transactional(readOnly = true)
    public List<NotificationDTO> getForUser(User user) {
        return notificationRepository
                .findByUserIdOrderByCreatedAtDesc(user.getId())
                .stream()
                .map(NotificationDTO::from)
                .collect(Collectors.toList());
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