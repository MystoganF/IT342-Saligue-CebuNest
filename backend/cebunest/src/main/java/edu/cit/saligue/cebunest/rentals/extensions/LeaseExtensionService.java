package edu.cit.saligue.cebunest.rentals.extensions;

import edu.cit.saligue.cebunest.rentals.shared.LeaseExtensionRequestDTO;
import edu.cit.saligue.cebunest.rentals.shared.LeaseExtensionRequest;
import edu.cit.saligue.cebunest.payments.shared.RentalPayment;
import edu.cit.saligue.cebunest.rentals.shared.RentalRequest;
import edu.cit.saligue.cebunest.service.EmailService;
import edu.cit.saligue.cebunest.service.NotificationService;
import edu.cit.saligue.cebunest.users.shared.User;
import edu.cit.saligue.cebunest.rentals.shared.LeaseExtensionRequestRepository;
import edu.cit.saligue.cebunest.repository.RentalPaymentRepository; // Ensure this is imported
import edu.cit.saligue.cebunest.rentals.shared.RentalRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class LeaseExtensionService {

    private final LeaseExtensionRequestRepository extensionRepository;
    private final RentalRequestRepository         rentalRequestRepository;
    private final RentalPaymentRepository         rentalPaymentRepository; // Added this
    private final NotificationService notificationService;
    private final EmailService emailService;

    // ── Tenant: submit an extension request ─────────────────────────────
    @Transactional
    public LeaseExtensionRequestDTO requestExtension(Long rentalRequestId,
                                                     Integer months,
                                                     String reason,
                                                     User tenant) {
        RentalRequest rental = rentalRequestRepository.findById(rentalRequestId)
                .orElseThrow(() -> new IllegalArgumentException("Rental request not found."));
        Long propertyId = rental.getProperty().getId();

        if (!rental.getTenant().getId().equals(tenant.getId()))
            throw new IllegalArgumentException("This is not your rental.");

        if (rental.getStatus() != RentalRequest.RentalStatus.CONFIRMED)
            throw new IllegalArgumentException("You can only request an extension for an active rental.");

        if (months == null || months < 1)
            throw new IllegalArgumentException("Requested months must be at least 1.");

        if (extensionRepository.existsByRentalRequestIdAndStatus(
                rentalRequestId, LeaseExtensionRequest.ExtensionStatus.PENDING))
            throw new IllegalArgumentException(
                    "You already have a pending extension request for this rental.");

        LeaseExtensionRequest ext = LeaseExtensionRequest.builder()
                .rentalRequest(rental)
                .requestedMonths(months)
                .reason(reason != null ? reason.trim() : null)
                .build();

        LeaseExtensionRequest saved = extensionRepository.save(ext);

        String propTitle  = rental.getProperty().getTitle();
        String ownerName  = rental.getProperty().getOwner().getName();
        String tenantName = tenant.getName();

        notificationService.send(
                rental.getProperty().getOwner(),
                "EXTENSION_REQUESTED",
                tenantName + " has requested a " + months + "-month lease extension for \"" + propTitle + "\".",
                rental.getId(),
                propertyId
        );

        emailService.sendEmail(
                rental.getProperty().getOwner().getEmail(),
                "CebuNest – Lease Extension Request",
                "Hi " + ownerName + ",\n\n" +
                        tenantName + " has requested a lease extension of " + months + " month(s) for \"" + propTitle + "\".\n" +
                        (reason != null && !reason.isBlank() ? "Reason: " + reason + "\n" : "") +
                        "\nLog in to approve or reject this request.\n\n— CebuNest Team"
        );

        notificationService.send(
                tenant,
                "EXTENSION_PENDING",
                "Your lease extension request of " + months + " month(s) for \"" + propTitle + "\" has been sent to the owner.",
                rental.getId(),
                propertyId
        );

        return LeaseExtensionRequestDTO.from(saved);
    }

    // ── Owner: approve or reject (Corrected with Payment Sync) ──────────
    @Transactional
    public LeaseExtensionRequestDTO respondToExtension(Long extensionId,
                                                       String decision,
                                                       User owner) {

        LeaseExtensionRequest ext = extensionRepository.findById(extensionId)
                .orElseThrow(() -> new IllegalArgumentException("Extension request not found."));

        if (!ext.getRentalRequest().getProperty().getOwner().getId().equals(owner.getId()))
            throw new IllegalArgumentException("You do not own this property.");

        if (ext.getStatus() != LeaseExtensionRequest.ExtensionStatus.PENDING)
            throw new IllegalArgumentException("This request has already been decided.");

        boolean approved = "APPROVED".equalsIgnoreCase(decision);
        ext.setStatus(approved ? LeaseExtensionRequest.ExtensionStatus.APPROVED : LeaseExtensionRequest.ExtensionStatus.REJECTED);
        extensionRepository.save(ext);

        RentalRequest rental = ext.getRentalRequest();
        String propTitle     = rental.getProperty().getTitle();
        String tenantName    = rental.getTenant().getName();
        int monthsToAdd      = ext.getRequestedMonths();
        Long propertyId      = rental.getProperty().getId();

        if (approved) {
            // 1. Update Rental Request Duration
            int oldDuration = rental.getLeaseDurationMonths();
            int newDuration = oldDuration + monthsToAdd;
            rental.setLeaseDurationMonths(newDuration);
            rentalRequestRepository.save(rental);

            // 2. SYNC PAYMENTS: Create new payment rows for the extended months
            double monthlyAmount = rental.getProperty().getPrice();
            LocalDate startDate  = rental.getStartDate();

            for (int i = oldDuration + 1; i <= newDuration; i++) {
                RentalPayment p = RentalPayment.builder()
                        .rentalRequest(rental)
                        .installmentNumber(i)
                        .amount(monthlyAmount)
                        .dueDate(startDate.plusMonths(i - 1))
                        .status(RentalPayment.PaymentStatus.PENDING)
                        .createdAt(LocalDateTime.now())
                        .build();
                rentalPaymentRepository.save(p);
            }

            notificationService.send(
                    rental.getTenant(),
                    "EXTENSION_APPROVED",
                    "🎉 Your lease extension of " + monthsToAdd + " month(s) for \"" + propTitle + "\" was approved! New total: " + newDuration + " month(s).",
                    rental.getId(),
                    propertyId
            );

            emailService.sendEmail(
                    rental.getTenant().getEmail(),
                    "CebuNest – Lease Extension Approved 🎉",
                    "Hi " + tenantName + ",\n\n" +
                            "Your lease extension request of " + monthsToAdd + " month(s) for \"" + propTitle + "\" has been approved.\n" +
                            "New total lease duration: " + newDuration + " month(s).\n\n— CebuNest Team"
            );

        } else {
            notificationService.send(
                    rental.getTenant(),
                    "EXTENSION_REJECTED",
                    "Your lease extension request of " + monthsToAdd + " month(s) for \"" + propTitle + "\" was not approved.",
                    rental.getId(),
                    propertyId
            );

            emailService.sendEmail(
                    rental.getTenant().getEmail(),
                    "CebuNest – Lease Extension Update",
                    "Hi " + tenantName + ",\n\n" +
                            "Your lease extension request of " + monthsToAdd + " month(s) for \"" + propTitle + "\" was not approved by the owner.\n\n— CebuNest Team"
            );
        }

        return LeaseExtensionRequestDTO.from(ext);
    }

    @Transactional(readOnly = true)
    public List<LeaseExtensionRequestDTO> getForRental(Long rentalRequestId, User caller) {
        RentalRequest rental = rentalRequestRepository.findById(rentalRequestId)
                .orElseThrow(() -> new IllegalArgumentException("Rental request not found."));

        boolean isTenant = rental.getTenant().getId().equals(caller.getId());
        boolean isOwner  = rental.getProperty().getOwner().getId().equals(caller.getId());
        if (!isTenant && !isOwner)
            throw new IllegalArgumentException("Not authorized.");

        return extensionRepository
                .findByRentalRequestIdOrderByCreatedAtDesc(rentalRequestId)
                .stream()
                .map(LeaseExtensionRequestDTO::from)
                .toList();
    }
}