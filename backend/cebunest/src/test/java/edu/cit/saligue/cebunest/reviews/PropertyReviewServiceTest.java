package edu.cit.saligue.cebunest.reviews;

import edu.cit.saligue.cebunest.notifications.core.NotificationService;
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
class PropertyReviewServiceTest {

    @Mock
    private PropertyReviewRepository reviewRepository;
    @Mock
    private RentalRequestRepository rentalRequestRepository;
    @Mock
    private PropertyRepository propertyRepository;
    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private PropertyReviewService propertyReviewService;

    @Test
    void createReview_DuplicateReview_ThrowsException() {
        // Arrange
        User tenant = User.builder().id(1L).build();
        RentalRequest rental = RentalRequest.builder()
                .id(100L)
                .tenant(tenant)
                .status(RentalRequest.RentalStatus.CONFIRMED)
                .build();

        CreateReviewDTO dto = new CreateReviewDTO();
        dto.setRentalRequestId(100L);
        dto.setRating(5);
        dto.setComment("Great place!");

        when(rentalRequestRepository.findById(100L)).thenReturn(Optional.of(rental));

        // Simulate that a review already exists for this rental request
        when(reviewRepository.existsByRentalRequestId(100L)).thenReturn(true);

        // Act & Assert
        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> propertyReviewService.createReview(dto, tenant)
        );

        assertEquals("You have already reviewed this rental.", exception.getMessage());
    }

    @Test
    void createReview_RentalNotConfirmed_ThrowsException() {
        // Arrange
        User tenant = User.builder().id(1L).build();
        // Rental is only PENDING, not CONFIRMED
        RentalRequest rental = RentalRequest.builder()
                .id(100L)
                .tenant(tenant)
                .status(RentalRequest.RentalStatus.PENDING)
                .build();

        CreateReviewDTO dto = new CreateReviewDTO();
        dto.setRentalRequestId(100L);
        dto.setRating(4);

        when(rentalRequestRepository.findById(100L)).thenReturn(Optional.of(rental));

        // Act & Assert
        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> propertyReviewService.createReview(dto, tenant)
        );

        assertEquals("You can only review a property after your rental is confirmed or completed.", exception.getMessage());
    }
}