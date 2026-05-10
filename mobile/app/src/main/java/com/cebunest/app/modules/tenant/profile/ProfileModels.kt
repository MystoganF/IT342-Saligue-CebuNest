package com.cebunest.app.modules.tenant.profile

import com.cebunest.app.modules.auth.shared.UserData

data class ProfileUpdatePayload(
    val name: String,
    val phoneNumber: String?,
    val facebookUrl: String?,
    val instagramUrl: String?,
    val twitterUrl: String?
)

data class ProfileUpdateResponse(
    val success: Boolean,
    val data: UserDataWrapper?,
    val error: ErrorDetail?
)

data class AvatarUpdateResponse(
    val success: Boolean,
    val data: AvatarDataWrapper?,
    val error: ErrorDetail?
)

data class UserDataWrapper(val user: UserData?)
data class AvatarDataWrapper(val avatarUrl: String?)
data class ErrorDetail(val message: String)