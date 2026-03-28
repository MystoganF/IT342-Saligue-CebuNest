package com.cebunest.app.model

import com.google.gson.annotations.SerializedName

// ── Request bodies ─────────────────────────────────────────────────────────

data class RegisterRequest(
    val name: String,
    val email: String,
    val password: String,
    @SerializedName("confirmPassword") val confirmPassword: String,
    @SerializedName("phoneNumber") val phoneNumber: String = "",
    val role: String = "TENANT"
)

data class LoginRequest(
    val email: String,
    val password: String
)

// ── Response bodies ────────────────────────────────────────────────────────

data class AuthResponse(
    val success: Boolean,
    val data: AuthData?,
    val error: ApiError?,
    val timestamp: String?
)

data class AuthData(
    val accessToken: String?,
    val refreshToken: String?,
    val user: UserData?
)

data class UserData(
    val id: String?,
    val email: String?,
    val name: String?,
    val role: String?
)

data class ApiError(
    val code: String?,
    val message: String?
)