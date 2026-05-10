package com.cebunest.app.modules.tenant.my_rentals

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path

interface RentalsApi {
    @GET("api/rental-requests/my")
    suspend fun getMyRentalRequests(): Response<RentalRequestsResponse>

    @POST("api/payments/confirm")
    suspend fun confirmRental(@Body data: ConfirmPayload): Response<ConfirmResponse>

    @GET("api/properties/{id}")
    suspend fun getPropertyById(@Path("id") id: Int): Response<PropertyResponse>

    @GET("api/payments/request/{requestId}")
    suspend fun getPaymentsForRequest(@Path("requestId") requestId: Int): Response<PaymentsResponse>

    @POST("api/payments/{paymentId}/initiate")
    suspend fun initiatePayment(@Path("paymentId") paymentId: Int): Response<PaymentLinkResponse>

    @GET("api/payments/{paymentId}/verify")
    suspend fun verifyPayment(@Path("paymentId") paymentId: Int): Response<PaymentLinkResponse>

    @GET("api/lease-extensions/rental/{requestId}")
    suspend fun getLeaseExtensions(@Path("requestId") requestId: Int): Response<LeaseExtensionsResponse>

    @POST("api/lease-extensions")
    suspend fun submitLeaseExtension(@Body data: ExtensionPayload): Response<LeaseExtensionsResponse>

    @GET("api/property-reviews/property/{id}")
    suspend fun getPropertyReviews(@Path("id") propertyId: Int): Response<ReviewsResponse> // <-- Updated

    @POST("api/property-reviews")
    suspend fun submitPropertyReview(@Body data: ReviewPayload): Response<SingleReviewResponse> // <-- Updated
    @GET("api/payments/{paymentId}/cancel")
    suspend fun cancelPayment(@Path("paymentId") paymentId: Int): Response<ConfirmResponse>
}

