package com.cebunest.app.model

data class AuthData(
    val accessToken: String?,
    val refreshToken: String?,
    val user: UserData?
)