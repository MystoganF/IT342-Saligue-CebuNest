package edu.cit.saligue.cebunest.payments.billing;

import edu.cit.saligue.cebunest.notifications.core.NotificationService;
import edu.cit.saligue.cebunest.payments.gateway.PayMongoService;
import edu.cit.saligue.cebunest.payments.shared.RentalPayment;
import edu.cit.saligue.cebunest.properties.shared.Property;
import edu.cit.saligue.cebunest.properties.shared.PropertyRepository;
import edu.cit.saligue.cebunest.rentals.shared.RentalRequest;
import edu.cit.saligue.cebunest.repository.RentalPaymentRepository;
import edu.cit.saligue.cebunest.rentals.shared.RentalRequestRepository;
import edu.cit.saligue.cebunest.users.shared.User;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RentalPaymentServiceTest {

    @Mock
    private RentalRequestRepository rentalRequestRepository;

    @Mock
    private RentalPaymentRepository rentalPaymentRepository;

    @Mock
    private PropertyRepository propertyRepository;

    @Mock
    private PayMongoService payMongoService;

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private RentalPaymentService rentalPaymentService;

    @Captor
    private ArgumentCaptor<List<RentalPayment>> paymentListCaptor;

    @Test
    void confirmAndChoosePlan_GeneratesCorrectPaymentSchedule() {
        // Arrange
        User owner = User.builder().id(1L).build();
        User tenant = User.builder().id(2L).name("Tenant A").build();

        Property property = Property.builder().id(100L).owner(owner).price(5000.0).build();

        RentalRequest request = RentalRequest.builder()
                .id(10L)
                .tenant(tenant)
                .property(property)
                .status(RentalRequest.RentalStatus.APPROVED)
                .leaseDurationMonths(6) // 6-month lease
                .startDate(LocalDate.now())
                .build();

        when(rentalRequestRepository.findById(10L)).thenReturn(Optional.of(request));
        when(rentalPaymentRepository.existsByRentalRequestId(10L)).thenReturn(false);

        // Act
        rentalPaymentService.confirmAndChoosePlan(10L, "MONTHLY", tenant);

        // Assert
        // Capture the list of payments that the service tried to save
        verify(rentalPaymentRepository).saveAll(paymentListCaptor.capture());
        List<RentalPayment> generatedPayments = paymentListCaptor.getValue();

        // Verify exactly 6 payments were generated for the 6-month lease
        assertEquals(6, generatedPayments.size());

        // Verify the first payment is setup correctly
        assertEquals(1, generatedPayments.get(0).getInstallmentNumber());
        assertEquals(5000.0, generatedPayments.get(0).getAmount());
        assertEquals(RentalPayment.PaymentStatus.PENDING, generatedPayments.get(0).getStatus());
    }

    @Test
    void initiatePayment_PreviousMonthUnpaid_ThrowsException() {
        // Arrange
        User owner = User.builder().id(1L).build();
        User tenant = User.builder().id(2L).build();

        // We must include a Property with an Owner so authorizeTenantOrOwner doesn't throw a NullPointerException
        Property property = Property.builder().id(100L).owner(owner).build();

        RentalRequest request = RentalRequest.builder()
                .id(10L)
                .tenant(tenant)
                .property(property)
                .build();

        // The payment the user is currently trying to pay (Month 2)
        RentalPayment targetPayment = RentalPayment.builder()
                .id(102L)
                .rentalRequest(request)
                .installmentNumber(2)
                .status(RentalPayment.PaymentStatus.PENDING)
                .build();

        // The previous payment that is still unpaid (Month 1)
        RentalPayment previousPayment = RentalPayment.builder()
                .id(101L)
                .rentalRequest(request)
                .installmentNumber(1)
                .status(RentalPayment.PaymentStatus.PENDING)
                .build();

        when(rentalPaymentRepository.findById(102L)).thenReturn(Optional.of(targetPayment));

        // When the service loads all payments for this lease, return both
        when(rentalPaymentRepository.findByRentalRequestIdOrderByInstallmentNumberAsc(10L))
                .thenReturn(List.of(previousPayment, targetPayment));

        // Act & Assert
        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> rentalPaymentService.initiatePayment(102L, tenant)
        );

        assertEquals("Pay previous months first.", exception.getMessage());
    }

    @Test
    void markOverduePayments_FlagsPastDuePayments() {
        // Arrange
        User owner = User.builder().id(1L).build();
        User tenant = User.builder().id(2L).name("Tenant A").build();
        Property property = Property.builder().id(100L).title("Apt 1").owner(owner).build();
        RentalRequest request = RentalRequest.builder().id(10L).tenant(tenant).property(property).build();

        // Create a payment that was due yesterday
        RentalPayment overduePayment = RentalPayment.builder()
                .id(101L)
                .rentalRequest(request)
                .installmentNumber(1)
                .amount(5000.0)
                .dueDate(LocalDate.now().minusDays(1)) // Due in the past
                .status(RentalPayment.PaymentStatus.PENDING)
                .build();

        // Create a payment that is due tomorrow (should be ignored)
        RentalPayment futurePayment = RentalPayment.builder()
                .id(102L)
                .rentalRequest(request)
                .dueDate(LocalDate.now().plusDays(1))
                .status(RentalPayment.PaymentStatus.PENDING)
                .build();

        when(rentalPaymentRepository.findAll()).thenReturn(List.of(overduePayment, futurePayment));

        // Act
        rentalPaymentService.markOverduePayments();

        // Assert
        // Verify the past-due payment was updated
        assertEquals(RentalPayment.PaymentStatus.OVERDUE, overduePayment.getStatus());

        // Verify the future payment was ignored and left as PENDING
        assertEquals(RentalPayment.PaymentStatus.PENDING, futurePayment.getStatus());

        // Verify saveAll was called with ONLY the overdue payment
        verify(rentalPaymentRepository).saveAll(argThat(iterable -> {
            List<RentalPayment> savedList = (List<RentalPayment>) iterable;
            return savedList.size() == 1 && savedList.contains(overduePayment);
        }));

        // Verify notifications were sent (2 times: 1 to tenant, 1 to owner)
        verify(notificationService, times(2)).send(any(), eq("PAYMENT_OVERDUE"), anyString(), anyLong(), anyLong());
    }
}