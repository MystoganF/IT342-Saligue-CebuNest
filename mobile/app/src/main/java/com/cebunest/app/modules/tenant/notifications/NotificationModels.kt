package com.cebunest.app.modules.tenant.notifications

data class NotificationResponse(
    val success: Boolean,
    val data: NotificationDataList?,
    val error: NotificationError?
)

data class NotificationDataList(
    val notifications: List<AppNotification>
)

data class AppNotification(
    val id: Int,
    val type: String, // e.g., "REQUEST_APPROVED", "PAYMENT_DUE"
    val message: String,
    val rentalRequestId: Int?,
    val read: Boolean,
    val createdAt: String
)

data class NotificationError(
    val message: String
)

data class GenericResponse(
    val success: Boolean,
    val message: String?
)