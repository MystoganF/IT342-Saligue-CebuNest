package com.cebunest.app.modules.tenant.notifications

import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.PATCH // <-- Change import from PUT to PATCH
import retrofit2.http.Path


interface NotificationApi {

    // Adjust these endpoints to match your actual Spring Boot backend URLs
    @GET("api/notifications")
    suspend fun getMyNotifications(): Response<NotificationResponse>

    // Change @PUT to @PATCH
    @PATCH("api/notifications/{id}/read")
    suspend fun markAsRead(@Path("id") id: Int): Response<GenericResponse>

    // Change @PUT to @PATCH
    @PATCH("api/notifications/read-all")
    suspend fun markAllAsRead(): Response<GenericResponse>
}