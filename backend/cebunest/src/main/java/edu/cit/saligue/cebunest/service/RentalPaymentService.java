package edu.cit.saligue.cebunest.service;

import edu.cit.saligue.cebunest.dto.RentalPaymentDTO;
import edu.cit.saligue.cebunest.dto.RentalRequestDTO;
import edu.cit.saligue.cebunest.entity.*;
import edu.cit.saligue.cebunest.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class RentalPaymentService {

    private final RentalRequestRepository  rentalRequestRepository;
    private final RentalPaymentRepository  rentalPaymentRepository;
    private final PayMongoService          payMongoService;
    private final EmailService             emailService;

    // ── Step 1: Tenant confirms approval + chooses payment plan ──────────
    @Transactional
    public RentalRequestDTO confirmAndChoosePlan(Long requestId, String plan, User tenant) {
        RentalRequest request = rentalRequestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("Rental request not found."));

        if (!request.getTenant().getId().equals(tenant.getId()))
            throw new IllegalArgumentException("This is not your rental request.");

        if (request.getStatus() != RentalRequest.RentalStatus.APPROVED)
            throw new IllegalArgumentException("This request is not in APPROVED status.");

        String planUpper = plan.toUpperCase();
        if (!planUpper.equals("MONTHLY") && !planUpper.equals("FULL"))
            throw new IllegalArgumentException("Payment plan must be MONTHLY or FULL.");

        // Already confirmed
        if (rentalPaymentRepository.existsByRentalRequestId(requestId))
            throw new IllegalArgumentException("Payment schedule already generated.");

        request.setStatus(RentalRequest.RentalStatus.CONFIRMED);
        request.setPaymentPlan(planUpper);
        rentalRequestRepository.save(request);

        // Generate payment schedule
        generatePaymentSchedule(request, planUpper);

        return RentalRequestDTO.from(request);
    }

    // ── Generate payment schedule ─────────────────────────────────────────
    private void generatePaymentSchedule(RentalRequest request, String plan) {
        double monthlyAmount = request.getProperty().getPrice();
        LocalDate startDate  = request.getStartDate();
        int months           = request.getLeaseDurationMonths();

        List<RentalPayment> payments = new ArrayList<>();

        if (plan.equals("FULL")) {
            // One payment for the entire lease
            RentalPayment payment = RentalPayment.builder()
                    .rentalRequest(request)
                    .installmentNumber(0)
                    .amount(monthlyAmount * months)
                    .dueDate(startDate)
                    .status(RentalPayment.PaymentStatus.PENDING)
                    .build();
            payments.add(payment);
        } else {
            // Monthly installments
            for (int i = 0; i < months; i++) {
                LocalDate dueDate = startDate.plusMonths(i);
                RentalPayment payment = RentalPayment.builder()
                        .rentalRequest(request)
                        .installmentNumber(i + 1)
                        .amount(monthlyAmount)
                        .dueDate(dueDate)
                        .status(RentalPayment.PaymentStatus.PENDING)
                        .build();
                payments.add(payment);
            }
        }

        rentalPaymentRepository.saveAll(payments);
    }

    // ── Step 2: Initiate a payment (creates PayMongo link) ────────────────
    @Transactional
    public RentalPaymentDTO initiatePayment(Long paymentId, User tenant) {
        RentalPayment payment = rentalPaymentRepository.findById(paymentId)
                .orElseThrow(() -> new IllegalArgumentException("Payment not found."));

        if (!payment.getRentalRequest().getTenant().getId().equals(tenant.getId()))
            throw new IllegalArgumentException("This is not your payment.");

        if (payment.getStatus() == RentalPayment.PaymentStatus.PAID)
            throw new IllegalArgumentException("This payment is already paid.");

        String propertyTitle = payment.getRentalRequest().getProperty().getTitle();
        String description   = payment.getInstallmentNumber() == 0
                ? "Full lease payment – " + propertyTitle
                : "Monthly rent #" + payment.getInstallmentNumber() + " – " + propertyTitle;

        String referenceId = "payment-" + payment.getId();

        Map<String, String> result = payMongoService.createPaymentLink(
                payment.getAmount(), description, referenceId);

        payment.setCheckoutUrl(result.get("checkoutUrl"));
        payment.setPaymongoPaymentId(result.get("paymentLinkId"));
        rentalPaymentRepository.save(payment);

        return RentalPaymentDTO.from(payment);
    }

    // ── Step 3: Verify payment status (poll after redirect) ───────────────
    @Transactional
    public RentalPaymentDTO verifyPayment(Long paymentId, User tenant) {
        RentalPayment payment = rentalPaymentRepository.findById(paymentId)
                .orElseThrow(() -> new IllegalArgumentException("Payment not found."));

        if (!payment.getRentalRequest().getTenant().getId().equals(tenant.getId()))
            throw new IllegalArgumentException("This is not your payment.");

        if (payment.getPaymongoPaymentId() == null)
            throw new IllegalArgumentException("No payment link found. Initiate payment first.");

        if (payment.getStatus() == RentalPayment.PaymentStatus.PAID)
            return RentalPaymentDTO.from(payment);

        String status = payMongoService.getPaymentLinkStatus(payment.getPaymongoPaymentId());

        if ("paid".equals(status)) {
            payment.setStatus(RentalPayment.PaymentStatus.PAID);
            payment.setPaidAt(LocalDate.now());
            rentalPaymentRepository.save(payment);

            // Send confirmation email
            String tenantEmail = payment.getRentalRequest().getTenant().getEmail();
            String tenantName  = payment.getRentalRequest().getTenant().getName();
            String propTitle   = payment.getRentalRequest().getProperty().getTitle();
            String instLabel   = payment.getInstallmentNumber() == 0
                    ? "Full lease payment"
                    : "Monthly payment #" + payment.getInstallmentNumber();

            emailService.sendEmail(tenantEmail,
                    "CebuNest – Payment Confirmed ✓",
                    "Hi " + tenantName + ",\n\n" +
                            "Your payment has been confirmed.\n\n" +
                            "Property: " + propTitle + "\n" +
                            "Payment: " + instLabel + "\n" +
                            "Amount: ₱" + String.format("%.2f", payment.getAmount()) + "\n" +
                            "Date: " + payment.getPaidAt() + "\n\n" +
                            "Thank you!\n— CebuNest Team");
        }

        return RentalPaymentDTO.from(payment);
    }

    // ── Get payments for a rental request ────────────────────────────────
    @Transactional(readOnly = true)
    public List<RentalPaymentDTO> getPaymentsForRequest(Long requestId, User tenant) {
        RentalRequest request = rentalRequestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("Rental request not found."));

        if (!request.getTenant().getId().equals(tenant.getId()))
            throw new IllegalArgumentException("This is not your rental request.");

        return rentalPaymentRepository
                .findByRentalRequestIdOrderByInstallmentNumberAsc(requestId)
                .stream().map(RentalPaymentDTO::from).toList();
    }

    // ── Mark overdue payments ─────────────────────────────────────────────
    @Transactional
    public void markOverduePayments() {
        LocalDate today = LocalDate.now();
        List<RentalPayment> pending = rentalPaymentRepository.findAll().stream()
                .filter(p -> p.getStatus() == RentalPayment.PaymentStatus.PENDING
                        && p.getDueDate().isBefore(today))
                .toList();

        pending.forEach(p -> p.setStatus(RentalPayment.PaymentStatus.OVERDUE));
        rentalPaymentRepository.saveAll(pending);
    }
}