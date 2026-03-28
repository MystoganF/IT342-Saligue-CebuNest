package com.cebunest.app

import android.app.Application
import com.cebunest.app.util.SessionManager

class CebuNestApp : Application() {
    override fun onCreate() {
        super.onCreate()
        SessionManager.init(this)
    }
}