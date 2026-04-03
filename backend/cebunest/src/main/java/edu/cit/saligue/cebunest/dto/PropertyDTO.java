package edu.cit.saligue.cebunest.dto;

import edu.cit.saligue.cebunest.entity.Property;
import edu.cit.saligue.cebunest.entity.PropertyImage;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.ArrayList;
import java.util.List;


@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PropertyDTO {

    private Long    id;
    private String  title;
    private String  description;
    private Double  price;
    private String  location;
    private Long    typeId;
    private String  type;
    private String  status;
    private Integer beds;
    private Integer baths;
    private Integer sqm;
    private Long    ownerId;
    private String  ownerName;
    private List<ImageDTO> images;
    private String  createdAt;

    private boolean hasActiveTenant;
    private ActiveTenantDTO activeTenant;
    private String  rejectionReason;

    // --- NEW: Lockout Fields ---
    private boolean isAdminDisabled;
    private String  adminNote;
    // ---------------------------

    private String ownerFacebookUrl;
    private String ownerInstagramUrl;
    private String ownerTwitterUrl;

    @Data
    @AllArgsConstructor
    public static class ImageDTO {
        private Long   id;
        private String imageUrl;
    }

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class ActiveTenantDTO {
        private Long tenantId;
        private String tenantName;
        private String tenantEmail;
        private String startDate;
        private Integer leaseDurationMonths;
    }

    public static PropertyDTO from(Property p) {
        return fromWithCover(p, null);
    }

    public static PropertyDTO from(Property p, String rejectionReason) {
        PropertyDTO dto = fromWithCover(p, null);
        dto.setRejectionReason(rejectionReason);
        return dto;
    }

    public static PropertyDTO fromWithCover(Property p, Long coverImageId) {
        List<PropertyImage> raw = p.getImages() == null ? List.of() : new ArrayList<>(p.getImages());

        if (coverImageId != null) {
            raw.sort((a, b) -> {
                if (a.getId().equals(coverImageId)) return -1;
                if (b.getId().equals(coverImageId)) return 1;
                return Long.compare(a.getId(), b.getId());
            });
        }

        List<ImageDTO> images = raw.stream()
                .map(i -> new ImageDTO(i.getId(), i.getImageUrl()))
                .toList();

        return PropertyDTO.builder()
                .id(p.getId())
                .title(p.getTitle())
                .description(p.getDescription())
                .price(p.getPrice())
                .location(p.getLocation())
                .typeId(p.getType() != null ? p.getType().getId() : null)
                .type(p.getType() != null ? p.getType().getName() : null)
                .status(p.getStatus().name())
                .isAdminDisabled(p.isAdminDisabled()) // Map the new field
                .adminNote(p.getAdminNote())           // Map the new field
                .beds(p.getBeds())
                .baths(p.getBaths())
                .sqm(p.getSqm())
                .ownerId(p.getOwner().getId())
                .ownerName(p.getOwner().getName())
                .ownerFacebookUrl(p.getOwner().getFacebookUrl())
                .ownerInstagramUrl(p.getOwner().getInstagramUrl())
                .ownerTwitterUrl(p.getOwner().getTwitterUrl())
                .images(images)
                .createdAt(p.getCreatedAt() != null
                        ? p.getCreatedAt().format(java.time.format.DateTimeFormatter.ISO_DATE_TIME)
                        : null)
                .build();
    }
}