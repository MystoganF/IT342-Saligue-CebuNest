package edu.cit.saligue.cebunest.properties.management;

import edu.cit.saligue.cebunest.properties.shared.Property;
import edu.cit.saligue.cebunest.properties.shared.PropertyRepository;
import edu.cit.saligue.cebunest.rentals.shared.RentalRequest;
import edu.cit.saligue.cebunest.rentals.shared.RentalRequestRepository;
import edu.cit.saligue.cebunest.users.shared.User;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PropertyManagementServiceTest {

    @Mock
    private PropertyRepository propertyRepository;

    @Mock
    private RentalRequestRepository rentalRequestRepository;

    @InjectMocks
    private PropertyManagementService propertyManagementService;

    @Test
    void deleteProperty_WithActiveTenant_ThrowsException() {
        // Arrange
        User owner = User.builder().id(1L).build();
        Property property = Property.builder().id(100L).owner(owner).build();

        // Simulate that the property exists and is owned by the caller
        when(propertyRepository.findById(100L)).thenReturn(Optional.of(property));

        // Simulate that an active (CONFIRMED) rental request exists for this property
        RentalRequest activeRental = new RentalRequest();
        when(rentalRequestRepository.findByPropertyIdAndStatus(100L, RentalRequest.RentalStatus.CONFIRMED))
                .thenReturn(Optional.of(activeRental));

        // Act & Assert
        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> propertyManagementService.deleteProperty(100L, owner)
        );

        assertEquals("Cannot delete this property while it has an active tenant. Please end the lease first before deleting.", exception.getMessage());
    }

    @Test
    void updateProperty_AdminDisabledAndAttemptingToMakeAvailable_ThrowsException() {
        // Arrange
        User owner = User.builder().id(1L).build();

        // Simulate a property that was locked by an admin
        Property lockedProperty = Property.builder()
                .id(100L)
                .owner(owner)
                .isAdminDisabled(true)
                .adminNote("Violation of platform terms")
                .build();

        when(propertyRepository.findById(100L)).thenReturn(Optional.of(lockedProperty));

        // Owner attempts to force it back to AVAILABLE via an update
        UpdatePropertyDTO updateRequest = new UpdatePropertyDTO();
        updateRequest.setStatus("AVAILABLE");

        // Act & Assert
        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> propertyManagementService.updateProperty(100L, updateRequest, owner)
        );

        assertEquals("This listing is restricted by an administrator. Reason: Violation of platform terms", exception.getMessage());
    }
}