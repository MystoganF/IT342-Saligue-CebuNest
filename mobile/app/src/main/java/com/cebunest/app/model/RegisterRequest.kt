package com.cebunest.app.model

import com.google.gson.annotations.SerializedName

data class RegisterRequest(
    val name: String,
    val email: String,
    val password: String,
    @SerializedName("confirmPassword") val confirmPassword: String,
    @SerializedName("phoneNumber") val phoneNumber: String = "",
    val role: String = "TENANT"
)