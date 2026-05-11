package edu.cit.saligue.cebunest.scheduler;

import edu.cit.saligue.cebunest.payments.billing.RentalPaymentService;
import edu.cit.saligue.cebunest.rentals.management.LeaseTrackerService;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class SchedulerService {

    private final RentalPaymentService rentalPaymentService;
    private final LeaseTrackerService leaseTrackerService;

    // Checks for overdue payments every hour
    @Scheduled(cron = "*/10 * * * * *")
    public void markOverduePayments() {
        rentalPaymentService.markOverduePayments();
    }

    // Runs every minute to send reminders and complete leases
    @Scheduled(cron = "*/10 * * * * *")
    public void trackLeaseExpirations() {
        leaseTrackerService.processLeaseExpirations();
    }
}