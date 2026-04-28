package edu.cit.saligue.cebunest.notifications.admin;

import edu.cit.saligue.cebunest.notifications.shared.AdminBroadcast;
import edu.cit.saligue.cebunest.notifications.shared.AdminBroadcastDTO;
import edu.cit.saligue.cebunest.notifications.shared.AdminBroadcastRepository;
import edu.cit.saligue.cebunest.notifications.shared.Notification;
import edu.cit.saligue.cebunest.notifications.shared.NotificationRepository;
import edu.cit.saligue.cebunest.service.EmailService;
import edu.cit.saligue.cebunest.users.shared.User;
import edu.cit.saligue.cebunest.users.shared.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminBroadcastService {

    private final NotificationRepository notificationRepository;
    private final AdminBroadcastRepository broadcastRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;

    private void dispatchEmail(User user, String type, String message) {
        String subject = "CebuNest Update: " + type.replace("_", " ");
        String body = "Hi " + user.getName() + ",\n\n" + message + "\n\n— CebuNest Team";
        emailService.sendEmail(user.getEmail(), subject, body);
    }

    @Transactional
    public long sendBroadcast(String type, String message, List<String> targetRoles, User sentBy) {
        List<User> targets = userRepository.findByRoleNameInAndActiveTrue(targetRoles);

        List<Notification> notifications = targets.stream()
                .map(u -> Notification.builder().user(u).type(type).message(message).build())
                .toList();
        notificationRepository.saveAll(notifications);

        broadcastRepository.save(AdminBroadcast.builder()
                .sentBy(sentBy).type(type).message(message)
                .targetRoles(String.join(",", targetRoles))
                .recipientCount(targets.size())
                .build());

        for (User target : targets) {
            dispatchEmail(target, type, message);
        }

        return targets.size();
    }

    @Transactional(readOnly = true)
    public List<AdminBroadcastDTO> getBroadcastHistory() {
        return broadcastRepository.findAllByOrderBySentAtDesc().stream().map(AdminBroadcastDTO::from).toList();
    }
}