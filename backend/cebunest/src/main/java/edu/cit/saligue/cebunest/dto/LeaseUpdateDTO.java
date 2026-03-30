package edu.cit.saligue.cebunest.dto;

import lombok.Data;

@Data
public class LeaseUpdateDTO {
    private Integer adjustMonths; // positive = extend, negative = reduce
}