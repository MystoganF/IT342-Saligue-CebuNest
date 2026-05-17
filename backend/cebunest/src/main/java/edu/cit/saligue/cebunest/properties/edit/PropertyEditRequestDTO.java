package edu.cit.saligue.cebunest.properties.edit;

import edu.cit.saligue.cebunest.properties.shared.PropertyImage;
import lombok.Builder;
import lombok.Data;

import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Data
@Builder
public class PropertyEditRequestDTO {

    private Long   id;
    private Long   propertyId;
    private String propertyCurrentStatus;

    // Submitter
    private Long   submittedById;
    private String submittedByName;
    private String submittedByEmail;

    // Edit status
    private String editStatus;

    // Previous values
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

    // Diff flags
    private boolean titleChanged;
    private boolean descriptionChanged;
    private boolean priceChanged;
    private boolean locationChanged;
    private boolean typeChanged;
    private boolean bedsChanged;
    private boolean bathsChanged;
    private boolean sqmChanged;

    // ── Image diff ────────────────────────────────────────────────────────
    // URLs of the current live images on the property at time of submission
    private List<ImageInfo> previousImages;

    // URLs of newly uploaded images (isPending=true) waiting for approval
    private List<ImageInfo> proposedNewImages;

    // IDs of existing images the owner wants to remove
    private List<Long> removedImageIds;

    // true if any image change was requested
    private boolean imagesChanged;

    // First live image URL — used as thumbnail on the admin list page
    private String firstImageUrl;

    // Admin review
    private Long   reviewedById;
    private String reviewedByName;
    private String rejectionReason;
    private String reviewedAt;

    private String createdAt;

    // ── Nested image info ─────────────────────────────────────────────────
    @Data
    @Builder
    public static class ImageInfo {
        private Long   id;
        private String imageUrl;
    }

    // ── Helpers ───────────────────────────────────────────────────────────
    private static List<Long> parseIds(String csv) {
        if (csv == null || csv.isBlank()) return Collections.emptyList();
        return Arrays.stream(csv.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(Long::parseLong)
                .collect(Collectors.toList());
    }

    // ── Factory ───────────────────────────────────────────────────────────
    public static PropertyEditRequestDTO from(PropertyEditRequest e) {

        // Parse stored comma-separated IDs
        List<Long> removedIds = parseIds(e.getRemovedImageIds());
        List<Long> pendingIds = parseIds(e.getPendingImageIds());

        // Current live images on the property (excluding any already-pending ones
        // so we don't double-count)
        List<ImageInfo> previousImages = e.getProperty().getImages() == null
                ? Collections.emptyList()
                : e.getProperty().getImages().stream()
                .filter(img -> !img.isPending())
                .map(img -> ImageInfo.builder()
                        .id(img.getId())
                        .imageUrl(img.getImageUrl())
                        .build())
                .collect(Collectors.toList());

        // Newly uploaded pending images attached to this edit request
        List<ImageInfo> pendingImages = e.getProperty().getImages() == null
                ? Collections.emptyList()
                : e.getProperty().getImages().stream()
                .filter(img -> img.isPending() && pendingIds.contains(img.getId()))
                .map(img -> ImageInfo.builder()
                        .id(img.getId())
                        .imageUrl(img.getImageUrl())
                        .build())
                .collect(Collectors.toList());

        boolean imagesChanged = !removedIds.isEmpty() || !pendingIds.isEmpty();

        // First live image — used as thumbnail on the admin list page
        String firstImageUrl = e.getProperty().getImages() == null ? null
                : e.getProperty().getImages().stream()
                .filter(img -> !img.isPending())
                .findFirst()
                .map(PropertyImage::getImageUrl)
                .orElse(null);

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

                // Images
                .previousImages(previousImages)
                .proposedNewImages(pendingImages)
                .removedImageIds(removedIds)
                .imagesChanged(imagesChanged)
                .firstImageUrl(firstImageUrl)

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