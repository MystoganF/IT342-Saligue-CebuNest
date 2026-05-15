package com.cebunest.app.modules.auth.login

import com.cebunest.app.modules.auth.shared.AuthResponse
import com.cebunest.app.modules.auth.shared.GoogleAuthRequest
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.POST

interface LoginApi {
    @POST("api/auth/login")
    suspend fun login(@Body request: LoginRequest): Response<AuthResponse>

    @POST("api/auth/google")
    suspend fun googleLogin(@Body request: GoogleAuthRequest): Response<AuthResponse>
}