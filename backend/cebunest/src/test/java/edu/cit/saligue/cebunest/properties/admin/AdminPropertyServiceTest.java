package edu.cit.saligue.cebunest.properties.admin;

import edu.cit.saligue.cebunest.notifications.core.NotificationService;
import edu.cit.saligue.cebunest.properties.shared.Property;
import edu.cit.saligue.cebunest.properties.shared.PropertyRepository;
import edu.cit.saligue.cebunest.users.shared.User;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminPropertyServiceTest {

    @Mock
    private PropertyRepository propertyRepository;

    @Mock
    private AuditLogRepository auditLogRepository;

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private AdminPropertyService adminPropertyService;

    @Captor
    private ArgumentCaptor<AuditLog> auditLogCaptor;

    @Test
    void updatePropertyStatus_ToRejected_CreatesAuditLogWithReason() {
        // Arrange
        User admin = User.builder().id(99L).name("Admin User").build();
        User owner = User.builder().id(2L).name("Property Owner").build();

        Property pendingProperty = Property.builder()
                .id(100L)
                .title("New Apartment")
                .owner(owner)
                .status(Property.PropertyStatus.PENDING_REVIEW)
                .build();

        when(propertyRepository.findById(100L)).thenReturn(Optional.of(pendingProperty));
        // Mock save to just return the property passed to it
        when(propertyRepository.save(any(Property.class))).thenAnswer(i -> i.getArguments()[0]);

        String rejectionReason = "Missing business permits";

        // Act
        adminPropertyService.updatePropertyStatus(100L, "REJECTED", rejectionReason, admin);

        // Assert
        // 1. Verify property status changed
        assertEquals(Property.PropertyStatus.REJECTED, pendingProperty.getStatus());

        // 2. Capture the AuditLog that was passed into the repository to be saved
        verify(auditLogRepository).save(auditLogCaptor.capture());
        AuditLog savedLog = auditLogCaptor.getValue();

        // 3. Verify the AuditLog details
        assertEquals("PROPERTY_REJECTED", savedLog.getAction());
        assertEquals(rejectionReason, savedLog.getReason());
        assertEquals(100L, savedLog.getTargetId());
        assertEquals("PROPERTY", savedLog.getTargetType());
        assertEquals(admin, savedLog.getAdmin());
    }
}