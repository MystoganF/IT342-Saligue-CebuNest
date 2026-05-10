package com.cebunest.app.modules.auth.shared

import com.cebunest.app.core.api.ApiError

data class UserData(
    val id: Int,
    val name: String?,
    val email: String?,
    val role: String,
    val avatarUrl: String? = null,
    val phoneNumber: String? = null,
    val facebookUrl: String? = null,
    val instagramUrl: String? = null,
    val twitterUrl: String? = null
)

data class AuthData(
    val accessToken: String?,
    val refreshToken: String?,
    val user: UserData?,
    // Add the new fields sent by Spring Boot Google Auth
    val requiresRoleSelection: Boolean? = false,
    val alreadyExists: Boolean? = false,
    val email: String? = null,
    val name: String? = null
)

data class AuthResponse(
    val success: Boolean,
    val data: AuthData?,
    val error: ApiError?,
    val timestamp: String?
)

