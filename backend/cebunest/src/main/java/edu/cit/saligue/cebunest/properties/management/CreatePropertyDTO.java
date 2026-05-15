package edu.cit.saligue.cebunest.properties.management;

import lombok.Data;

@Data
public class CreatePropertyDTO {
    private String  title;
    private String  description;
    private Double  price;
    private String  location;
    private Long    typeId;       // FK → property_types.id
    private Integer beds;
    private Integer baths;
    private Integer sqm;
}