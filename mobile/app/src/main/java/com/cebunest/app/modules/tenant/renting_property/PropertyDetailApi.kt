package com.cebunest.app.modules.tenant.renting_property

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path

interface PropertyDetailApi {
    @GET("api/properties/{id}")
    suspend fun getPropertyById(@Path("id") id: Int): Response<PropertyResponse>

    @GET("api/property-reviews/property/{id}")
    suspend fun getPropertyReviews(@Path("id") id: Int): Response<ReviewsResponse>

    @GET("api/rental-requests/my/property/{id}")
    suspend fun getMyRentalRequest(@Path("id") id: Int): Response<RentalRequestResponse>

    @POST("api/rental-requests")
    suspend fun submitRentalRequest(@Body data: RentalRequestPayload): Response<RentalRequestResponse>

    @POST("api/payments/confirm")
    suspend fun confirmRental(@Body data: ConfirmPayload): Response<RentalRequestResponse>

    @GET("api/payments/request/{requestId}")
    suspend fun getPaymentsForRequest(@Path("requestId") requestId: Int): Response<PaymentsResponse>

    @POST("api/payments/{paymentId}/initiate")
    suspend fun initiatePayment(@Path("paymentId") paymentId: Int): Response<InitiatePaymentResponse>
}