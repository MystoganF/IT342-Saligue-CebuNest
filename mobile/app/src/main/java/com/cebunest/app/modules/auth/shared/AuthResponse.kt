package com.cebunest.app.modules.auth.shared

import com.cebunest.app.core.api.ApiError

data class AuthResponse(
    val success: Boolean,
    val data: AuthData?,
    val error: ApiError?,
    val timestamp: String?
)