package edu.cit.saligue.cebunest.controller;

import edu.cit.saligue.cebunest.dto.CreateRentalRequestDTO;
import edu.cit.saligue.cebunest.dto.RentalRequestDTO;
import edu.cit.saligue.cebunest.entity.User;
import edu.cit.saligue.cebunest.service.RentalRequestService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/rental-requests")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class RentalRequestController {

    private final RentalRequestService rentalRequestService;

    @PostMapping
    public ResponseEntity<?> createRequest(
            @RequestBody CreateRentalRequestDTO dto,
            @AuthenticationPrincipal User currentUser
    ) {
        try {
            RentalRequestDTO result = rentalRequestService.createRequest(dto, currentUser);
            Map<String, Object> data = new HashMap<>();
            data.put("rentalRequest", result);
            return ResponseEntity.status(HttpStatus.CREATED).body(buildSuccess(data));
        } catch (IllegalArgumentException e) {
            return buildError("BUSINESS-001", e.getMessage(), HttpStatus.BAD_REQUEST);
        } catch (Exception e) {
            return buildError("SYSTEM-001", e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @GetMapping("/my")
    public ResponseEntity<?> getMyRequests(
            @AuthenticationPrincipal User currentUser
    ) {
        try {
            List<RentalRequestDTO> requests = rentalRequestService.getMyRequests(currentUser);
            Map<String, Object> data = new HashMap<>();
            data.put("rentalRequests", requests);
            return ResponseEntity.ok(buildSuccess(data));
        } catch (Exception e) {
            return buildError("SYSTEM-001", e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    private Map<String, Object> buildSuccess(Map<String, Object> data) {
        Map<String, Object> body = new HashMap<>();
        body.put("success", true);
        body.put("data", data);
        body.put("error", null);
        body.put("timestamp", LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME));
        return body;
    }

    private ResponseEntity<?> buildError(String code, String message, HttpStatus status) {
        Map<String, Object> error = new HashMap<>();
        error.put("code", code);
        error.put("message", message);
        error.put("details", null);

        Map<String, Object> body = new HashMap<>();
        body.put("success", false);
        body.put("data", null);
        body.put("error", error);
        body.put("timestamp", LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME));

        return ResponseEntity.status(status).body(body);
    }
}