package edu.cit.saligue.cebunest.rentals.management;

import edu.cit.saligue.cebunest.properties.shared.Property;
import edu.cit.saligue.cebunest.properties.shared.PropertyRepository;
import edu.cit.saligue.cebunest.rentals.shared.RentalRequest;
import edu.cit.saligue.cebunest.rentals.shared.RentalRequestDTO;
import edu.cit.saligue.cebunest.rentals.shared.RentalRequestRepository;
import edu.cit.saligue.cebunest.payments.shared.RentalPayment; // Keep in old folder for now
import edu.cit.saligue.cebunest.repository.RentalPaymentRepository; // Keep in old folder for now
import edu.cit.saligue.cebunest.notifications.core.NotificationService;
import edu.cit.saligue.cebunest.users.shared.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class OwnerRentalService {

    private final RentalRequestRepository rentalRequestRepository;
    private final PropertyRepository propertyRepository;
    private final RentalPaymentRepository rentalPaymentRepository;
    private final NotificationService notificationService;

    @Transactional(readOnly = true)
    public List<RentalRequestDTO> getRequestsForProperty(Long propertyId, User owner) {
        Property property = propertyRepository.findById(propertyId).orElseThrow(() -> new IllegalArgumentException("Property not found."));
        if (!property.getOwner().getId().equals(owner.getId())) throw new IllegalArgumentException("You do not own this property.");
        return rentalRequestRepository.findByPropertyIdOrderByCreatedAtDesc(propertyId).stream().map(RentalRequestDTO::from).toList();
    }

    @Transactional
    public RentalRequestDTO updateRequestStatus(Long requestId, String newStatus, User owner) {
        RentalRequest request = rentalRequestRepository.findById(requestId).orElseThrow(() -> new IllegalArgumentException("Request not found."));
        if (!request.getProperty().getOwner().getId().equals(owner.getId())) throw new IllegalArgumentException("You do not own this property.");
        if (request.getStatus() != RentalRequest.RentalStatus.PENDING) throw new IllegalArgumentException("Only pending requests can be updated.");

        // Intercept "APPROVED" and map it directly to "CONFIRMED"
        RentalRequest.RentalStatus status = newStatus.equals("APPROVED")
                ? RentalRequest.RentalStatus.CONFIRMED
                : RentalRequest.RentalStatus.valueOf(newStatus);

        request.setStatus(status);
        String propTitle = request.getProperty().getTitle();

        if (status == RentalRequest.RentalStatus.CONFIRMED) {
            // 1. Reject all other pending requests
            List<RentalRequest> otherPending = rentalRequestRepository.findAllByPropertyIdAndStatus(request.getProperty().getId(), RentalRequest.RentalStatus.PENDING);
            for (RentalRequest otherReq : otherPending) {
                if (!otherReq.getId().equals(request.getId())) {
                    otherReq.setStatus(RentalRequest.RentalStatus.REJECTED);
                    rentalRequestRepository.save(otherReq);
                    notificationService.send(otherReq.getTenant(), "REQUEST_REJECTED", "Your request for \"" + propTitle + "\" was not approved. Browse other listings.", otherReq.getId());
                }
            }

            // 2. Mark property as unavailable
            Property property = request.getProperty();
            property.setStatus(Property.PropertyStatus.UNAVAILABLE);
            propertyRepository.save(property);

            // 3. Set a default payment plan
            request.setPaymentPlan("MONTHLY");

            // 4. Generate the initial rental payments instantly
            double monthlyAmount = property.getPrice();
            LocalDate startDate = request.getStartDate();
            for (int i = 1; i <= request.getLeaseDurationMonths(); i++) {
                RentalPayment p = RentalPayment.builder()
                        .rentalRequest(request)
                        .installmentNumber(i)
                        .amount(monthlyAmount)
                        .dueDate(startDate.plusMonths(i - 1))
                        .status(RentalPayment.PaymentStatus.PENDING)
                        .build();
                rentalPaymentRepository.save(p);
            }

            // 5. Notify the tenant that the lease has started
            notificationService.send(request.getTenant(), "LEASE_STARTED", "Your request for \"" + propTitle + "\" was approved! Your lease is now active.", request.getId());

        } else if (status == RentalRequest.RentalStatus.REJECTED) {
            notificationService.send(request.getTenant(), "REQUEST_REJECTED", "Your request for \"" + propTitle + "\" was not approved. Browse other listings.", request.getId());
        }

        rentalRequestRepository.save(request);
        return RentalRequestDTO.from(request);
    }

    @Transactional(readOnly = true)
    public RentalRequestDTO getActiveTenant(Long propertyId, User owner) {
        Property property = propertyRepository.findById(propertyId).orElseThrow(() -> new IllegalArgumentException("Property not found."));
        if (!property.getOwner().getId().equals(owner.getId())) throw new IllegalArgumentException("You do not own this property.");
        return rentalRequestRepository.findByPropertyIdAndStatus(propertyId, RentalRequest.RentalStatus.CONFIRMED).map(RentalRequestDTO::from).orElse(null);
    }

    @Transactional
    public RentalRequestDTO updateLease(Long requestId, int adjustMonths, User owner) {
        RentalRequest request = rentalRequestRepository.findById(requestId).orElseThrow(() -> new IllegalArgumentException("Request not found."));
        if (!request.getProperty().getOwner().getId().equals(owner.getId())) throw new IllegalArgumentException("You do not own this property.");
        if (request.getStatus() != RentalRequest.RentalStatus.CONFIRMED) throw new IllegalArgumentException("Lease can only be modified for active (CONFIRMED) tenants.");

        int oldDuration = request.getLeaseDurationMonths();
        int newDuration = oldDuration + adjustMonths;
        if (newDuration < 1) throw new IllegalArgumentException("Lease duration cannot be less than 1 month.");
        request.setLeaseDurationMonths(newDuration);
        rentalRequestRepository.save(request);

        List<RentalPayment> allPayments = rentalPaymentRepository.findByRentalRequestIdOrderByInstallmentNumberAsc(requestId);
        if (!allPayments.isEmpty()) {
            if (adjustMonths < 0) {
                allPayments.stream().filter(p -> p.getInstallmentNumber() > newDuration && p.getStatus() != RentalPayment.PaymentStatus.PAID).forEach(rentalPaymentRepository::delete);
            } else {
                double monthlyAmount = request.getProperty().getPrice();
                LocalDate startDate  = request.getStartDate();
                int lastInstallment  = allPayments.stream().mapToInt(RentalPayment::getInstallmentNumber).max().orElse(0);
                for (int i = lastInstallment + 1; i <= newDuration; i++) {
                    RentalPayment p = RentalPayment.builder().rentalRequest(request).installmentNumber(i).amount(monthlyAmount).dueDate(startDate.plusMonths(i - 1)).status(RentalPayment.PaymentStatus.PENDING).build();
                    rentalPaymentRepository.save(p);
                }
            }
        }

        String action = adjustMonths > 0 ? "extended by " + adjustMonths : "reduced by " + Math.abs(adjustMonths);
        notificationService.send(request.getTenant(), "LEASE_EXTENDED", "Your lease for \"" + request.getProperty().getTitle() + "\" has been " + action + " month(s). New total: " + newDuration + " month(s).", request.getId());
        return RentalRequestDTO.from(request);
    }

    @Transactional
    public RentalRequestDTO terminateLease(Long requestId, User owner) {
        RentalRequest request = rentalRequestRepository.findById(requestId).orElseThrow(() -> new IllegalArgumentException("Request not found."));
        if (!request.getProperty().getOwner().getId().equals(owner.getId())) throw new IllegalArgumentException("You do not own this property.");
        if (request.getStatus() != RentalRequest.RentalStatus.CONFIRMED) throw new IllegalArgumentException("Only active (CONFIRMED) leases can be terminated.");

        request.setStatus(RentalRequest.RentalStatus.TERMINATED);
        rentalRequestRepository.save(request);

        Property property = request.getProperty();
        property.setStatus(Property.PropertyStatus.AVAILABLE);
        propertyRepository.save(property);

        notificationService.send(request.getTenant(), "LEASE_TERMINATED", "Your lease for \"" + property.getTitle() + "\" has been terminated by the owner.", request.getId());

        return RentalRequestDTO.from(request);
    }
}