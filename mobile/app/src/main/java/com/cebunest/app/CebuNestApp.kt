package com.cebunest.app

import android.app.Application
import com.cebunest.app.core.session.SessionManager

class CebuNestApp : Application() {

    override fun onCreate() {
        super.onCreate()
        instance = this

        // CRITICAL FIX: Initialize SessionManager globally before any Activity starts!
        SessionManager.init(this)
    }

    companion object {
        lateinit var instance: CebuNestApp
            private set
    }
}