package com.cebunest.app.model

data class AuthResponse(
    val success: Boolean,
    val data: AuthData?,
    val error: ApiError?,
    val timestamp: String?
)