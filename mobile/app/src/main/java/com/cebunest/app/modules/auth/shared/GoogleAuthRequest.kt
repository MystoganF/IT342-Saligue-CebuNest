package com.cebunest.app.modules.auth.shared

data class GoogleAuthRequest(
    val token: String,
    val role: String? = null // Optional: Used during registration to assign TENANT or OWNER
)