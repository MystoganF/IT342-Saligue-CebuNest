package com.cebunest.app.ui.register

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.cebunest.app.api.RetrofitClient
import com.cebunest.app.databinding.ActivityRegisterBinding
import com.cebunest.app.model.RegisterRequest
import com.cebunest.app.ui.home.HomeActivity
import com.cebunest.app.util.SessionManager
import kotlinx.coroutines.launch

class RegisterActivity : AppCompatActivity() {

    private lateinit var binding: ActivityRegisterBinding
    private var selectedRole = "TENANT"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityRegisterBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupRoleToggle()

        binding.btnRegister.setOnClickListener { attemptRegister() }

        binding.tvGoToLogin.setOnClickListener { finish() }
    }

    private fun setupRoleToggle() {
        // Tenant selected by default
        highlightRole("TENANT")

        binding.btnTenant.setOnClickListener {
            selectedRole = "TENANT"
            highlightRole("TENANT")
        }
        binding.btnOwner.setOnClickListener {
            selectedRole = "OWNER"
            highlightRole("OWNER")
        }
    }

    private fun highlightRole(role: String) {
        val activeColor  = getColor(com.cebunest.app.R.color.teal_deep)
        val inactiveColor = getColor(com.cebunest.app.R.color.bg)
        val activeText   = getColor(com.cebunest.app.R.color.white)
        val inactiveText = getColor(com.cebunest.app.R.color.slate)

        binding.btnTenant.setBackgroundColor(if (role == "TENANT") activeColor else inactiveColor)
        binding.btnTenant.setTextColor(if (role == "TENANT") activeText else inactiveText)
        binding.btnOwner.setBackgroundColor(if (role == "OWNER") activeColor else inactiveColor)
        binding.btnOwner.setTextColor(if (role == "OWNER") activeText else inactiveText)
    }

    private fun attemptRegister() {
        val name            = binding.etName.text.toString().trim()
        val phoneNumber     = binding.etPhoneNumber.text.toString().trim()
        val email           = binding.etEmail.text.toString().trim()
        val password        = binding.etPassword.text.toString().trim()
        val confirmPassword = binding.etConfirmPassword.text.toString().trim()

        // Validation
        if (name.isEmpty())    { binding.etName.error = "Name is required"; return }
        if (phoneNumber.isEmpty()) { binding.etPhoneNumber.error = "Phone number is required"; return }
        if (email.isEmpty())   { binding.etEmail.error = "Email is required"; return }
        if (!android.util.Patterns.EMAIL_ADDRESS.matcher(email).matches()) {
            binding.etEmail.error = "Enter a valid email address"; return
        }
        if (password.isEmpty())          { binding.etPassword.error = "Password is required"; return }
        if (password.length < 8)         { binding.etPassword.error = "Password must be at least 8 characters"; return }
        if (confirmPassword.isEmpty())   { binding.etConfirmPassword.error = "Please confirm your password"; return }
        if (password != confirmPassword) { binding.etConfirmPassword.error = "Passwords do not match"; return }

        setLoading(true)

        lifecycleScope.launch {
            try {
                val response = RetrofitClient.apiService.register(
                    RegisterRequest(
                        name            = name,
                        phoneNumber     = phoneNumber,
                        email           = email,
                        password        = password,
                        confirmPassword = confirmPassword,
                        role            = selectedRole
                    )
                )
                val body = response.body()

                if (response.isSuccessful && body?.success == true) {
                    val data = body.data!!
                    SessionManager.saveTokens(
                        data.accessToken ?: "",
                        data.refreshToken ?: ""
                    )
                    data.user?.let { SessionManager.saveUser(it) }

                    Toast.makeText(this@RegisterActivity,
                        "Account created! Welcome to CebuNest.", Toast.LENGTH_SHORT).show()
                    goToHome()
                } else {
                    val msg = body?.error?.message
                        ?: when (response.code()) {
                            409  -> "An account with this email already exists."
                            400  -> "Please check your information and try again."
                            else -> "Registration failed. Please try again."
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
        binding.btnRegister.isEnabled  = !loading
        binding.btnRegister.text       = if (loading) "Creating Account…" else "Create Account"
    }

    private fun showError(msg: String) {
        binding.tvError.text       = msg
        binding.tvError.visibility = View.VISIBLE
    }
}