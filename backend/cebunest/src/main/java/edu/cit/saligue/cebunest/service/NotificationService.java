package edu.cit.saligue.cebunest.service;

import edu.cit.saligue.cebunest.dto.AdminBroadcastDTO;
import edu.cit.saligue.cebunest.dto.NotificationDTO;
import edu.cit.saligue.cebunest.entity.AdminBroadcast;
import edu.cit.saligue.cebunest.entity.Notification;
import edu.cit.saligue.cebunest.users.shared.User;
import edu.cit.saligue.cebunest.repository.AdminBroadcastRepository;
import edu.cit.saligue.cebunest.repository.NotificationRepository;
import edu.cit.saligue.cebunest.users.shared.UserRepository;
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
    private final EmailService             emailService; // <-- Injected!

    // Helper to format the email body nicely
    private void dispatchEmail(User user, String type, String message) {
        String subject = "CebuNest Update: " + type.replace("_", " ");
        String body = "Hi " + user.getName() + ",\n\n" +
                message +
                "\n\nLog in to your CebuNest dashboard for more details.\n\n— CebuNest Team";

        emailService.sendEmail(user.getEmail(), subject, body);
    }

    // ── Primary send ──────────────────────────────────
    @Transactional
    public void send(User user, String type, String message,
                     Long rentalRequestId, Long propertyId) {
        notificationRepository.save(Notification.builder()
                .user(user).type(type).message(message)
                .rentalRequestId(rentalRequestId).propertyId(propertyId)
                .build());

        // Automatically send email!
        dispatchEmail(user, type, message);
    }

    @Transactional
    public void send(User user, String type, String message, Long rentalRequestId) {
        send(user, type, message, rentalRequestId, null);
    }

    // ── Admin broadcast ──────
    @Transactional
    public long sendBroadcast(String type, String message,
                              List<String> targetRoles, User sentBy) {
        List<User> targets = userRepository.findByRoleNameInAndActiveTrue(targetRoles);

        List<Notification> notifications = targets.stream()
                .map(u -> Notification.builder()
                        .user(u).type(type).message(message)
                        .rentalRequestId(null).propertyId(null)
                        .build())
                .collect(Collectors.toList());
        notificationRepository.saveAll(notifications);

        broadcastRepository.save(AdminBroadcast.builder()
                .sentBy(sentBy).type(type).message(message)
                .targetRoles(String.join(",", targetRoles))
                .recipientCount(targets.size())
                .build());

        // Automatically email all targets!
        for(User target : targets) {
            dispatchEmail(target, type, message);
        }

        return targets.size();
    }

    @Transactional
    public void sendBroadcast(String type, String message,
                              List<String> targetRoles,
                              UserRepository ignoredRepo) {
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
                .sentBy(null).type(type).message(message)
                .targetRoles(String.join(",", targetRoles))
                .recipientCount(targets.size())
                .build());

        for(User target : targets) {
            dispatchEmail(target, type, message);
        }
    }

    @Transactional(readOnly = true)
    public List<AdminBroadcastDTO> getBroadcastHistory() {
        return broadcastRepository.findAllByOrderBySentAtDesc().stream().map(AdminBroadcastDTO::from).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<NotificationDTO> getForUser(User user) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(user.getId()).stream().map(NotificationDTO::from).collect(Collectors.toList());
    }

    @Transactional
    public NotificationDTO markRead(Long notificationId, User user) {
        Notification n = notificationRepository.findById(notificationId).orElseThrow(() -> new IllegalArgumentException("Notification not found."));
        if (!n.getUser().getId().equals(user.getId())) throw new IllegalArgumentException("Not your notification.");
        n.setRead(true);
        return NotificationDTO.from(notificationRepository.save(n));
    }

    @Transactional
    public void markAllRead(User user) {
        notificationRepository.markAllReadByUserId(user.getId());
    }
}