package edu.cit.saligue.cebunest.dto;

import edu.cit.saligue.cebunest.entity.Property;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
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
    private LocalDateTime  createdAt;

    @Data
    @AllArgsConstructor
    public static class ImageDTO {
        private Long   id;
        private String imageUrl;
    }

    public static PropertyDTO from(Property p) {
        List<ImageDTO> images = (p.getImages() == null) ? List.of() :
                p.getImages().stream()
                        .map(i -> new ImageDTO(i.getId(), i.getImageUrl()))
                        .toList();

        return PropertyDTO.builder()
                .id(p.getId())
                .title(p.getTitle())
                .description(p.getDescription())
                .price(p.getPrice())
                .location(p.getLocation())
                .typeId(p.getType()   != null ? p.getType().getId()   : null)
                .type(p.getType()     != null ? p.getType().getName() : null)
                .status(p.getStatus().name())
                .beds(p.getBeds())
                .baths(p.getBaths())
                .sqm(p.getSqm())
                .ownerId(p.getOwner().getId())
                .ownerName(p.getOwner().getName())
                .images(images)
                .createdAt(p.getCreatedAt())
                .build();
    }
}