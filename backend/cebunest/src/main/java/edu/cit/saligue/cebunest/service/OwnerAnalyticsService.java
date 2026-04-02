package edu.cit.saligue.cebunest.service;

import edu.cit.saligue.cebunest.dto.RentalPaymentDTO;
import edu.cit.saligue.cebunest.entity.*;
import edu.cit.saligue.cebunest.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@RequiredArgsConstructor
public class OwnerAnalyticsService {

    private final PropertyRepository       propertyRepository;
    private final RentalRequestRepository  rentalRequestRepository;
    private final RentalPaymentRepository  rentalPaymentRepository;
    private final PropertyReviewRepository propertyReviewRepository;

    @Transactional(readOnly = true)
    public Map<String, Object> getOwnerAnalytics(User owner) {

        // ── Properties ───────────────────────────────────────────────────
        List<Property> properties = propertyRepository.findByOwnerId(owner.getId());
        List<Long> propertyIds = properties.stream().map(Property::getId).toList();

        long total       = properties.size();
        long available   = properties.stream().filter(p -> p.getStatus() == Property.PropertyStatus.AVAILABLE).count();
        long unavailable = properties.stream().filter(p -> p.getStatus() == Property.PropertyStatus.UNAVAILABLE).count();
        long pendingRev  = properties.stream().filter(p -> p.getStatus() == Property.PropertyStatus.PENDING_REVIEW).count();

        // ── Rental Requests ───────────────────────────────────────────────
        List<RentalRequest> allRequests = propertyIds.isEmpty()
                ? List.of()
                : rentalRequestRepository.findByPropertyIdInOrderByCreatedAtDesc(propertyIds);

        long reqPending    = allRequests.stream().filter(r -> r.getStatus() == RentalRequest.RentalStatus.PENDING).count();
        long reqApproved   = allRequests.stream().filter(r -> r.getStatus() == RentalRequest.RentalStatus.APPROVED).count();
        long reqRejected   = allRequests.stream().filter(r -> r.getStatus() == RentalRequest.RentalStatus.REJECTED).count();
        long reqConfirmed  = allRequests.stream().filter(r -> r.getStatus() == RentalRequest.RentalStatus.CONFIRMED).count();
        long reqTerminated = allRequests.stream().filter(r -> r.getStatus() == RentalRequest.RentalStatus.TERMINATED).count();

        long   occupied     = reqConfirmed;
        double occupancyRate = total > 0 ? (double) occupied / total * 100.0 : 0.0;

        // ── Payments ──────────────────────────────────────────────────────
        List<Long> requestIds = allRequests.stream().map(RentalRequest::getId).toList();
        List<RentalPayment> allPayments = requestIds.isEmpty()
                ? List.of()
                : rentalPaymentRepository.findByRentalRequestIdIn(requestIds);

        double totalRevenue  = allPayments.stream().filter(p -> p.getStatus() == RentalPayment.PaymentStatus.PAID).mapToDouble(RentalPayment::getAmount).sum();
        double pendingAmount = allPayments.stream().filter(p -> p.getStatus() == RentalPayment.PaymentStatus.PENDING).mapToDouble(RentalPayment::getAmount).sum();
        double overdueAmount = allPayments.stream().filter(p -> p.getStatus() == RentalPayment.PaymentStatus.OVERDUE).mapToDouble(RentalPayment::getAmount).sum();
        long paidCount    = allPayments.stream().filter(p -> p.getStatus() == RentalPayment.PaymentStatus.PAID).count();
        long pendingCount = allPayments.stream().filter(p -> p.getStatus() == RentalPayment.PaymentStatus.PENDING).count();
        long overdueCount = allPayments.stream().filter(p -> p.getStatus() == RentalPayment.PaymentStatus.OVERDUE).count();

        List<RentalPaymentDTO> paidPayments = allPayments.stream()
                .filter(p -> p.getStatus() == RentalPayment.PaymentStatus.PAID)
                .sorted(Comparator.comparing(p -> p.getPaidAt() == null ? LocalDate.MIN : p.getPaidAt(), Comparator.reverseOrder()))
                .map(RentalPaymentDTO::from).toList();

        List<RentalPaymentDTO> pendingPayments = allPayments.stream()
                .filter(p -> p.getStatus() == RentalPayment.PaymentStatus.PENDING)
                .sorted(Comparator.comparing(RentalPayment::getDueDate))
                .map(RentalPaymentDTO::from).toList();

        List<RentalPaymentDTO> overduePayments = allPayments.stream()
                .filter(p -> p.getStatus() == RentalPayment.PaymentStatus.OVERDUE)
                .sorted(Comparator.comparing(RentalPayment::getDueDate))
                .map(RentalPaymentDTO::from).toList();

        // ── Monthly Revenue (last 6 months) ───────────────────────────────
        LocalDate today = LocalDate.now();
        DateTimeFormatter monthFmt = DateTimeFormatter.ofPattern("MMM yyyy");
        List<Map<String, Object>> monthlyRevenue = new ArrayList<>();
        for (int i = 5; i >= 0; i--) {
            LocalDate month    = today.minusMonths(i).withDayOfMonth(1);
            LocalDate monthEnd = month.plusMonths(1).minusDays(1);
            double rev = allPayments.stream()
                    .filter(p -> p.getStatus() == RentalPayment.PaymentStatus.PAID
                            && p.getPaidAt() != null
                            && !p.getPaidAt().isBefore(month)
                            && !p.getPaidAt().isAfter(monthEnd))
                    .mapToDouble(RentalPayment::getAmount).sum();
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("month", month.format(monthFmt));
            entry.put("revenue", rev);
            monthlyRevenue.add(entry);
        }

        // ── Ratings ───────────────────────────────────────────────────────
        List<PropertyReview> allReviews = propertyIds.isEmpty()
                ? List.of()
                : propertyReviewRepository.findByPropertyIdIn(propertyIds);

        double overallAvg = allReviews.stream()
                .mapToInt(PropertyReview::getRating)
                .average()
                .orElse(0.0);

        List<Map<String, Object>> propertyRatings = properties.stream()
                .map(prop -> {
                    List<PropertyReview> propReviews = allReviews.stream()
                            .filter(r -> r.getProperty().getId().equals(prop.getId()))
                            .toList();

                    double avg = propReviews.stream()
                            .mapToInt(PropertyReview::getRating)
                            .average()
                            .orElse(0.0);

                    List<Map<String, Object>> dist = new ArrayList<>();
                    for (int star = 1; star <= 5; star++) {
                        final int s = star;
                        long count = propReviews.stream().filter(r -> r.getRating() == s).count();
                        Map<String, Object> d = new LinkedHashMap<>();
                        d.put("star", star);
                        d.put("count", count);
                        dist.add(d);
                    }

                    Map<String, Object> entry = new LinkedHashMap<>();
                    entry.put("propertyId",    prop.getId());
                    entry.put("propertyTitle", prop.getTitle());
                    entry.put("avgRating",     Math.round(avg * 10.0) / 10.0);
                    entry.put("reviewCount",   propReviews.size());
                    entry.put("distribution",  dist);
                    return entry;
                })
                .filter(e -> (int) e.get("reviewCount") > 0)
                .toList();

        Map<String, Object> overallRating = new LinkedHashMap<>();
        overallRating.put("average", Math.round(overallAvg * 10.0) / 10.0);
        overallRating.put("total",   allReviews.size());

        // ── Assemble response ─────────────────────────────────────────────
        Map<String, Object> data = new LinkedHashMap<>();

        Map<String, Object> propertyStats = new LinkedHashMap<>();
        propertyStats.put("total", total); propertyStats.put("available", available);
        propertyStats.put("unavailable", unavailable); propertyStats.put("pendingReview", pendingRev);
        data.put("propertyStats", propertyStats);

        Map<String, Object> requestStats = new LinkedHashMap<>();
        requestStats.put("pending", reqPending); requestStats.put("approved", reqApproved);
        requestStats.put("rejected", reqRejected); requestStats.put("confirmed", reqConfirmed);
        requestStats.put("terminated", reqTerminated); requestStats.put("total", allRequests.size());
        data.put("requestStats", requestStats);

        Map<String, Object> occupancy = new LinkedHashMap<>();
        occupancy.put("occupied", occupied); occupancy.put("total", total);
        occupancy.put("rate", Math.round(occupancyRate * 10.0) / 10.0);
        data.put("occupancy", occupancy);

        Map<String, Object> paymentStats = new LinkedHashMap<>();
        paymentStats.put("totalRevenue", totalRevenue); paymentStats.put("pendingAmount", pendingAmount);
        paymentStats.put("overdueAmount", overdueAmount); paymentStats.put("paidCount", paidCount);
        paymentStats.put("pendingCount", pendingCount); paymentStats.put("overdueCount", overdueCount);
        data.put("paymentStats", paymentStats);

        data.put("paidPayments",    paidPayments);
        data.put("pendingPayments", pendingPayments);
        data.put("overduePayments", overduePayments);
        data.put("monthlyRevenue",  monthlyRevenue);
        data.put("overallRating",   overallRating);
        data.put("propertyRatings", propertyRatings);

        return data;
    }
}