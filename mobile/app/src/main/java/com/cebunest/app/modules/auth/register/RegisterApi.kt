package com.cebunest.app.modules.auth.register

import com.cebunest.app.modules.auth.shared.AuthResponse
import com.cebunest.app.modules.auth.shared.GoogleAuthRequest
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.POST

interface RegisterApi {
    @POST("api/auth/register")
    suspend fun register(@Body request: RegisterRequest): Response<AuthResponse>

    @POST("api/auth/google")
    suspend fun googleRegister(@Body request: GoogleAuthRequest): Response<AuthResponse>
}