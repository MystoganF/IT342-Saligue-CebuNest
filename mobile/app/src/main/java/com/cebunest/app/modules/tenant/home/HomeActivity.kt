package com.cebunest.app.modules.tenant.home

import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import com.cebunest.app.databinding.ActivityHomeBinding
import com.cebunest.app.modules.auth.login.LoginActivity
import com.cebunest.app.core.session.SessionManager

class HomeActivity : AppCompatActivity() {

    private lateinit var binding: ActivityHomeBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityHomeBinding.inflate(layoutInflater)
        setContentView(binding.root)

        val user = SessionManager.getUser()
        binding.tvWelcome.text  = "Welcome, ${user?.name ?: "User"}! 👋"
        binding.tvRole.text     = "Role: ${user?.role ?: "—"}"
        binding.tvEmail.text    = "Email: ${user?.email ?: "—"}"

        binding.btnLogout.setOnClickListener {
            SessionManager.clear()
            startActivity(Intent(this, LoginActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            })
            finish()
        }
    }
}