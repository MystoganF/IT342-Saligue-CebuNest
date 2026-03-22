package edu.cit.saligue.cebunest.controller;

import edu.cit.saligue.cebunest.dto.UpdateProfileRequest;
import edu.cit.saligue.cebunest.dto.UserDTO;
import edu.cit.saligue.cebunest.service.SupabaseStorageService;
import edu.cit.saligue.cebunest.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class UserController {

    private final UserService userService;
    private final SupabaseStorageService storageService;

    @PutMapping("/{id}")
    public ResponseEntity<?> updateProfile(
            @PathVariable Long id,
            @RequestBody UpdateProfileRequest request) {
        try {
            UserDTO updated = userService.updateProfile(id, request);
            return buildSuccess(updated);
        } catch (IllegalArgumentException e) {
            return buildError("DB-001", e.getMessage(), HttpStatus.NOT_FOUND);
        }
    }

    private ResponseEntity<?> buildSuccess(Object data) {
        Map<String, Object> resp = new HashMap<>();
        resp.put("success", true);
        resp.put("data", Map.of("user", data));
        resp.put("error", null);
        resp.put("timestamp", LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME));
        return ResponseEntity.ok(resp);
    }

    private ResponseEntity<?> buildError(String code, String message, HttpStatus status) {
        Map<String, Object> error = new HashMap<>();
        error.put("code", code);
        error.put("message", message);
        error.put("details", null);

        Map<String, Object> resp = new HashMap<>();
        resp.put("success", false);
        resp.put("data", null);
        resp.put("error", error);
        resp.put("timestamp", LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME));
        return ResponseEntity.status(status).body(resp);
    }



    @PostMapping("/{id}/avatar")
    public ResponseEntity<?> uploadAvatar(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file) {

        if (file.isEmpty()) {
            return buildError("VALID-001", "File is required.", HttpStatus.BAD_REQUEST);
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            return buildError("VALID-001", "Only image files are allowed.", HttpStatus.BAD_REQUEST);
        }

        if (file.getSize() > 5 * 1024 * 1024) {
            return buildError("VALID-001", "Image must be under 5MB.", HttpStatus.BAD_REQUEST);
        }

        try {
            String avatarUrl = storageService.uploadAvatar(id, file);

            UserDTO updated = userService.updateProfile(id,
                    new UpdateProfileRequest(null, null, avatarUrl));

            Map<String, Object> responseData = new HashMap<>();
            responseData.put("avatarUrl", avatarUrl);
            responseData.put("user", updated);

            Map<String, Object> resp = new HashMap<>();
            resp.put("success", true);
            resp.put("data", responseData);
            resp.put("error", null);
            resp.put("timestamp", LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME));
            return ResponseEntity.ok(resp);

        } catch (IOException e) {
            return buildError("SYSTEM-001", "Upload failed: " + e.getMessage(),
                    HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}