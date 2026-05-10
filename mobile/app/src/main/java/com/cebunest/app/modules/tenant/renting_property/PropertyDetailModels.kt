package com.cebunest.app.modules.tenant.renting_property

import com.cebunest.app.modules.tenant.home.Property

// Responses
data class PropertyResponse(val success: Boolean, val data: PropertyDataWrapper?, val error: ErrorDetail?)
data class PropertyDataWrapper(val property: Property?)

data class ReviewsResponse(val success: Boolean, val data: ReviewsDataWrapper?)
data class ReviewsDataWrapper(val reviews: List<Review>?)

data class RentalRequestResponse(val success: Boolean, val data: RequestDataWrapper?, val error: ErrorDetail?)
data class RequestDataWrapper(val request: RentalRequest?)

data class PaymentsResponse(val success: Boolean, val data: PaymentsDataWrapper?)
data class PaymentsDataWrapper(val payments: List<RentalPayment>?)

data class InitiatePaymentResponse(val success: Boolean, val data: PaymentInitWrapper?, val error: ErrorDetail?)
data class PaymentInitWrapper(val payment: PaymentCheckout?)

data class ErrorDetail(val message: String)

// Entities
data class Review(
    val id: Int,
    val tenantName: String,
    val tenantAvatarUrl: String?,
    val rating: Int,
    val comment: String?,
    val createdAt: String
)

data class RentalRequest(
    val id: Int,
    val status: String
)

data class RentalRequestPayload(
    val propertyId: Int,
    val startDate: String,
    val leaseDurationMonths: Int
)

data class ConfirmPayload(val requestId: Int)

data class RentalPayment(
    val id: Int,
    val installmentNumber: Int,
    val amount: Double,
    val dueDate: String,
    val status: String
)

data class PaymentCheckout(val checkoutUrl: String)