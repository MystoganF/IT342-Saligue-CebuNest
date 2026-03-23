package edu.cit.saligue.cebunest.dto;

import lombok.Data;
import java.util.List;

@Data
public class UpdatePropertyDTO {
    private String  title;
    private String  description;
    private Double  price;
    private String  location;
    private Long    typeId;
    private Integer beds;
    private Integer baths;
    private Integer sqm;
    // null = don't change status; "AVAILABLE" or "UNAVAILABLE" = toggle visibility
    private String  status;
    // IDs of existing images the owner wants to remove
    private List<Long> removedImageIds;
}