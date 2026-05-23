package com.cebunest.app.modules.auth.password_recovery

import com.cebunest.app.core.api.ApiError
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.POST

// --- Request Payloads ---
data class ForgotPasswordRequest(val email: String)
data class VerifyCodeRequest(val email: String, val code: String)
data class ResetPasswordRequest(val email: String, val code: String, val newPassword: String)

// --- Response Payload ---
data class MessageData(val message: String?)
data class MessageResponse(
    val success: Boolean,
    val data: MessageData?,
    val error: ApiError?,
    val timestamp: String?
)

// --- Retrofit Interface ---
interface PasswordApi {
    @POST("api/auth/forgot-password")
    suspend fun requestReset(@Body request: ForgotPasswordRequest): Response<MessageResponse>

    @POST("api/auth/verify-reset-code")
    suspend fun verifyCode(@Body request: VerifyCodeRequest): Response<MessageResponse>

    @POST("api/auth/reset-password")
    suspend fun resetPassword(@Body request: ResetPasswordRequest): Response<MessageResponse>
}