package com.cebunest.app.modules.auth.shared

import com.cebunest.app.core.api.ApiError

data class UserData(
    val id: String?,
    val email: String?,
    val name: String?,
    val role: String?
)

data class AuthData(
    val accessToken: String?,
    val refreshToken: String?,
    val user: UserData?
)

data class AuthResponse(
    val success: Boolean,
    val data: AuthData?,
    val error: ApiError?,
    val timestamp: String?
)