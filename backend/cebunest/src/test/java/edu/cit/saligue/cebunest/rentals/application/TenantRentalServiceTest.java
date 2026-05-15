package edu.cit.saligue.cebunest.rentals.application;

import edu.cit.saligue.cebunest.notifications.core.NotificationService;
import edu.cit.saligue.cebunest.properties.shared.Property;
import edu.cit.saligue.cebunest.properties.shared.PropertyRepository;
import edu.cit.saligue.cebunest.rentals.shared.RentalRequestRepository;
import edu.cit.saligue.cebunest.users.shared.User;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TenantRentalServiceTest {

    @Mock
    private RentalRequestRepository rentalRequestRepository;

    @Mock
    private PropertyRepository propertyRepository;

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private TenantRentalService tenantRentalService;

    @Test
    void createRequest_PropertyNotAvailable_ThrowsException() {
        // Arrange
        User tenant = User.builder().id(1L).build();
        CreateRentalRequestDTO dto = new CreateRentalRequestDTO();
        dto.setPropertyId(100L);
        dto.setStartDate(LocalDate.now());
        dto.setLeaseDurationMonths(6);

        // Mock property as UNAVAILABLE
        Property unavailableProperty = Property.builder()
                .id(100L)
                .status(Property.PropertyStatus.UNAVAILABLE)
                .build();

        when(propertyRepository.findById(100L)).thenReturn(Optional.of(unavailableProperty));

        // Act & Assert
        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> tenantRentalService.createRequest(dto, tenant)
        );

        assertEquals("This property is no longer available.", exception.getMessage());
    }

    @Test
    void createRequest_AlreadyRequested_ThrowsException() {
        // Arrange
        User tenant = User.builder().id(1L).build();
        CreateRentalRequestDTO dto = new CreateRentalRequestDTO();
        dto.setPropertyId(100L);

        // Mock property as AVAILABLE
        Property availableProperty = Property.builder()
                .id(100L)
                .status(Property.PropertyStatus.AVAILABLE)
                .build();

        when(propertyRepository.findById(100L)).thenReturn(Optional.of(availableProperty));

        // Mock the database to say "Yes, this tenant already has a pending/approved request here"
        when(rentalRequestRepository.existsByTenantIdAndPropertyIdAndStatusIn(eq(1L), eq(100L), anyList()))
                .thenReturn(true);

        // Act & Assert
        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> tenantRentalService.createRequest(dto, tenant)
        );

        assertEquals("You already have an active request for this property.", exception.getMessage());
    }
}