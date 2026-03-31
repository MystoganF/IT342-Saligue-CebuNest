package edu.cit.saligue.cebunest.service;

import edu.cit.saligue.cebunest.dto.CreateRentalRequestDTO;
import edu.cit.saligue.cebunest.dto.RentalRequestDTO;
import edu.cit.saligue.cebunest.entity.Property;
import edu.cit.saligue.cebunest.entity.RentalPayment;
import edu.cit.saligue.cebunest.entity.RentalRequest;
import edu.cit.saligue.cebunest.entity.User;
import edu.cit.saligue.cebunest.repository.PropertyRepository;
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
    private final EmailService            emailService;
    private final RentalPaymentRepository rentalPaymentRepository;
    // ── Tenant: submit a request ─────────────────────────────────────────
    @Transactional
    public RentalRequestDTO createRequest(CreateRentalRequestDTO dto, User tenant) {
        Property property = propertyRepository.findById(dto.getPropertyId())
                .orElseThrow(() -> new IllegalArgumentException("Property not found."));

        if (property.getStatus() != Property.PropertyStatus.AVAILABLE)
            throw new IllegalArgumentException("This property is no longer available.");

        boolean alreadyRequested = rentalRequestRepository
                .existsByTenantIdAndPropertyIdAndStatusIn(
                        tenant.getId(), property.getId(),
                        List.of(RentalRequest.RentalStatus.PENDING,
                                RentalRequest.RentalStatus.APPROVED)
                );
        if (alreadyRequested)
            throw new IllegalArgumentException("You already have an active request for this property.");

        RentalRequest request = RentalRequest.builder()
                .property(property)
                .tenant(tenant)
                .startDate(dto.getStartDate())
                .leaseDurationMonths(dto.getLeaseDurationMonths())
                .status(RentalRequest.RentalStatus.PENDING)
                .createdAt(LocalDateTime.now())
                .build();

        RentalRequest saved = rentalRequestRepository.save(request);

        emailService.sendEmail(tenant.getEmail(),
                "CebuNest – Rental Request Received",
                "Hi " + tenant.getName() + ",\n\n" +
                        "Your rental request for \"" + property.getTitle() + "\" has been submitted.\n" +
                        "Status: PENDING\n\nYou will be notified once the owner reviews your request.\n\n" +
                        "— CebuNest Team");

        emailService.sendEmail(property.getOwner().getEmail(),
                "CebuNest – New Rental Request",
                "Hi " + property.getOwner().getName() + ",\n\n" +
                        "A new rental request has been submitted for \"" + property.getTitle() + "\".\n" +
                        "Tenant: " + tenant.getName() + " (" + tenant.getEmail() + ")\n" +
                        "Start Date: " + dto.getStartDate() + "\n" +
                        "Lease Duration: " + dto.getLeaseDurationMonths() + " month(s)\n\n" +
                        "Log in to your dashboard to approve or reject.\n\n— CebuNest Team");

        return RentalRequestDTO.from(saved);
    }

    // ── Tenant: view own requests ─────────────────────────────────────────
    @Transactional(readOnly = true)
    public List<RentalRequestDTO> getMyRequests(User tenant) {
        return rentalRequestRepository
                .findByTenantIdOrderByCreatedAtDesc(tenant.getId())
                .stream().map(RentalRequestDTO::from).toList();
    }

    // ── Owner: view requests for a property ──────────────────────────────
    @Transactional(readOnly = true)
    public List<RentalRequestDTO> getRequestsForProperty(Long propertyId, User owner) {
        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new IllegalArgumentException("Property not found."));

        if (!property.getOwner().getId().equals(owner.getId()))
            throw new IllegalArgumentException("You do not own this property.");

        return rentalRequestRepository
                .findByPropertyIdOrderByCreatedAtDesc(propertyId)
                .stream().map(RentalRequestDTO::from).toList();
    }



    // ── Owner: approve or reject a request ───────────────────────────────
    @Transactional
    public RentalRequestDTO updateRequestStatus(Long requestId, String newStatus, User owner) {
        RentalRequest request = rentalRequestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("Request not found."));

        if (!request.getProperty().getOwner().getId().equals(owner.getId()))
            throw new IllegalArgumentException("You do not own this property.");

        if (request.getStatus() != RentalRequest.RentalStatus.PENDING)
            throw new IllegalArgumentException("Only pending requests can be updated.");

        RentalRequest.RentalStatus status = RentalRequest.RentalStatus.valueOf(newStatus);
        request.setStatus(status);
        rentalRequestRepository.save(request);

        String tenantEmail = request.getTenant().getEmail();
        String tenantName  = request.getTenant().getName();
        String propTitle   = request.getProperty().getTitle();

        if (status == RentalRequest.RentalStatus.APPROVED) {
            emailService.sendEmail(tenantEmail,
                    "CebuNest – Rental Request Approved! 🎉",
                    "Hi " + tenantName + ",\n\n" +
                            "Great news! Your rental request for \"" + propTitle + "\" has been approved.\n" +
                            "The owner will contact you shortly to arrange next steps.\n\n— CebuNest Team");
        } else if (status == RentalRequest.RentalStatus.REJECTED) {
            emailService.sendEmail(tenantEmail,
                    "CebuNest – Rental Request Update",
                    "Hi " + tenantName + ",\n\n" +
                            "Unfortunately, your rental request for \"" + propTitle + "\" was not approved.\n" +
                            "You may browse other available properties on CebuNest.\n\n— CebuNest Team");
        }

        return RentalRequestDTO.from(request);
    }

    // ── Owner: get active (CONFIRMED) tenant for a property ──────────────
    @Transactional(readOnly = true)
    public RentalRequestDTO getActiveTenant(Long propertyId, User owner) {
        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new IllegalArgumentException("Property not found."));

        if (!property.getOwner().getId().equals(owner.getId()))
            throw new IllegalArgumentException("You do not own this property.");

        return rentalRequestRepository
                .findByPropertyIdAndStatus(propertyId, RentalRequest.RentalStatus.CONFIRMED)
                .map(RentalRequestDTO::from)
                .orElse(null); // null = no active tenant
    }

    @Transactional
    public RentalRequestDTO updateLease(Long requestId, int adjustMonths, User owner) {
        RentalRequest request = rentalRequestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("Request not found."));

        if (!request.getProperty().getOwner().getId().equals(owner.getId()))
            throw new IllegalArgumentException("You do not own this property.");

        if (request.getStatus() != RentalRequest.RentalStatus.CONFIRMED)
            throw new IllegalArgumentException("Lease can only be modified for active (CONFIRMED) tenants.");

        int oldDuration = request.getLeaseDurationMonths();
        int newDuration = oldDuration + adjustMonths;
        if (newDuration < 1)
            throw new IllegalArgumentException("Lease duration cannot be less than 1 month.");

        request.setLeaseDurationMonths(newDuration);
        rentalRequestRepository.save(request);

        // ── Sync payment schedule (always MONTHLY) ───────────────────────────
        List<RentalPayment> allPayments = rentalPaymentRepository
                .findByRentalRequestIdOrderByInstallmentNumberAsc(requestId);

        if (allPayments.isEmpty()) {
            // Tenant hasn't confirmed yet — nothing to sync

        } else if (adjustMonths < 0) {
            // Reducing: delete PENDING/OVERDUE rows beyond newDuration
            allPayments.stream()
                    .filter(p -> p.getInstallmentNumber() > newDuration
                            && p.getStatus() != RentalPayment.PaymentStatus.PAID)
                    .forEach(rentalPaymentRepository::delete);

        } else {
            // Extending: add new PENDING rows for the added months
            double monthlyAmount = request.getProperty().getPrice();
            LocalDate startDate  = request.getStartDate();

            int lastInstallment = allPayments.stream()
                    .mapToInt(RentalPayment::getInstallmentNumber)
                    .max().orElse(0);

            for (int i = lastInstallment + 1; i <= newDuration; i++) {
                RentalPayment p = RentalPayment.builder()
                        .rentalRequest(request)
                        .installmentNumber(i)
                        .amount(monthlyAmount)
                        .dueDate(startDate.plusMonths(i - 1))
                        .status(RentalPayment.PaymentStatus.PENDING)
                        .build();
                rentalPaymentRepository.save(p);
            }
        }

        String action = adjustMonths > 0
                ? "extended by " + adjustMonths
                : "reduced by " + Math.abs(adjustMonths);
        emailService.sendEmail(
                request.getTenant().getEmail(),
                "CebuNest – Lease Duration Updated",
                "Hi " + request.getTenant().getName() + ",\n\n" +
                        "Your lease for \"" + request.getProperty().getTitle() + "\" has been " + action + " month(s).\n" +
                        "New total duration: " + newDuration + " month(s).\n\n— CebuNest Team");

        return RentalRequestDTO.from(request);
    }

    // ── Owner: terminate lease (evict tenant) ────────────────────────────
    @Transactional
    public RentalRequestDTO terminateLease(Long requestId, User owner) {
        RentalRequest request = rentalRequestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("Request not found."));

        if (!request.getProperty().getOwner().getId().equals(owner.getId()))
            throw new IllegalArgumentException("You do not own this property.");

        if (request.getStatus() != RentalRequest.RentalStatus.CONFIRMED)
            throw new IllegalArgumentException("Only active (CONFIRMED) leases can be terminated.");

        request.setStatus(RentalRequest.RentalStatus.TERMINATED);
        rentalRequestRepository.save(request);

        // Free the property back to AVAILABLE
        Property property = request.getProperty();
        property.setStatus(Property.PropertyStatus.AVAILABLE);
        propertyRepository.save(property);

        emailService.sendEmail(
                request.getTenant().getEmail(),
                "CebuNest – Lease Terminated",
                "Hi " + request.getTenant().getName() + ",\n\n" +
                        "Your lease for \"" + property.getTitle() + "\" has been terminated by the owner.\n" +
                        "Please make arrangements to vacate the property.\n\n— CebuNest Team");

        return RentalRequestDTO.from(request);
    }

    // ── Tenant: get their own request for a specific property ─────────────
    @Transactional(readOnly = true)
    public RentalRequestDTO getMyRequestForProperty(Long propertyId, User tenant) {
        return rentalRequestRepository
                .findFirstByTenantIdAndPropertyIdOrderByCreatedAtDesc(tenant.getId(), propertyId)
                .map(RentalRequestDTO::from)
                .orElse(null);
    }
}