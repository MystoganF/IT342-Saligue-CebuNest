package com.cebunest.app.modules.auth.shared

data class AuthData(
    val accessToken: String?,
    val refreshToken: String?,
    val user: UserData?
)