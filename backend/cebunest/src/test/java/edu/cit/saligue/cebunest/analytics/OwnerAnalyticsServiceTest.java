package edu.cit.saligue.cebunest.analytics;

import edu.cit.saligue.cebunest.payments.shared.RentalPayment;
import edu.cit.saligue.cebunest.properties.shared.Property;
import edu.cit.saligue.cebunest.properties.shared.PropertyRepository;
import edu.cit.saligue.cebunest.rentals.shared.RentalRequest;
import edu.cit.saligue.cebunest.rentals.shared.RentalRequestRepository;
import edu.cit.saligue.cebunest.payments.shared.RentalPaymentRepository;
import edu.cit.saligue.cebunest.reviews.PropertyReviewRepository;
import edu.cit.saligue.cebunest.users.shared.User;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OwnerAnalyticsServiceTest {

    @Mock
    private PropertyRepository propertyRepository;
    @Mock
    private RentalRequestRepository rentalRequestRepository;
    @Mock
    private RentalPaymentRepository rentalPaymentRepository;
    @Mock
    private PropertyReviewRepository propertyReviewRepository;

    @InjectMocks
    private OwnerAnalyticsService ownerAnalyticsService;

    @Test
    void getOwnerAnalytics_CalculatesCorrectRevenueAndOccupancy() {
        // Arrange
        User owner = User.builder().id(1L).name("Owner").build();
        User tenant = User.builder().id(2L).name("Tenant").email("tenant@test.com").build(); // DTO needs Tenant details

        // Mock 2 properties (1 Available, 1 Unavailable/Occupied)
        Property p1 = Property.builder().id(10L).title("Prop 1").location("Cebu").owner(owner).status(Property.PropertyStatus.AVAILABLE).build();
        Property p2 = Property.builder().id(20L).title("Prop 2").location("Cebu").owner(owner).status(Property.PropertyStatus.UNAVAILABLE).build();
        when(propertyRepository.findByOwnerId(1L)).thenReturn(List.of(p1, p2));

        // Mock 1 confirmed rental request linked to Property 2 and the Tenant
        RentalRequest confirmedReq = RentalRequest.builder()
                .id(100L)
                .property(p2) // Link property
                .tenant(tenant) // Link tenant
                .leaseDurationMonths(6)
                .status(RentalRequest.RentalStatus.CONFIRMED)
                .build();

        when(rentalRequestRepository.findByPropertyIdInOrderByCreatedAtDesc(anyList())).thenReturn(List.of(confirmedReq));

        // Mock Payments: 1 Paid (5000), 1 Pending (5000), fully linked to the confirmed request
        RentalPayment paid = RentalPayment.builder()
                .id(1L)
                .rentalRequest(confirmedReq) // Link the request!
                .installmentNumber(1)
                .amount(5000.0)
                .status(RentalPayment.PaymentStatus.PAID)
                .build();

        RentalPayment pending = RentalPayment.builder()
                .id(2L)
                .rentalRequest(confirmedReq) // Link the request!
                .installmentNumber(2)
                .amount(5000.0)
                .status(RentalPayment.PaymentStatus.PENDING)
                .build();

        when(rentalPaymentRepository.findByRentalRequestIdIn(anyList())).thenReturn(List.of(paid, pending));

        // Act
        Map<String, Object> result = ownerAnalyticsService.getOwnerAnalytics(owner);

        // Assert
        Map<String, Object> occupancy = (Map<String, Object>) result.get("occupancy");
        Map<String, Object> paymentStats = (Map<String, Object>) result.get("paymentStats");

        // Occupancy: 1 occupied out of 2 total = 50.0%
        assertEquals(50.0, occupancy.get("rate"));

        // Revenue: Only the PAID payment should count towards totalRevenue
        assertEquals(5000.0, paymentStats.get("totalRevenue"));

        // Pending: The PENDING payment should map to pendingAmount
        assertEquals(5000.0, paymentStats.get("pendingAmount"));
    }
}