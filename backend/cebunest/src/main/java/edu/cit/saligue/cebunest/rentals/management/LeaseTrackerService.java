package edu.cit.saligue.cebunest.rentals.management;

import edu.cit.saligue.cebunest.properties.shared.Property;
import edu.cit.saligue.cebunest.properties.shared.PropertyRepository;
import edu.cit.saligue.cebunest.rentals.shared.RentalRequest;
import edu.cit.saligue.cebunest.rentals.shared.RentalRequestRepository;
import edu.cit.saligue.cebunest.notifications.core.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

import edu.cit.saligue.cebunest.payments.shared.RentalPaymentRepository;
import edu.cit.saligue.cebunest.payments.shared.RentalPayment;

@Service
@RequiredArgsConstructor
public class LeaseTrackerService {

    private final RentalRequestRepository rentalRequestRepository;
    private final PropertyRepository propertyRepository;
    private final NotificationService notificationService;
    private final RentalPaymentRepository rentalPaymentRepository;

    @Transactional
    public void processLeaseExpirations() {
        LocalDate today = LocalDate.now();
        List<RentalRequest> activeLeases = rentalRequestRepository.findByStatus(RentalRequest.RentalStatus.CONFIRMED);

        for (RentalRequest lease : activeLeases) {
            // Calculate the exact end date
            LocalDate endDate = lease.getStartDate().plusMonths(lease.getLeaseDurationMonths());
            long daysUntilEnd = ChronoUnit.DAYS.between(today, endDate);

            // 1. Completion Logic: Lease is officially over
            if (daysUntilEnd <= 0) {
                completeLease(lease);
            }
            // 2. Reminder Logic: Lease ends in exactly 1, 2, or 3 days
            else if (daysUntilEnd <= 3 && daysUntilEnd > 0) {
                sendReminder(lease, daysUntilEnd);
            }
        }
    }

    private void completeLease(RentalRequest lease) {
        // 1. Check for unpaid balances
        List<RentalPayment> payments = rentalPaymentRepository
                .findByRentalRequestIdOrderByInstallmentNumberAsc(lease.getId());

        double unpaidBalance = 0.0;
        boolean hasUnpaid = false;

        for (RentalPayment p : payments) {
            if (p.getStatus() == RentalPayment.PaymentStatus.PENDING || p.getStatus() == RentalPayment.PaymentStatus.OVERDUE) {
                p.setStatus(RentalPayment.PaymentStatus.OVERDUE); // Force any pending to overdue since lease is over
                unpaidBalance += p.getAmount();
                hasUnpaid = true;
            }
        }

        if (hasUnpaid) {
            rentalPaymentRepository.saveAll(payments);
        }

        // 2. Mark lease as completed
        lease.setStatus(RentalRequest.RentalStatus.COMPLETED);
        rentalRequestRepository.save(lease);

        // 3. Free up the property
        Property property = lease.getProperty();
        property.setStatus(Property.PropertyStatus.AVAILABLE);
        propertyRepository.save(property);

        // 4. Send Contextual Notifications
        if (hasUnpaid) {
            String formattedBalance = String.format("₱%.2f", unpaidBalance);

            notificationService.send(
                    lease.getTenant(),
                    "LEASE_COMPLETED_WITH_BALANCE",
                    "Your lease for \"" + property.getTitle() + "\" has ended, but you have an outstanding balance of " + formattedBalance + ". Please settle this immediately from your Past Rentals tab.",
                    lease.getId(),
                    property.getId()
            );

            notificationService.send(
                    property.getOwner(),
                    "LEASE_COMPLETED_WITH_BALANCE",
                    "The lease for \"" + property.getTitle() + "\" has completed. Note: The tenant (" + lease.getTenant().getName() + ") still owes " + formattedBalance + ".",
                    lease.getId(),
                    property.getId()
            );
            System.out.println("⚠️ Completed lease ID: " + lease.getId() + " (Unpaid Balance: " + formattedBalance + ")");

        } else {
            // Clean exit notifications
            notificationService.send(
                    lease.getTenant(),
                    "LEASE_COMPLETED",
                    "Your lease for \"" + property.getTitle() + "\" has naturally completed. Thank you for using CebuNest!",
                    lease.getId(),
                    property.getId()
            );

            notificationService.send(
                    property.getOwner(),
                    "LEASE_COMPLETED",
                    "The lease for \"" + property.getTitle() + "\" has completed. The property is now AVAILABLE in the catalog.",
                    lease.getId(),
                    property.getId()
            );
            System.out.println("✅ Cleanly completed lease ID: " + lease.getId());
        }
    }
    private void sendReminder(RentalRequest lease, long daysUntilEnd) {
        String daysText = daysUntilEnd == 1 ? "1 day" : daysUntilEnd + " days";

        // This automatically sends an email to the tenant because of how your NotificationService is built
        notificationService.send(
                lease.getTenant(),
                "LEASE_ENDING_SOON",
                "Reminder: Your lease for \"" + lease.getProperty().getTitle() + "\" ends in " + daysText + ". " +
                        "If you wish to stay longer, please submit a lease extension request now to secure your spot.",
                lease.getId(),
                lease.getProperty().getId()
        );

        System.out.println("⏳ Sent " + daysText + " reminder for lease ID: " + lease.getId());
    }
}