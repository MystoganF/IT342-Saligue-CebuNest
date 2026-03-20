package edu.cit.saligue.cebunest.dto;

import edu.cit.saligue.cebunest.entity.Property;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PropertyDTO {

    private Long id;
    private String title;
    private String description;
    private Double price;
    private String location;
    private String type;
    private String status;
    private Integer beds;
    private Integer baths;
    private Integer sqm;
    private Long ownerId;
    private String ownerName;
    private LocalDateTime createdAt;

    public static PropertyDTO from(Property p) {
        return PropertyDTO.builder()
                .id(p.getId())
                .title(p.getTitle())
                .description(p.getDescription())
                .price(p.getPrice())
                .location(p.getLocation())
                .type(p.getType())
                .status(p.getStatus().name())
                .beds(p.getBeds())
                .baths(p.getBaths())
                .sqm(p.getSqm())
                .ownerId(p.getOwner().getId())
                .ownerName(p.getOwner().getName())
                .createdAt(p.getCreatedAt())
                .build();
    }
}