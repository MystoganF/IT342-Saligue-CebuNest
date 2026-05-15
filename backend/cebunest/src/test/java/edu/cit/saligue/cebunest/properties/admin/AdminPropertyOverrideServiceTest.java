package edu.cit.saligue.cebunest.properties.admin;

import edu.cit.saligue.cebunest.notifications.core.NotificationService;
import edu.cit.saligue.cebunest.properties.management.UpdatePropertyDTO;
import edu.cit.saligue.cebunest.properties.shared.*;
import edu.cit.saligue.cebunest.rentals.shared.RentalRequest;
import edu.cit.saligue.cebunest.rentals.shared.RentalRequestRepository;
import edu.cit.saligue.cebunest.infrastructure.storage.SupabaseStorageService;
import edu.cit.saligue.cebunest.users.shared.User;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminPropertyOverrideServiceTest {

    @Mock
    private PropertyRepository propertyRepository;

    @Mock
    private AuditLogRepository auditLogRepository;

    @Mock
    private RentalRequestRepository rentalRequestRepository;

    @Mock
    private PropertyTypeRepository propertyTypeRepository;

    @Mock
    private PropertyImageRepository propertyImageRepository;

    @Mock
    private SupabaseStorageService storageService;

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private AdminPropertyService adminPropertyService;

    @Test
    void updatePropertyAsAdmin_BypassesOwnerRestriction_AndSavesSuccessfully() {
        // Arrange
        User originalOwner = User.builder().id(10L).name("Original Owner").build();
        User adminUser     = User.builder().id(99L).name("Admin").build();

        PropertyType type = new PropertyType();

        Property existingProperty = Property.builder()
                .id(100L)
                .title("Old Title")
                .description("Old description")
                .price(3000.0)
                .location("Old Location")
                .type(type)
                .owner(originalOwner)
                .status(Property.PropertyStatus.AVAILABLE)
                .images(new ArrayList<>())
                .build();

        // Admin's override payload — different from what the owner set
        UpdatePropertyDTO dto = new UpdatePropertyDTO();
        dto.setTitle("Admin Corrected Title");
        dto.setDescription("Updated by Admin");
        dto.setPrice(5500.0);
        dto.setLocation("New Admin Location");
        dto.setTypeId(1L);
        dto.setBeds(2);
        dto.setBaths(1);
        dto.setSqm(30);

        when(propertyRepository.findById(100L)).thenReturn(Optional.of(existingProperty));
        when(propertyTypeRepository.findById(1L)).thenReturn(Optional.of(type));
        when(rentalRequestRepository.findByPropertyIdAndStatus(100L, RentalRequest.RentalStatus.CONFIRMED))
                .thenReturn(Optional.empty());
        when(propertyRepository.save(any(Property.class))).thenReturn(existingProperty);
        when(propertyRepository.findById(100L)).thenReturn(Optional.of(existingProperty));

        // Act — Admin calls updatePropertyAsAdmin; this bypasses owner identity check
        adminPropertyService.updatePropertyAsAdmin(100L, dto, adminUser);

        // Assert
        // Verify updated values were applied to the entity (Admin bypassed owner check)
        assertEquals("Admin Corrected Title", existingProperty.getTitle());
        assertEquals(5500.0, existingProperty.getPrice());
        assertEquals("New Admin Location", existingProperty.getLocation());

        // Verify the property was saved
        verify(propertyRepository, atLeastOnce()).save(existingProperty);
    }

    @Test
    void updatePropertyStatus_ToApproved_SetsAvailableAndCreatesAuditLog() {
        // Arrange
        User admin = User.builder().id(99L).name("Admin User").build();
        User owner = User.builder().id(2L).name("Property Owner").email("owner@test.com").build();

        Property pendingProperty = Property.builder()
                .id(200L)
                .title("Pending Apartment")
                .owner(owner)
                .status(Property.PropertyStatus.PENDING_REVIEW)
                .images(new ArrayList<>())
                .build();

        when(propertyRepository.findById(200L)).thenReturn(Optional.of(pendingProperty));
        when(propertyRepository.save(any(Property.class))).thenAnswer(i -> i.getArguments()[0]);

        // Act
        adminPropertyService.updatePropertyStatus(200L, "APPROVED", "Looks good", admin);

        // Assert
        // 1. Property status must be AVAILABLE (visible to tenants) after approval
        assertEquals(Property.PropertyStatus.AVAILABLE, pendingProperty.getStatus());

        // 2. An audit log must be created for the APPROVED action
        verify(auditLogRepository).save(any(AuditLog.class));

        // 3. Owner must receive a notification
        verify(notificationService).send(
                eq(owner),
                eq("PROPERTY_APPROVED"),
                anyString(),
                any(),
                eq(200L)
        );
    }
}