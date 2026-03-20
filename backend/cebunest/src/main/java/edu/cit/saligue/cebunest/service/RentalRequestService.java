package edu.cit.saligue.cebunest.service;

import edu.cit.saligue.cebunest.dto.CreateRentalRequestDTO;
import edu.cit.saligue.cebunest.dto.RentalRequestDTO;
import edu.cit.saligue.cebunest.entity.Property;
import edu.cit.saligue.cebunest.entity.RentalRequest;
import edu.cit.saligue.cebunest.entity.User;
import edu.cit.saligue.cebunest.repository.PropertyRepository;
import edu.cit.saligue.cebunest.repository.RentalRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class RentalRequestService {

    private final RentalRequestRepository rentalRequestRepository;
    private final PropertyRepository propertyRepository;
    private final EmailService emailService;

    public RentalRequestDTO createRequest(CreateRentalRequestDTO dto, User tenant) {

        Property property = propertyRepository.findById(dto.getPropertyId())
                .orElseThrow(() -> new IllegalArgumentException("Property not found."));

        if (property.getStatus() != Property.PropertyStatus.AVAILABLE) {
            throw new IllegalArgumentException("This property is no longer available.");
        }

        boolean alreadyRequested = rentalRequestRepository
                .existsByTenantIdAndPropertyIdAndStatusIn(
                        tenant.getId(),
                        property.getId(),
                        List.of(RentalRequest.RentalStatus.PENDING,
                                RentalRequest.RentalStatus.APPROVED)
                );
        if (alreadyRequested) {
            throw new IllegalArgumentException(
                    "You already have an active request for this property."
            );
        }

        RentalRequest request = RentalRequest.builder()
                .property(property)
                .tenant(tenant)
                .startDate(dto.getStartDate())
                .leaseDurationMonths(dto.getLeaseDurationMonths())
                .status(RentalRequest.RentalStatus.PENDING)
                .createdAt(LocalDateTime.now())
                .build();

        RentalRequest saved = rentalRequestRepository.save(request);

        // Notify tenant
        emailService.sendEmail(
                tenant.getEmail(),
                "CebuNest – Rental Request Received",
                "Hi " + tenant.getName() + ",\n\n" +
                        "Your rental request for \"" + property.getTitle() + "\" has been submitted.\n" +
                        "Status: PENDING\n\n" +
                        "You will be notified once the owner reviews your request.\n\n" +
                        "— CebuNest Team"
        );

        // Notify owner
        emailService.sendEmail(
                property.getOwner().getEmail(),
                "CebuNest – New Rental Request",
                "Hi " + property.getOwner().getName() + ",\n\n" +
                        "A new rental request has been submitted for \"" + property.getTitle() + "\".\n" +
                        "Tenant: " + tenant.getName() + " (" + tenant.getEmail() + ")\n" +
                        "Start Date: " + dto.getStartDate() + "\n" +
                        "Lease Duration: " + dto.getLeaseDurationMonths() + " month(s)\n\n" +
                        "Log in to your dashboard to approve or reject.\n\n" +
                        "— CebuNest Team"
        );

        return RentalRequestDTO.from(saved);
    }

    public List<RentalRequestDTO> getMyRequests(User tenant) {
        return rentalRequestRepository
                .findByTenantIdOrderByCreatedAtDesc(tenant.getId())
                .stream()
                .map(RentalRequestDTO::from)
                .toList();
    }
}