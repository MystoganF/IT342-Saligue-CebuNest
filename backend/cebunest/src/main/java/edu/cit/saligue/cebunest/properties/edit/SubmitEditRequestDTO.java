package edu.cit.saligue.cebunest.properties.edit;

import lombok.Data;
import java.util.List;

@Data
public class SubmitEditRequestDTO {
    private String  title;
    private String  description;
    private Double  price;
    private String  location;
    private Long    typeId;
    private Integer beds;
    private Integer baths;
    private Integer sqm;

    // IDs of existing PropertyImage rows the owner wants to remove.
    // These are applied (deleted) only if the admin approves the edit request.
    private List<Long> removedImageIds;

    // IDs of PropertyImage rows that were already uploaded with isPending=true
    // before the owner submitted this edit request (uploaded via /api/properties/{id}/images/pending).
    // These are activated (isPending → false) on approval, or deleted on rejection.
    private List<Long> pendingImageIds;
}