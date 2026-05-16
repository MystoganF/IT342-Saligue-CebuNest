package edu.cit.saligue.cebunest.properties.edit;

import lombok.Builder;
import lombok.Data;

import java.time.format.DateTimeFormatter;
import java.util.Objects;

@Data
@Builder
public class PropertyEditRequestDTO {

    private Long   id;
    private Long   propertyId;
    private String propertyCurrentStatus; // live status at query time

    // Submitter
    private Long   submittedById;
    private String submittedByName;
    private String submittedByEmail;

    // Edit status
    private String editStatus; // PENDING / APPROVED / REJECTED

    // Previous values (live at time of submission)
    private String  previousTitle;
    private String  previousDescription;
    private Double  previousPrice;
    private String  previousLocation;
    private Long    previousTypeId;
    private String  previousTypeName;
    private Integer previousBeds;
    private Integer previousBaths;
    private Integer previousSqm;
    private String  previousPropertyStatus;

    // Proposed values
    private String  proposedTitle;
    private String  proposedDescription;
    private Double  proposedPrice;
    private String  proposedLocation;
    private Long    proposedTypeId;
    private String  proposedTypeName;
    private Integer proposedBeds;
    private Integer proposedBaths;
    private Integer proposedSqm;

    // Diff flags — true if the field actually changed (used by the frontend diff renderer)
    private boolean titleChanged;
    private boolean descriptionChanged;
    private boolean priceChanged;
    private boolean locationChanged;
    private boolean typeChanged;
    private boolean bedsChanged;
    private boolean bathsChanged;
    private boolean sqmChanged;

    // Admin review
    private Long   reviewedById;
    private String reviewedByName;
    private String rejectionReason;
    private String reviewedAt;

    private String createdAt;

    // ── Factory ──────────────────────────────────────────────────────────
    public static PropertyEditRequestDTO from(PropertyEditRequest e) {
        return PropertyEditRequestDTO.builder()
                .id(e.getId())
                .propertyId(e.getProperty().getId())
                .propertyCurrentStatus(e.getProperty().getStatus() != null
                        ? e.getProperty().getStatus().name() : null)

                .submittedById(e.getSubmittedBy() != null ? e.getSubmittedBy().getId() : null)
                .submittedByName(e.getSubmittedBy() != null ? e.getSubmittedBy().getName() : null)
                .submittedByEmail(e.getSubmittedBy() != null ? e.getSubmittedBy().getEmail() : null)

                .editStatus(e.getEditStatus().name())

                // Previous
                .previousTitle(e.getPreviousTitle())
                .previousDescription(e.getPreviousDescription())
                .previousPrice(e.getPreviousPrice())
                .previousLocation(e.getPreviousLocation())
                .previousTypeId(e.getPreviousTypeId())
                .previousTypeName(e.getPreviousTypeName())
                .previousBeds(e.getPreviousBeds())
                .previousBaths(e.getPreviousBaths())
                .previousSqm(e.getPreviousSqm())
                .previousPropertyStatus(e.getPreviousPropertyStatus())

                // Proposed
                .proposedTitle(e.getProposedTitle())
                .proposedDescription(e.getProposedDescription())
                .proposedPrice(e.getProposedPrice())
                .proposedLocation(e.getProposedLocation())
                .proposedTypeId(e.getProposedTypeId())
                .proposedTypeName(e.getProposedTypeName())
                .proposedBeds(e.getProposedBeds())
                .proposedBaths(e.getProposedBaths())
                .proposedSqm(e.getProposedSqm())

                // Diff flags
                .titleChanged(!Objects.equals(e.getPreviousTitle(), e.getProposedTitle()))
                .descriptionChanged(!Objects.equals(e.getPreviousDescription(), e.getProposedDescription()))
                .priceChanged(!Objects.equals(e.getPreviousPrice(), e.getProposedPrice()))
                .locationChanged(!Objects.equals(e.getPreviousLocation(), e.getProposedLocation()))
                .typeChanged(!Objects.equals(e.getPreviousTypeId(), e.getProposedTypeId()))
                .bedsChanged(!Objects.equals(e.getPreviousBeds(), e.getProposedBeds()))
                .bathsChanged(!Objects.equals(e.getPreviousBaths(), e.getProposedBaths()))
                .sqmChanged(!Objects.equals(e.getPreviousSqm(), e.getProposedSqm()))

                // Review
                .reviewedById(e.getReviewedBy() != null ? e.getReviewedBy().getId() : null)
                .reviewedByName(e.getReviewedBy() != null ? e.getReviewedBy().getName() : null)
                .rejectionReason(e.getRejectionReason())
                .reviewedAt(e.getReviewedAt() != null
                        ? e.getReviewedAt().format(DateTimeFormatter.ISO_DATE_TIME) : null)

                .createdAt(e.getCreatedAt() != null
                        ? e.getCreatedAt().format(DateTimeFormatter.ISO_DATE_TIME) : null)
                .build();
    }
}