package edu.cit.saligue.cebunest.controller;

import edu.cit.saligue.cebunest.dto.RentalPaymentDTO;
import edu.cit.saligue.cebunest.entity.*;
import edu.cit.saligue.cebunest.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;

@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class OwnerAnalyticsController {

    private final PropertyRepository      propertyRepository;
    private final RentalRequestRepository rentalRequestRepository;
    private final RentalPaymentRepository rentalPaymentRepository;

    @GetMapping("/owner")
    public ResponseEntity<?> getOwnerAnalytics(@AuthenticationPrincipal User currentUser) {
        if (currentUser == null)
            return buildError("AUTH-001", "Not authenticated.", HttpStatus.UNAUTHORIZED);

        try {
            List<Property> properties = propertyRepository.findByOwnerId(currentUser.getId());
            List<Long> propertyIds = properties.stream().map(Property::getId).toList();

            long total       = properties.size();
            long available   = properties.stream().filter(p -> p.getStatus() == Property.PropertyStatus.AVAILABLE).count();
            long unavailable = properties.stream().filter(p -> p.getStatus() == Property.PropertyStatus.UNAVAILABLE).count();
            long pendingRev  = properties.stream().filter(p -> p.getStatus() == Property.PropertyStatus.PENDING_REVIEW).count();

            List<RentalRequest> allRequests = propertyIds.isEmpty()
                    ? List.of()
                    : rentalRequestRepository.findByPropertyIdInOrderByCreatedAtDesc(propertyIds);

            long reqPending    = allRequests.stream().filter(r -> r.getStatus() == RentalRequest.RentalStatus.PENDING).count();
            long reqApproved   = allRequests.stream().filter(r -> r.getStatus() == RentalRequest.RentalStatus.APPROVED).count();
            long reqRejected   = allRequests.stream().filter(r -> r.getStatus() == RentalRequest.RentalStatus.REJECTED).count();
            long reqConfirmed  = allRequests.stream().filter(r -> r.getStatus() == RentalRequest.RentalStatus.CONFIRMED).count();
            long reqTerminated = allRequests.stream().filter(r -> r.getStatus() == RentalRequest.RentalStatus.TERMINATED).count();

            long occupied = reqConfirmed;
            double occupancyRate = total > 0 ? (double) occupied / total * 100.0 : 0.0;

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

            // Per-status enriched payment lists for frontend dropdowns
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

            // Monthly revenue — last 6 months
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

            return buildSuccess(data);
        } catch (Exception e) {
            e.printStackTrace();
            return buildError("SYSTEM-001", e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    private ResponseEntity<?> buildSuccess(Object data) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("success", true); body.put("data", data); body.put("error", null);
        body.put("timestamp", java.time.LocalDateTime.now().format(java.time.format.DateTimeFormatter.ISO_DATE_TIME));
        return ResponseEntity.ok(body);
    }

    private ResponseEntity<?> buildError(String code, String message, HttpStatus status) {
        Map<String, Object> error = new LinkedHashMap<>();
        error.put("code", code); error.put("message", message); error.put("details", null);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("success", false); body.put("data", null); body.put("error", error);
        body.put("timestamp", java.time.LocalDateTime.now().format(java.time.format.DateTimeFormatter.ISO_DATE_TIME));
        return ResponseEntity.status(status).body(body);
    }
}