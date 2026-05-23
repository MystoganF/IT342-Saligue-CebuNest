package com.cebunest.app.modules.auth.password_recovery

import android.content.Intent
import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.view.View
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.cebunest.app.core.api.RetrofitClient
import com.cebunest.app.databinding.ActivityResetPasswordBinding
import com.cebunest.app.modules.auth.login.LoginActivity
import kotlinx.coroutines.launch

class ResetPasswordActivity : AppCompatActivity() {

    private lateinit var binding: ActivityResetPasswordBinding
    private val api = RetrofitClient.create<PasswordApi>()
    private var email = ""
    private var code = ""

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityResetPasswordBinding.inflate(layoutInflater)
        setContentView(binding.root)

        email = intent.getStringExtra("EXTRA_EMAIL") ?: ""
        code = intent.getStringExtra("EXTRA_CODE") ?: ""
        binding.tvSubtitle.text = "Choose a strong password for $email."

        wirePasswordWatchers()

        binding.btnSubmit.setOnClickListener {
            val password = binding.etPassword.text.toString()
            val confirm = binding.etConfirmPassword.text.toString()

            if (password.length < 8) {
                showError("Weak Password", "Password must be at least 8 characters.")
                return@setOnClickListener
            }
            if (password != confirm) {
                showError("Passwords Do Not Match", "Please make sure both passwords are the same.")
                return@setOnClickListener
            }

            setNewPassword(password)
        }

        binding.tvBackToLogin.setOnClickListener {
            val intent = Intent(this, LoginActivity::class.java)
            intent.flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
            startActivity(intent)
            finish()
        }
    }

    private fun wirePasswordWatchers() {
        binding.etPassword.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
            override fun afterTextChanged(s: Editable?) {
                hideError()
                updateStrength(s.toString())
                updateMatchHint()
            }
        })

        binding.etConfirmPassword.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
            override fun afterTextChanged(s: Editable?) {
                hideError()
                updateMatchHint()
            }
        })
    }

    private fun updateStrength(password: String) {
        if (password.isEmpty()) {
            binding.layoutStrength.visibility = View.GONE
            return
        }

        binding.layoutStrength.visibility = View.VISIBLE

        var score = 0
        if (password.length >= 8) score++
        if (password.any { it.isUpperCase() }) score++
        if (password.any { it.isDigit() }) score++
        if (password.any { !it.isLetterOrDigit() }) score++

        val (label, color) = when (score) {
            1 -> "Weak" to "#C0392B"
            2 -> "Fair" to "#B78E42"
            3 -> "Good" to "#53A4A3"
            else -> "Strong" to "#1A7A4A"
        }

        val bars = listOf(binding.bar1, binding.bar2, binding.bar3, binding.bar4)
        bars.forEachIndexed { index, bar ->
            val tint = if (index < score) color else "#E5ECED"
            bar.backgroundTintList = android.content.res.ColorStateList.valueOf(
                android.graphics.Color.parseColor(tint)
            )
        }

        binding.tvStrengthLabel.text = label
        binding.tvStrengthLabel.setTextColor(android.graphics.Color.parseColor(color))
    }

    private fun updateMatchHint() {
        val password = binding.etPassword.text.toString()
        val confirm = binding.etConfirmPassword.text.toString()

        if (confirm.isEmpty()) {
            binding.tvMatchHint.visibility = View.GONE
            return
        }

        binding.tvMatchHint.visibility = View.VISIBLE
        if (password == confirm) {
            binding.tvMatchHint.text = "Passwords match"
            binding.tvMatchHint.setTextColor(android.graphics.Color.parseColor("#1A7A4A"))
        } else {
            binding.tvMatchHint.text = "Passwords do not match"
            binding.tvMatchHint.setTextColor(android.graphics.Color.parseColor("#C0392B"))
        }
    }

    private fun setNewPassword(newPassword: String) {
        setLoading(true)
        lifecycleScope.launch {
            try {
                val response = api.resetPassword(ResetPasswordRequest(email, code, newPassword))
                if (response.isSuccessful && response.body()?.success == true) {
                    showSuccess()
                    window.decorView.postDelayed({
                        val intent = Intent(this@ResetPasswordActivity, LoginActivity::class.java)
                        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                        startActivity(intent)
                        finish()
                    }, 1500)
                } else {
                    showError(
                        "Reset Failed",
                        response.body()?.error?.message ?: "Failed to reset password."
                    )
                }
            } catch (e: Exception) {
                showError("Network Error", "Could not connect. Please try again.")
            } finally {
                setLoading(false)
            }
        }
    }

    private fun setLoading(loading: Boolean) {
        binding.progressBar.visibility = if (loading) View.VISIBLE else View.GONE
        binding.btnSubmit.isEnabled = !loading
        binding.btnSubmit.text = if (loading) "Updating..." else "Reset Password"
    }

    private fun showError(title: String, msg: String) {
        binding.tvErrorTitle.text = title
        binding.tvError.text = msg
        binding.layoutError.visibility = View.VISIBLE
        binding.layoutSuccess.visibility = View.GONE
    }

    private fun hideError() {
        binding.layoutError.visibility = View.GONE
    }

    private fun showSuccess() {
        binding.layoutSuccess.visibility = View.VISIBLE
        binding.layoutError.visibility = View.GONE
        binding.btnSubmit.isEnabled = false
    }
}