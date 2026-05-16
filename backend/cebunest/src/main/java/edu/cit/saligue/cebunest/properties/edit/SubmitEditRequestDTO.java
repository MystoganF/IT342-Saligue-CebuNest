package edu.cit.saligue.cebunest.properties.edit;

import lombok.Data;

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
}