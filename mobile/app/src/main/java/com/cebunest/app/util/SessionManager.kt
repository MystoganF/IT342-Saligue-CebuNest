package com.cebunest.app.util

import android.content.Context
import android.content.SharedPreferences
import com.cebunest.app.model.UserData
import com.google.gson.Gson

object SessionManager {

    private const val PREF_NAME = "cebunest_prefs"
    private const val KEY_ACCESS_TOKEN  = "access_token"
    private const val KEY_REFRESH_TOKEN = "refresh_token"
    private const val KEY_USER          = "user"

    private lateinit var prefs: SharedPreferences

    fun init(context: Context) {
        prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
    }

    fun saveTokens(accessToken: String, refreshToken: String) {
        prefs.edit()
            .putString(KEY_ACCESS_TOKEN, accessToken)
            .putString(KEY_REFRESH_TOKEN, refreshToken)
            .apply()
    }

    fun saveUser(user: UserData) {
        prefs.edit()
            .putString(KEY_USER, Gson().toJson(user))
            .apply()
    }

    fun getAccessToken(): String? = prefs.getString(KEY_ACCESS_TOKEN, null)

    fun getUser(): UserData? {
        val json = prefs.getString(KEY_USER, null) ?: return null
        return Gson().fromJson(json, UserData::class.java)
    }

    fun isLoggedIn(): Boolean = getAccessToken() != null

    fun clear() {
        prefs.edit().clear().apply()
    }
}