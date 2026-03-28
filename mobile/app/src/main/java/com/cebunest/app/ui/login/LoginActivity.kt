package com.cebunest.app.ui.login

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.cebunest.app.api.RetrofitClient
import com.cebunest.app.databinding.ActivityLoginBinding
import com.cebunest.app.model.LoginRequest
import com.cebunest.app.ui.home.HomeActivity
import com.cebunest.app.ui.register.RegisterActivity
import com.cebunest.app.util.SessionManager
import kotlinx.coroutines.launch

class LoginActivity : AppCompatActivity() {

    private lateinit var binding: ActivityLoginBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityLoginBinding.inflate(layoutInflater)
        setContentView(binding.root)

        // Skip login if already authenticated
        if (SessionManager.isLoggedIn()) {
            goToHome()
            return
        }

        binding.btnLogin.setOnClickListener { attemptLogin() }

        binding.tvGoToRegister.setOnClickListener {
            startActivity(Intent(this, RegisterActivity::class.java))
        }
    }

    private fun attemptLogin() {
        val email    = binding.etEmail.text.toString().trim()
        val password = binding.etPassword.text.toString().trim()

        if (email.isEmpty()) {
            binding.etEmail.error = "Email is required"
            return
        }
        if (password.isEmpty()) {
            binding.etPassword.error = "Password is required"
            return
        }

        setLoading(true)

        lifecycleScope.launch {
            try {
                val response = RetrofitClient.apiService.login(LoginRequest(email, password))
                val body = response.body()

                if (response.isSuccessful && body?.success == true) {
                    val data = body.data!!
                    SessionManager.saveTokens(
                        data.accessToken ?: "",
                        data.refreshToken ?: ""
                    )
                    data.user?.let { SessionManager.saveUser(it) }

                    showSuccess("Login successful! Welcome back.")
                    goToHome()
                } else {
                    val msg = body?.error?.message
                        ?: when (response.code()) {
                            401  -> "Invalid email or password."
                            else -> "Login failed. Please try again."
                        }
                    showError(msg)
                }
            } catch (e: Exception) {
                showError("Unable to connect to server. Check your internet connection.")
            } finally {
                setLoading(false)
            }
        }
    }

    private fun goToHome() {
        startActivity(Intent(this, HomeActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        })
        finish()
    }

    private fun setLoading(loading: Boolean) {
        binding.progressBar.visibility = if (loading) View.VISIBLE else View.GONE
        binding.btnLogin.isEnabled     = !loading
        binding.btnLogin.text          = if (loading) "Signing in…" else "Sign In"
    }

    private fun showError(msg: String) {
        binding.tvError.text       = msg
        binding.tvError.visibility = View.VISIBLE
    }

    private fun showSuccess(msg: String) {
        Toast.makeText(this, msg, Toast.LENGTH_SHORT).show()
        binding.tvError.visibility = View.GONE
    }
}