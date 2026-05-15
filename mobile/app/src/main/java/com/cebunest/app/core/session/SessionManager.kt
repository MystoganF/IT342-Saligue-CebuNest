package com.cebunest.app.core.session

import android.content.Context
import android.content.SharedPreferences
import com.cebunest.app.CebuNestApp
import com.cebunest.app.modules.auth.shared.UserData
import com.google.gson.Gson

object SessionManager {

    private const val PREF_NAME = "cebunest_prefs"
    private const val KEY_ACCESS_TOKEN  = "access_token"
    private const val KEY_REFRESH_TOKEN = "refresh_token"
    private const val KEY_USER          = "user"

    private lateinit var prefs: SharedPreferences

    fun init(context: Context) {
        prefs = context.getSharedPreferences("cebunest_prefs", Context.MODE_PRIVATE)
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

    // Add this to your existing SessionManager object
    fun forceLogout() {
        // 1. Clear the token and user data from SharedPreferences
        clear()

        // 2. Create an Intent to jump to LoginActivity
        val context = CebuNestApp.instance
        val intent = android.content.Intent(context, com.cebunest.app.modules.auth.login.LoginActivity::class.java).apply {
            // These flags clear the entire backstack so the user can't press "Back" to return to the app
            flags = android.content.Intent.FLAG_ACTIVITY_NEW_TASK or android.content.Intent.FLAG_ACTIVITY_CLEAR_TASK
        }

        // 3. Launch the screen
        context.startActivity(intent)
    }
}