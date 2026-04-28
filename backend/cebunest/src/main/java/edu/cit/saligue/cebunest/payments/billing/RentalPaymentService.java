package edu.cit.saligue.cebunest.payments.billing;

import edu.cit.saligue.cebunest.payments.shared.RentalPaymentDTO;
import edu.cit.saligue.cebunest.payments.shared.RentalPayment;
import edu.cit.saligue.cebunest.rentals.shared.RentalRequestDTO;
import edu.cit.saligue.cebunest.properties.shared.PropertyRepository;
import edu.cit.saligue.cebunest.rentals.shared.RentalRequest;
import edu.cit.saligue.cebunest.rentals.shared.RentalRequestRepository;
import edu.cit.saligue.cebunest.repository.RentalPaymentRepository;
import edu.cit.saligue.cebunest.service.NotificationService;
import edu.cit.saligue.cebunest.payments.gateway.PayMongoService;
import edu.cit.saligue.cebunest.users.shared.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import edu.cit.saligue.cebunest.properties.shared.Property;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class RentalPaymentService {

    private final RentalRequestRepository rentalRequestRepository;
    private final RentalPaymentRepository rentalPaymentRepository;
    private final PropertyRepository propertyRepository;
    private final PayMongoService payMongoService;
    private final NotificationService notificationService;

    private void authorizeTenantOrOwner(RentalRequest request, User currentUser) {
        boolean isTenant = request.getTenant().getId().equals(currentUser.getId());
        boolean isOwner  = request.getProperty().getOwner().getId().equals(currentUser.getId());
        if (!isTenant && !isOwner) throw new IllegalArgumentException("Not authorized.");
    }

    @Transactional
    public RentalRequestDTO confirmAndChoosePlan(Long requestId, String plan, User tenant) {
        RentalRequest request = rentalRequestRepository.findById(requestId).orElseThrow(() -> new IllegalArgumentException("Rental request not found."));
        if (!request.getTenant().getId().equals(tenant.getId())) throw new IllegalArgumentException("Not your rental request.");
        if (request.getStatus() != RentalRequest.RentalStatus.APPROVED) throw new IllegalArgumentException("Not in APPROVED status.");
        if (rentalPaymentRepository.existsByRentalRequestId(requestId)) throw new IllegalArgumentException("Payment schedule already generated.");

        request.setStatus(RentalRequest.RentalStatus.CONFIRMED);
        request.setPaymentPlan("MONTHLY");
        rentalRequestRepository.save(request);

        Property property = request.getProperty();
        property.setStatus(Property.PropertyStatus.UNAVAILABLE);
        propertyRepository.save(property);

        generatePaymentSchedule(request);

        notificationService.send(property.getOwner(), "RENTAL_CONFIRMED", request.getTenant().getName() + " has confirmed their rental for \"" + property.getTitle() + "\". The lease is now active.", request.getId(), property.getId());

        return RentalRequestDTO.from(request);
    }

    private void generatePaymentSchedule(RentalRequest request) {
        double monthlyAmount = request.getProperty().getPrice();
        LocalDate startDate = request.getStartDate();
        int months = request.getLeaseDurationMonths();
        List<RentalPayment> payments = new ArrayList<>();
        for (int i = 0; i < months; i++) {
            payments.add(RentalPayment.builder().rentalRequest(request).installmentNumber(i + 1).amount(monthlyAmount).dueDate(startDate.plusMonths(i + 1)).status(RentalPayment.PaymentStatus.PENDING).build());
        }
        rentalPaymentRepository.saveAll(payments);
    }

    @Transactional
    public RentalPaymentDTO initiatePayment(Long paymentId, User currentUser) {
        RentalPayment payment = rentalPaymentRepository.findById(paymentId).orElseThrow(() -> new IllegalArgumentException("Payment not found."));
        authorizeTenantOrOwner(payment.getRentalRequest(), currentUser);

        if (payment.getStatus() == RentalPayment.PaymentStatus.PAID) throw new IllegalArgumentException("Already paid.");

        Long requestId = payment.getRentalRequest().getId();
        List<RentalPayment> allPayments = rentalPaymentRepository.findByRentalRequestIdOrderByInstallmentNumberAsc(requestId);

        for (RentalPayment p : allPayments) {
            if (p.getInstallmentNumber() < payment.getInstallmentNumber() && p.getStatus() != RentalPayment.PaymentStatus.PAID) {
                throw new IllegalArgumentException("Pay previous months first.");
            }
        }

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

        String propertyTitle = payment.getRentalRequest().getProperty().getTitle();
        Map<String, String> result = payMongoService.createPaymentLink(payment.getAmount(), "Monthly rent #" + payment.getInstallmentNumber() + " – " + propertyTitle, "payment-" + payment.getId() + "-" + System.currentTimeMillis(), payment.getId(), requestId);

        payment.setCheckoutUrl(result.get("checkoutUrl"));
        payment.setPaymongoPaymentId(result.get("paymentLinkId"));
        rentalPaymentRepository.save(payment);
        return RentalPaymentDTO.from(payment);
    }

    @Transactional
    public RentalPaymentDTO verifyPayment(Long paymentId, User currentUser) {
        RentalPayment payment = rentalPaymentRepository.findById(paymentId).orElseThrow(() -> new IllegalArgumentException("Payment not found."));
        authorizeTenantOrOwner(payment.getRentalRequest(), currentUser);

        if (payment.getPaymongoPaymentId() == null) throw new IllegalArgumentException("No payment link found.");
        if (payment.getStatus() == RentalPayment.PaymentStatus.PAID) return RentalPaymentDTO.from(payment);

        if ("paid".equals(payMongoService.getPaymentLinkStatus(payment.getPaymongoPaymentId()))) {
            payment.setStatus(RentalPayment.PaymentStatus.PAID);
            payment.setPaidAt(LocalDate.now());
            rentalPaymentRepository.save(payment);

            RentalRequest rental = payment.getRentalRequest();
            // This triggers an email to the owner via NotificationService!
            notificationService.send(rental.getProperty().getOwner(), "PAYMENT_RECEIVED", rental.getTenant().getName() + " paid month " + payment.getInstallmentNumber() + " (₱" + String.format("%.0f", payment.getAmount()) + ") for \"" + rental.getProperty().getTitle() + "\".", rental.getId(), rental.getProperty().getId());
            // And send one to the tenant as a receipt
            notificationService.send(rental.getTenant(), "PAYMENT_RECEIVED", "Your payment for month " + payment.getInstallmentNumber() + " was successfully verified.", rental.getId(), rental.getProperty().getId());
        }

        return RentalPaymentDTO.from(payment);
    }

    @Transactional(readOnly = true)
    public List<RentalPaymentDTO> getPaymentsForRequest(Long requestId, User currentUser) {
        RentalRequest request = rentalRequestRepository.findById(requestId).orElseThrow(() -> new IllegalArgumentException("Request not found."));
        authorizeTenantOrOwner(request, currentUser);
        return rentalPaymentRepository.findByRentalRequestIdOrderByInstallmentNumberAsc(requestId).stream().map(RentalPaymentDTO::from).toList();
    }

    @Transactional
    public void markOverduePayments() {
        LocalDate today = LocalDate.now();
        List<RentalPayment> pending = rentalPaymentRepository.findAll().stream()
                .filter(p -> p.getStatus() == RentalPayment.PaymentStatus.PENDING
                        && p.getDueDate().isBefore(today))
                .toList();

        pending.forEach(p -> {
            p.setStatus(RentalPayment.PaymentStatus.OVERDUE);

            RentalRequest rental = p.getRentalRequest();
            User tenant = rental.getTenant();
            User owner  = rental.getProperty().getOwner();
            String propertyTitle = rental.getProperty().getTitle();

            // Notify tenant
            notificationService.send(
                    tenant,
                    "PAYMENT_OVERDUE",
                    "Your payment for Month " + p.getInstallmentNumber() +
                            " (₱" + String.format("%.0f", p.getAmount()) + ") for \"" +
                            propertyTitle + "\" is now overdue. Please settle it as soon as possible.",
                    rental.getId(),
                    rental.getProperty().getId()
            );

            // Notify owner
            notificationService.send(
                    owner,
                    "PAYMENT_OVERDUE",
                    rental.getTenant().getName() + "'s payment for Month " +
                            p.getInstallmentNumber() + " (₱" + String.format("%.0f", p.getAmount()) +
                            ") for \"" + propertyTitle + "\" is overdue.",
                    rental.getId(),
                    rental.getProperty().getId()
            );
        });

        rentalPaymentRepository.saveAll(pending);
    }

    @Transactional
    public RentalPaymentDTO cancelPayment(Long paymentId, User currentUser) {
        RentalPayment payment = rentalPaymentRepository.findById(paymentId).orElseThrow(() -> new IllegalArgumentException("Payment not found."));
        authorizeTenantOrOwner(payment.getRentalRequest(), currentUser);
        if (payment.getStatus() == RentalPayment.PaymentStatus.PAID) return RentalPaymentDTO.from(payment);
        payment.setPaymongoPaymentId(null);
        payment.setCheckoutUrl(null);
        rentalPaymentRepository.save(payment);
        return RentalPaymentDTO.from(payment);
    }

    @Transactional
    public RentalPaymentDTO markFailed(Long paymentId, User currentUser) {
        RentalPayment payment = rentalPaymentRepository.findById(paymentId).orElseThrow(() -> new IllegalArgumentException("Payment not found."));
        authorizeTenantOrOwner(payment.getRentalRequest(), currentUser);
        if (payment.getStatus() == RentalPayment.PaymentStatus.PAID) return RentalPaymentDTO.from(payment);
        payment.setStatus(RentalPayment.PaymentStatus.FAILED);
        payment.setPaymongoPaymentId(null);
        payment.setCheckoutUrl(null);
        rentalPaymentRepository.save(payment);
        return RentalPaymentDTO.from(payment);
    }
}