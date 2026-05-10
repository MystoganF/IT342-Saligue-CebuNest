package com.cebunest.app.modules.tenant.profile

import okhttp3.MultipartBody
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.Multipart
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Part
import retrofit2.http.Path

interface ProfileApi {
    @Multipart
    @POST("api/users/{id}/avatar")
    suspend fun updateAvatar(
        @Path("id") userId: Int,
        @Part file: MultipartBody.Part
    ): Response<AvatarUpdateResponse>

    @PUT("api/users/{id}")
    suspend fun updateProfile(
        @Path("id") userId: Int,
        @Body data: ProfileUpdatePayload
    ): Response<ProfileUpdateResponse>
}