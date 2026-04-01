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
    private final PropertyRepository       propertyRepository;
    private final PayMongoService          payMongoService;
    private final EmailService             emailService;
    private final NotificationService      notificationService;   // ← ADDED

    // ── Helper: Authorize Tenant OR Owner ────────────────────────────────
    private void authorizeTenantOrOwner(RentalRequest request, User currentUser) {
        boolean isTenant = request.getTenant().getId().equals(currentUser.getId());
        boolean isOwner  = request.getProperty().getOwner().getId().equals(currentUser.getId());
        if (!isTenant && !isOwner)
            throw new IllegalArgumentException("Not authorized. You must be the tenant or the property owner.");
    }

    // ── Step 1: Tenant confirms approval (always MONTHLY) ────────────────
    @Transactional
    public RentalRequestDTO confirmAndChoosePlan(Long requestId, String plan, User tenant) {
        RentalRequest request = rentalRequestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("Rental request not found."));

        if (!request.getTenant().getId().equals(tenant.getId()))
            throw new IllegalArgumentException("This is not your rental request. Only the tenant can confirm.");

        if (request.getStatus() != RentalRequest.RentalStatus.APPROVED)
            throw new IllegalArgumentException("This request is not in APPROVED status.");

        if (rentalPaymentRepository.existsByRentalRequestId(requestId))
            throw new IllegalArgumentException("Payment schedule already generated.");

        request.setStatus(RentalRequest.RentalStatus.CONFIRMED);
        request.setPaymentPlan("MONTHLY");
        rentalRequestRepository.save(request);

        Property property = request.getProperty();
        property.setStatus(Property.PropertyStatus.UNAVAILABLE);
        propertyRepository.save(property);

        generatePaymentSchedule(request);

        // ── Notify owner that tenant confirmed ────────────────────────────
        notificationService.send(
                property.getOwner(),
                "RENTAL_CONFIRMED",
                request.getTenant().getName() + " has confirmed their rental for \"" + property.getTitle() + "\". The lease is now active.",
                request.getId()
        );

        return RentalRequestDTO.from(request);
    }

    // ── Generate monthly payment schedule ────────────────────────────────
    private void generatePaymentSchedule(RentalRequest request) {
        double    monthlyAmount = request.getProperty().getPrice();
        LocalDate startDate     = request.getStartDate();
        int       months        = request.getLeaseDurationMonths();

        List<RentalPayment> payments = new ArrayList<>();
        for (int i = 0; i < months; i++) {
            RentalPayment payment = RentalPayment.builder()
                    .rentalRequest(request)
                    .installmentNumber(i + 1)
                    .amount(monthlyAmount)
                    .dueDate(startDate.plusMonths(i))
                    .status(RentalPayment.PaymentStatus.PENDING)
                    .build();
            payments.add(payment);
        }
        rentalPaymentRepository.saveAll(payments);
    }

    // ── Step 2: Initiate a payment (creates PayMongo link) ────────────────
    @Transactional
    public RentalPaymentDTO initiatePayment(Long paymentId, User currentUser) {
        RentalPayment payment = rentalPaymentRepository.findById(paymentId)
                .orElseThrow(() -> new IllegalArgumentException("Payment not found."));

        authorizeTenantOrOwner(payment.getRentalRequest(), currentUser);

        if (payment.getStatus() == RentalPayment.PaymentStatus.PAID)
            throw new IllegalArgumentException("This payment is already paid.");

        // ── Sequential guard ──────────────────────────────────────────────
        Long requestId   = payment.getRentalRequest().getId();
        List<RentalPayment> allPayments =
                rentalPaymentRepository.findByRentalRequestIdOrderByInstallmentNumberAsc(requestId);

        for (RentalPayment p : allPayments) {
            if (p.getInstallmentNumber() < payment.getInstallmentNumber()
                    && p.getStatus() != RentalPayment.PaymentStatus.PAID) {
                throw new IllegalArgumentException(
                        "You must pay month " + p.getInstallmentNumber()
                                + " before paying month " + payment.getInstallmentNumber() + ".");
            }
        }

        // ── Stale session check ───────────────────────────────────────────
        if (payment.getPaymongoPaymentId() != null) {
            String existingStatus = payMongoService.getPaymentLinkStatus(payment.getPaymongoPaymentId());
            if ("paid".equals(existingStatus)) {
                payment.setStatus(RentalPayment.PaymentStatus.PAID);
                payment.setPaidAt(LocalDate.now());
                rentalPaymentRepository.save(payment);
                return RentalPaymentDTO.from(payment);
            }
            payment.setPaymongoPaymentId(null);
            payment.setCheckoutUrl(null);
        }

        // ── Create fresh PayMongo checkout session ────────────────────────
        String propertyTitle = payment.getRentalRequest().getProperty().getTitle();
        String description   = "Monthly rent #" + payment.getInstallmentNumber() + " – " + propertyTitle;
        String referenceId   = "payment-" + payment.getId() + "-" + System.currentTimeMillis();

        Map<String, String> result = payMongoService.createPaymentLink(
                payment.getAmount(),
                description,
                referenceId,
                payment.getId(),
                requestId
        );

        payment.setCheckoutUrl(result.get("checkoutUrl"));
        payment.setPaymongoPaymentId(result.get("paymentLinkId"));
        rentalPaymentRepository.save(payment);

        return RentalPaymentDTO.from(payment);
    }

    // ── Step 3: Verify payment status (poll after redirect) ───────────────
    @Transactional
    public RentalPaymentDTO verifyPayment(Long paymentId, User currentUser) {
        RentalPayment payment = rentalPaymentRepository.findById(paymentId)
                .orElseThrow(() -> new IllegalArgumentException("Payment not found."));

        authorizeTenantOrOwner(payment.getRentalRequest(), currentUser);

        if (payment.getPaymongoPaymentId() == null)
            throw new IllegalArgumentException("No payment link found. Initiate payment first.");

        if (payment.getStatus() == RentalPayment.PaymentStatus.PAID)
            return RentalPaymentDTO.from(payment);

        String status = payMongoService.getPaymentLinkStatus(payment.getPaymongoPaymentId());

        if ("paid".equals(status)) {
            payment.setStatus(RentalPayment.PaymentStatus.PAID);
            payment.setPaidAt(LocalDate.now());
            rentalPaymentRepository.save(payment);

            RentalRequest rental    = payment.getRentalRequest();
            String tenantEmail      = rental.getTenant().getEmail();
            String tenantName       = rental.getTenant().getName();
            String propTitle        = rental.getProperty().getTitle();
            String instLabel        = "Monthly payment #" + payment.getInstallmentNumber();

            // ── Email tenant ──────────────────────────────────────────────
            emailService.sendEmail(tenantEmail,
                    "CebuNest – Payment Confirmed ✓",
                    "Hi " + tenantName + ",\n\n" +
                            "Your payment has been confirmed.\n\n" +
                            "Property: " + propTitle + "\n" +
                            "Payment: " + instLabel + "\n" +
                            "Amount: ₱" + String.format("%.2f", payment.getAmount()) + "\n" +
                            "Date: " + payment.getPaidAt() + "\n\n" +
                            "Thank you!\n— CebuNest Team");

            // ── Notify owner that payment was received ────────────────────
            notificationService.send(
                    rental.getProperty().getOwner(),
                    "PAYMENT_RECEIVED",
                    tenantName + " paid month " + payment.getInstallmentNumber()
                            + " (₱" + String.format("%.0f", payment.getAmount()) + ") for \""
                            + propTitle + "\".",
                    rental.getId()
            );
        }

        return RentalPaymentDTO.from(payment);
    }

    // ── Get payments for a rental request ────────────────────────────────
    @Transactional(readOnly = true)
    public List<RentalPaymentDTO> getPaymentsForRequest(Long requestId, User currentUser) {
        RentalRequest request = rentalRequestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("Rental request not found."));

        authorizeTenantOrOwner(request, currentUser);

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

    // ── Cancel Payment ────────────────────────────────────────────────────
    @Transactional
    public RentalPaymentDTO cancelPayment(Long paymentId, User currentUser) {
        RentalPayment payment = rentalPaymentRepository.findById(paymentId)
                .orElseThrow(() -> new IllegalArgumentException("Payment not found."));

        authorizeTenantOrOwner(payment.getRentalRequest(), currentUser);

        if (payment.getStatus() == RentalPayment.PaymentStatus.PAID)
            return RentalPaymentDTO.from(payment);

        payment.setPaymongoPaymentId(null);
        payment.setCheckoutUrl(null);
        rentalPaymentRepository.save(payment);

        return RentalPaymentDTO.from(payment);
    }
}