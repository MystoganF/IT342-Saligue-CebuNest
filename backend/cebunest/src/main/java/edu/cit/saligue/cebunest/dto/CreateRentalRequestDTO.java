package edu.cit.saligue.cebunest.dto;

import lombok.Data;
import java.time.LocalDate;

@Data
public class CreateRentalRequestDTO {
    private Long propertyId;
    private LocalDate startDate;
    private Integer leaseDurationMonths;
}