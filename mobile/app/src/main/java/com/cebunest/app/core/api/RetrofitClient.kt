package com.cebunest.app.core.api

import android.os.Handler
import android.os.Looper
import android.widget.Toast
import com.cebunest.app.CebuNestApp
import com.cebunest.app.core.session.SessionManager
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

object RetrofitClient {
    private const val BASE_URL = "https://it342-saligue-cebunest.onrender.com/"

    // 1. Your Existing Interceptor: Slaps the Bearer token onto the request
    private val authInterceptor = Interceptor { chain ->
        val requestBuilder = chain.request().newBuilder()
        val token = SessionManager.getAccessToken()

        if (!token.isNullOrEmpty()) {
            requestBuilder.addHeader("Authorization", "Bearer $token")
        }

        chain.proceed(requestBuilder.build())
    }

    // 2. The New Interceptor: Watches every response for 401/403 Session Expiry
    private val sessionErrorInterceptor = Interceptor { chain ->
        val request = chain.request()
        val response = chain.proceed(request)

        // If the backend kicks us out because the token is dead/expired...
        if (response.code == 401 || response.code == 403) {

            // Hop onto the Main UI Thread to show a Toast and launch the Login screen
            Handler(Looper.getMainLooper()).post {
                Toast.makeText(
                    CebuNestApp.instance,
                    "Session Expired! Please log in again.",
                    Toast.LENGTH_LONG
                ).show()

                // Trigger the automatic wipe & redirect
                SessionManager.forceLogout()
            }
        }

        response
    }

    // 3. Attach BOTH interceptors to your client
    private val okHttpClient = OkHttpClient.Builder()
        .addInterceptor(authInterceptor)          // Adds token going OUT
        .addInterceptor(sessionErrorInterceptor)  // Catches 401/403 coming IN
        .build()

    val retrofit: Retrofit = Retrofit.Builder()
        .baseUrl(BASE_URL)
        .client(okHttpClient)
        .addConverterFactory(GsonConverterFactory.create())
        .build()

    inline fun <reified T> create(): T {
        return retrofit.create(T::class.java)
    }
}