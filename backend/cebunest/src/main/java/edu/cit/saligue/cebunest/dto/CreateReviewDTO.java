package edu.cit.saligue.cebunest.dto;

import lombok.Data;

@Data
public class CreateReviewDTO {
    private Long   rentalRequestId; // which rental this review is for
    private Integer rating;         // 1–5
    private String  comment;
}