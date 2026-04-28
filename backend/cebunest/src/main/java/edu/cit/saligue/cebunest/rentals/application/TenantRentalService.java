package edu.cit.saligue.cebunest.rentals.application;

import edu.cit.saligue.cebunest.rentals.application.CreateRentalRequestDTO;
import edu.cit.saligue.cebunest.properties.shared.Property;
import edu.cit.saligue.cebunest.properties.shared.PropertyRepository;
import edu.cit.saligue.cebunest.rentals.shared.RentalRequest;
import edu.cit.saligue.cebunest.rentals.shared.RentalRequestDTO;
import edu.cit.saligue.cebunest.rentals.shared.RentalRequestRepository;
import edu.cit.saligue.cebunest.notifications.core.NotificationService;
import edu.cit.saligue.cebunest.users.shared.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TenantRentalService {

    private final RentalRequestRepository rentalRequestRepository;
    private final PropertyRepository propertyRepository;
    private final NotificationService notificationService;

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
    public RentalRequestDTO getMyRequestForProperty(Long propertyId, User tenant) {
        return rentalRequestRepository.findFirstByTenantIdAndPropertyIdOrderByCreatedAtDesc(tenant.getId(), propertyId).map(RentalRequestDTO::from).orElse(null);
    }
}