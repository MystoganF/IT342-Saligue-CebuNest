package edu.cit.saligue.cebunest.rentals.extensions;

import edu.cit.saligue.cebunest.infrastructure.mail.EmailService;
import edu.cit.saligue.cebunest.notifications.core.NotificationService;
import edu.cit.saligue.cebunest.payments.shared.RentalPayment;
import edu.cit.saligue.cebunest.properties.shared.Property;
import edu.cit.saligue.cebunest.rentals.shared.LeaseExtensionRequest;
import edu.cit.saligue.cebunest.rentals.shared.LeaseExtensionRequestRepository;
import edu.cit.saligue.cebunest.rentals.shared.RentalRequest;
import edu.cit.saligue.cebunest.rentals.shared.RentalRequestRepository;
import edu.cit.saligue.cebunest.repository.RentalPaymentRepository;
import edu.cit.saligue.cebunest.users.shared.User;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LeaseExtensionServiceTest {

    @Mock
    private LeaseExtensionRequestRepository extensionRepository;
    @Mock
    private RentalRequestRepository rentalRequestRepository;
    @Mock
    private RentalPaymentRepository rentalPaymentRepository;
    @Mock
    private NotificationService notificationService;
    @Mock
    private EmailService emailService;

    @InjectMocks
    private LeaseExtensionService leaseExtensionService;

    @Test
    void respondToExtension_Approved_UpdatesDurationAndGeneratesPayments() {
        // Arrange
        User owner = User.builder().id(1L).email("owner@test.com").build();
        User tenant = User.builder().id(2L).email("tenant@test.com").name("John").build();
        Property property = Property.builder().id(10L).owner(owner).price(5000.0).build();

        // Existing lease is 6 months
        RentalRequest rental = RentalRequest.builder()
                .id(100L).property(property).tenant(tenant)
                .startDate(LocalDate.now())
                .leaseDurationMonths(6)
                .build();

        // Requesting 2 extra months
        LeaseExtensionRequest extensionRequest = LeaseExtensionRequest.builder()
                .id(50L).rentalRequest(rental)
                .requestedMonths(2)
                .status(LeaseExtensionRequest.ExtensionStatus.PENDING)
                .build();

        when(extensionRepository.findById(50L)).thenReturn(Optional.of(extensionRequest));

        // Act
        leaseExtensionService.respondToExtension(50L, "APPROVED", owner);

        // Assert
        // 1. Verify extension status is APPROVED
        assertEquals(LeaseExtensionRequest.ExtensionStatus.APPROVED, extensionRequest.getStatus());

        // 2. Verify rental duration increased from 6 to 8
        assertEquals(8, rental.getLeaseDurationMonths());
        verify(rentalRequestRepository).save(rental);

        // 3. Verify exactly 2 new payment rows were generated and saved individually
        verify(rentalPaymentRepository, times(2)).save(any(RentalPayment.class));
    }
}