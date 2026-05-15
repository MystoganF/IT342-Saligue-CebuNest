package edu.cit.saligue.cebunest.properties.admin;

import edu.cit.saligue.cebunest.notifications.core.NotificationService;
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
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminPropertyDeactivationServiceTest {

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
    void togglePropertyVisibility_DeactivatesAvailableProperty_AndLocksIt() {
        // Arrange
        User admin = User.builder().id(99L).name("Admin").build();
        User owner = User.builder().id(5L).name("Listing Owner").email("owner@test.com").build();

        Property activeProperty = Property.builder()
                .id(300L)
                .title("Policy Violating Listing")
                .owner(owner)
                .status(Property.PropertyStatus.AVAILABLE)
                .isAdminDisabled(false)
                .images(new ArrayList<>())
                .build();

        when(propertyRepository.findById(300L)).thenReturn(Optional.of(activeProperty));
        // No active tenant — deactivation is allowed
        when(rentalRequestRepository.findByPropertyIdAndStatus(300L, RentalRequest.RentalStatus.CONFIRMED))
                .thenReturn(Optional.empty());
        when(propertyRepository.save(any(Property.class))).thenAnswer(i -> i.getArguments()[0]);

        String adminReason = "Listing violates platform housing standards";

        // Act
        adminPropertyService.togglePropertyVisibility(300L, adminReason, admin);

        // Assert
        // 1. Property status must be UNAVAILABLE
        assertEquals(Property.PropertyStatus.UNAVAILABLE, activeProperty.getStatus());

        // 2. Property must be locked — isAdminDisabled = true (owner cannot republish)
        assertTrue(activeProperty.isAdminDisabled());

        // 3. Admin note must be stored with the reason
        assertEquals(adminReason, activeProperty.getAdminNote());

        // 4. Owner must be notified of the administrative deactivation
        verify(notificationService).send(
                eq(owner),
                eq("ADMIN_DEACTIVATION"),
                anyString(),
                any(),
                eq(300L)
        );
    }

    @Test
    void togglePropertyVisibility_BlocksDeactivation_WhenPropertyHasActiveTenant() {
        // Arrange
        User admin = User.builder().id(99L).name("Admin").build();
        User owner = User.builder().id(5L).name("Owner").email("owner@test.com").build();

        Property occupiedProperty = Property.builder()
                .id(301L)
                .title("Occupied Property")
                .owner(owner)
                .status(Property.PropertyStatus.AVAILABLE)
                .images(new ArrayList<>())
                .build();

        when(propertyRepository.findById(301L)).thenReturn(Optional.of(occupiedProperty));

        // Simulate an active tenant currently renting this property
        RentalRequest activeRental = RentalRequest.builder()
                .id(50L)
                .property(occupiedProperty)
                .status(RentalRequest.RentalStatus.CONFIRMED)
                .build();

        when(rentalRequestRepository.findByPropertyIdAndStatus(301L, RentalRequest.RentalStatus.CONFIRMED))
                .thenReturn(Optional.of(activeRental));

        // Act & Assert
        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> adminPropertyService.togglePropertyVisibility(301L, "Some reason", admin)
        );

        // System must block the deactivation attempt
        assertEquals("Cannot toggle visibility: This property has an active tenant.", exception.getMessage());

        // Property status must remain untouched
        assertEquals(Property.PropertyStatus.AVAILABLE, occupiedProperty.getStatus());
        assertFalse(occupiedProperty.isAdminDisabled());
    }
}