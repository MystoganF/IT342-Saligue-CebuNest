package edu.cit.saligue.cebunest.service;

import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class SchedulerService {

    private final RentalPaymentService rentalPaymentService;

    @Scheduled(cron = "0 * * * * *")
    public void markOverduePayments() {
        rentalPaymentService.markOverduePayments();
    }
}