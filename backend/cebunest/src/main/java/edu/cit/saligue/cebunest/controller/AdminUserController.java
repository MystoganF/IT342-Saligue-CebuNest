package edu.cit.saligue.cebunest.controller;

import edu.cit.saligue.cebunest.dto.UserDTO;
import edu.cit.saligue.cebunest.entity.User;
import edu.cit.saligue.cebunest.service.UserService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class AdminUserController {

    private final UserService     userService;
    private final PasswordEncoder passwordEncoder;

    // ── GET /api/admin/users ──────────────────────────────────────────────
    @GetMapping
    public ResponseEntity<?> getAllUsers(@AuthenticationPrincipal User currentUser) {
        if (!isAdmin(currentUser)) return forbidden();
        List<UserDTO> users = userService.getAllUsers();
        return ok(Map.of("users", users, "count", users.size()));
    }

    // ── POST /api/admin/users ─────────────────────────────────────────────
    @PostMapping
    public ResponseEntity<?> createUser(
            @RequestBody CreateUserDTO body,
            @AuthenticationPrincipal User currentUser
    ) {
        if (!isAdmin(currentUser)) return forbidden();
        if (blank(body.getName()))     return bad("VALID-001", "Name is required.");
        if (blank(body.getEmail()))    return bad("VALID-001", "Email is required.");
        if (blank(body.getPassword())) return bad("VALID-001", "Password is required.");
        if (blank(body.getRole()))     return bad("VALID-001", "Role is required.");

        try {
            UserDTO created = userService.adminCreateUser(
                    body.getName(), body.getEmail(),
                    passwordEncoder.encode(body.getPassword()),
                    body.getRole());
            return ResponseEntity.status(HttpStatus.CREATED).body(success(Map.of("user", created)));
        } catch (IllegalArgumentException e) {
            return bad("BUSINESS-001", e.getMessage());
        }
    }

    // ── PUT /api/admin/users/{id}/role ────────────────────────────────────
    @PutMapping("/{id}/role")
    public ResponseEntity<?> updateRole(
            @PathVariable Long id,
            @RequestBody RoleUpdateDTO body,
            @AuthenticationPrincipal User currentUser
    ) {
        if (!isAdmin(currentUser)) return forbidden();
        if (blank(body.getRole())) return bad("VALID-001", "Role is required.");
        try {
            return ResponseEntity.ok(success(Map.of("user", userService.adminUpdateRole(id, body.getRole()))));
        } catch (IllegalArgumentException e) {
            return bad("BUSINESS-001", e.getMessage());
        }
    }

    // ── PUT /api/admin/users/{id}/active ──────────────────────────────────
    @PutMapping("/{id}/active")
    public ResponseEntity<?> setActive(
            @PathVariable Long id,
            @RequestBody ActiveUpdateDTO body,
            @AuthenticationPrincipal User currentUser
    ) {
        if (!isAdmin(currentUser)) return forbidden();
        try {
            return ResponseEntity.ok(success(Map.of("user", userService.adminSetActive(id, body.isActive()))));
        } catch (IllegalArgumentException e) {
            return bad("BUSINESS-001", e.getMessage());
        }
    }

    // ── DELETE /api/admin/users/{id} ──────────────────────────────────────
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteUser(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser
    ) {
        if (!isAdmin(currentUser)) return forbidden();
        try {
            userService.adminDeleteUser(id);
            return ResponseEntity.ok(success(Map.of("deleted", true, "id", id)));
        } catch (IllegalArgumentException e) {
            return bad("BUSINESS-001", e.getMessage());
        }
    }

    // ── Inner DTOs ────────────────────────────────────────────────────────
    @Data public static class CreateUserDTO {
        private String name, email, password, role;
    }
    @Data public static class RoleUpdateDTO  { private String role; }
    @Data public static class ActiveUpdateDTO { private boolean active; }

    // ── Helpers ───────────────────────────────────────────────────────────
    private boolean isAdmin(User u) {
        return u != null && u.getRole() != null
                && u.getRole().getName().equalsIgnoreCase("ADMIN");
    }
    private boolean blank(String s) { return s == null || s.isBlank(); }
    private String  ts()            { return LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME); }

    private Map<String, Object> success(Object data) {
        Map<String, Object> b = new LinkedHashMap<>();
        b.put("success", true); b.put("data", data); b.put("error", null); b.put("timestamp", ts());
        return b;
    }
    private ResponseEntity<?> ok(Object data) { return ResponseEntity.ok(success(data)); }
    private ResponseEntity<?> forbidden() {
        return err("AUTH-002", "Admin access required.", HttpStatus.FORBIDDEN);
    }
    private ResponseEntity<?> bad(String code, String msg) {
        return err(code, msg, HttpStatus.BAD_REQUEST);
    }
    private ResponseEntity<?> err(String code, String msg, HttpStatus status) {
        Map<String, Object> error = new LinkedHashMap<>();
        error.put("code", code); error.put("message", msg); error.put("details", null);
        Map<String, Object> b = new LinkedHashMap<>();
        b.put("success", false); b.put("data", null); b.put("error", error); b.put("timestamp", ts());
        return ResponseEntity.status(status).body(b);
    }

    @Data public static class EmailUpdateDTO { private String email; }

    @PutMapping("/{id}/email")
    public ResponseEntity<?> updateEmail(
            @PathVariable Long id,
            @RequestBody EmailUpdateDTO body,
            @AuthenticationPrincipal User currentUser
    ) {
        if (!isAdmin(currentUser)) return forbidden();
        if (blank(body.getEmail())) return bad("VALID-001", "Email is required.");
        try {
            return ResponseEntity.ok(success(Map.of("user", userService.adminUpdateEmail(id, body.getEmail()))));
        } catch (IllegalArgumentException e) {
            return bad("BUSINESS-001", e.getMessage());
        }
    }
}