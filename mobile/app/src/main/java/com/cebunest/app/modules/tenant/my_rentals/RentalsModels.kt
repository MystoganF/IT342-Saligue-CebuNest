package com.cebunest.app.modules.tenant.my_rentals

data class RentalRequestsResponse(
    val success: Boolean,
    val data: RentalRequestsData?,
    val error: ErrorDetail?
)

data class RentalRequestsData(val requests: List<RentalRequest>?)

data class RentalRequest(
    val id: Int,
    val propertyId: Int,
    val propertyTitle: String,
    val propertyLocation: String,
    val propertyPrice: Double,
    val propertyImage: String?,
    val ownerId: Int,
    val ownerName: String,
    val startDate: String,
    val leaseDurationMonths: Int,
    val status: String,
    val createdAt: String
)

data class ConfirmPayload(val requestId: Int)

data class ConfirmResponse(
    val success: Boolean,
    val error: ErrorDetail?
)

data class ErrorDetail(val message: String)

data class Payment(
    val id: Int,
    val installmentNumber: Int,
    val amount: Double,
    val dueDate: String?,
    val paidAt: String?,
    val status: String,
    val checkoutUrl: String?,
    val paymongoPaymentId: String?
)
data class PaymentsResponse(val success: Boolean, val data: PaymentsData?)
data class PaymentsData(val payments: List<Payment>?)
data class PaymentLinkResponse(val success: Boolean, val data: PaymentLinkData?)
data class PaymentLinkData(val payment: Payment)

data class LeaseExtension(
    val id: Int,
    val requestedMonths: Int,
    val reason: String?,
    val status: String,
    val createdAt: String
)
data class LeaseExtensionsResponse(val success: Boolean, val data: ExtensionsData?)
data class ExtensionsData(val extensionRequests: List<LeaseExtension>?)
data class ExtensionPayload(val rentalRequestId: Int, val requestedMonths: Int, val reason: String?)

data class ReviewPayload(val rentalRequestId: Int, val rating: Int, val comment: String?)
data class PropertyResponse(val success: Boolean, val data: PropertyDataWrapper?)
data class PropertyDataWrapper(val property: com.cebunest.app.modules.tenant.home.Property)

data class Review(
    val id: Int,
    val tenantId: Int,
    val tenantName: String,
    val rating: Int,
    val comment: String?,
    val createdAt: String,
    val tenantAvatarUrl: String?
)
data class ReviewsResponse(val success: Boolean, val data: ReviewsData?, val error: ErrorDetail?)
data class ReviewsData(val reviews: List<Review>?)

data class SingleReviewResponse(val success: Boolean, val data: SingleReviewData?, val error: ErrorDetail?)
data class SingleReviewData(val review: Review?)