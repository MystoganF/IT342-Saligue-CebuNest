package edu.cit.saligue.cebunest.service;

import edu.cit.saligue.cebunest.dto.CreateRentalRequestDTO;
import edu.cit.saligue.cebunest.dto.RentalRequestDTO;
import edu.cit.saligue.cebunest.properties.shared.Property;
import edu.cit.saligue.cebunest.entity.RentalPayment;
import edu.cit.saligue.cebunest.entity.RentalRequest;
import edu.cit.saligue.cebunest.users.shared.User;
import edu.cit.saligue.cebunest.properties.shared.PropertyRepository;
import edu.cit.saligue.cebunest.repository.RentalPaymentRepository;
import edu.cit.saligue.cebunest.repository.RentalRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class RentalRequestService {

    private final RentalRequestRepository rentalRequestRepository;
    private final PropertyRepository      propertyRepository;
    private final RentalPaymentRepository rentalPaymentRepository;
    private final NotificationService     notificationService;

    @Transactional
    public RentalRequestDTO createRequest(CreateRentalRequestDTO dto, User tenant) {
        Property property = propertyRepository.findById(dto.getPropertyId())
                .orElseThrow(() -> new IllegalArgumentException("Property not found."));

        if (property.getStatus() != Property.PropertyStatus.AVAILABLE)
            throw new IllegalArgumentException("This property is no longer available.");

        boolean alreadyRequested = rentalRequestRepository
                .existsByTenantIdAndPropertyIdAndStatusIn(
                        tenant.getId(), property.getId(),
                        List.of(RentalRequest.RentalStatus.PENDING, RentalRequest.RentalStatus.APPROVED)
                );
        if (alreadyRequested) throw new IllegalArgumentException("You already have an active request for this property.");

        RentalRequest request = RentalRequest.builder()
                .property(property)
                .tenant(tenant)
                .startDate(dto.getStartDate())
                .leaseDurationMonths(dto.getLeaseDurationMonths())
                .status(RentalRequest.RentalStatus.PENDING)
                .createdAt(LocalDateTime.now())
                .build();

        RentalRequest saved = rentalRequestRepository.save(request);

        notificationService.send(tenant, "REQUEST_PENDING", "Your rental request for \"" + property.getTitle() + "\" has been submitted. Waiting for owner review.", property.getId());
        notificationService.send(property.getOwner(), "NEW_RENTAL_REQUEST", "You have a new rental request from " + tenant.getName() + " for \"" + property.getTitle() + "\".", null, property.getId());

        return RentalRequestDTO.from(saved);
    }

    @Transactional(readOnly = true)
    public List<RentalRequestDTO> getMyRequests(User tenant) {
        return rentalRequestRepository.findByTenantIdOrderByCreatedAtDesc(tenant.getId()).stream().map(RentalRequestDTO::from).toList();
    }

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

        RentalRequest.RentalStatus status = RentalRequest.RentalStatus.valueOf(newStatus);
        request.setStatus(status);
        rentalRequestRepository.save(request);

        String propTitle = request.getProperty().getTitle();

        if (status == RentalRequest.RentalStatus.APPROVED) {
            List<RentalRequest> otherPending = rentalRequestRepository.findAllByPropertyIdAndStatus(request.getProperty().getId(), RentalRequest.RentalStatus.PENDING);
            for (RentalRequest otherReq : otherPending) {
                if (!otherReq.getId().equals(request.getId())) {
                    otherReq.setStatus(RentalRequest.RentalStatus.REJECTED);
                    rentalRequestRepository.save(otherReq);
                    notificationService.send(otherReq.getTenant(), "REQUEST_REJECTED", "Your request for \"" + propTitle + "\" was not approved. Browse other listings.", otherReq.getId());
                }
            }
            notificationService.send(request.getTenant(), "REQUEST_APPROVED", "🎉 Your request for \"" + propTitle + "\" was approved! Tap to confirm your rental.", request.getId());
        } else if (status == RentalRequest.RentalStatus.REJECTED) {
            notificationService.send(request.getTenant(), "REQUEST_REJECTED", "Your request for \"" + propTitle + "\" was not approved. Browse other listings.", request.getId());
        }

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

    @Transactional(readOnly = true)
    public RentalRequestDTO getMyRequestForProperty(Long propertyId, User tenant) {
        return rentalRequestRepository.findFirstByTenantIdAndPropertyIdOrderByCreatedAtDesc(tenant.getId(), propertyId).map(RentalRequestDTO::from).orElse(null);
    }
}