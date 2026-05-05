package edu.cit.saligue.cebunest.rentals.management;

import edu.cit.saligue.cebunest.notifications.core.NotificationService;
import edu.cit.saligue.cebunest.properties.shared.Property;
import edu.cit.saligue.cebunest.properties.shared.PropertyRepository;
import edu.cit.saligue.cebunest.rentals.shared.RentalRequest;
import edu.cit.saligue.cebunest.rentals.shared.RentalRequestDTO;
import edu.cit.saligue.cebunest.rentals.shared.RentalRequestRepository;
import edu.cit.saligue.cebunest.repository.RentalPaymentRepository;
import edu.cit.saligue.cebunest.users.shared.User;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OwnerRentalServiceTest {

    @Mock
    private RentalRequestRepository rentalRequestRepository;

    @Mock
    private PropertyRepository propertyRepository;

    @Mock
    private RentalPaymentRepository rentalPaymentRepository;

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private OwnerRentalService ownerRentalService;

    @Test
    void updateRequestStatus_ToApproved_RejectsOtherPendingRequests() {
        // Arrange
        User owner = User.builder().id(10L).build();

        Property property = Property.builder()
                .id(50L)
                .title("Test Property")
                .owner(owner)
                .price(5000.0)
                .build();

        User winningTenant = User.builder().id(1L).name("Winner").build();
        RentalRequest winningRequest = RentalRequest.builder()
                .id(100L)
                .property(property)
                .tenant(winningTenant)
                .status(RentalRequest.RentalStatus.PENDING)
                .startDate(LocalDate.now())
                .leaseDurationMonths(6)
                .build();

        User losingTenant = User.builder().id(2L).name("Loser").build();
        RentalRequest losingRequest = RentalRequest.builder()
                .id(101L)
                .property(property)
                .tenant(losingTenant)
                .status(RentalRequest.RentalStatus.PENDING)
                .build();

        when(rentalRequestRepository.findById(100L)).thenReturn(Optional.of(winningRequest));

        // When the service looks for other pending requests, return both
        when(rentalRequestRepository.findAllByPropertyIdAndStatus(50L, RentalRequest.RentalStatus.PENDING))
                .thenReturn(List.of(winningRequest, losingRequest));

        // Act
        // Note: The controller passes "APPROVED", but the service maps it to "CONFIRMED"
        RentalRequestDTO result = ownerRentalService.updateRequestStatus(100L, "APPROVED", owner);

        // Assert
        // 1. Verify the winning request was updated to CONFIRMED
        assertEquals("CONFIRMED", result.getStatus());

        // 2. Verify the losing request was marked as REJECTED and saved
        assertEquals(RentalRequest.RentalStatus.REJECTED, losingRequest.getStatus());
        verify(rentalRequestRepository, times(1)).save(losingRequest);

        // 3. Verify that 6 rental payment rows were generated (since leaseDurationMonths is 6)
        verify(rentalPaymentRepository, times(6)).save(any());

        // 4. Verify the property was updated to UNAVAILABLE
        assertEquals(Property.PropertyStatus.UNAVAILABLE, property.getStatus());
        verify(propertyRepository, times(1)).save(property);
    }
}