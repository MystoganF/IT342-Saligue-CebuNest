package com.cebunest.app.modules.auth.password_recovery

import android.content.Intent
import android.os.Bundle
import android.view.View
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.cebunest.app.core.api.RetrofitClient
import com.cebunest.app.databinding.ActivityForgotPasswordBinding
import kotlinx.coroutines.launch

class ForgotPasswordActivity : AppCompatActivity() {

    private lateinit var binding: ActivityForgotPasswordBinding
    private val api = RetrofitClient.create<PasswordApi>()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityForgotPasswordBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.btnSubmit.setOnClickListener {
            val email = binding.etEmail.text.toString().trim()
            if (email.isEmpty()) {
                binding.etEmail.error = "Required"
                return@setOnClickListener
            }
            sendResetCode(email)
        }
    }

    private fun sendResetCode(email: String) {
        setLoading(true)
        lifecycleScope.launch {
            try {
                val response = api.requestReset(ForgotPasswordRequest(email))
                if (response.isSuccessful && response.body()?.success == true) {
                    // Navigate to Step 2 and pass the email forward
                    val intent = Intent(this@ForgotPasswordActivity, VerifyCodeActivity::class.java)
                    intent.putExtra("EXTRA_EMAIL", email)
                    startActivity(intent)
                } else {
                    showError(response.body()?.error?.message ?: "Failed to send code.")
                }
            } catch (e: Exception) {
                showError("Network error. Please try again.")
            } finally {
                setLoading(false)
            }
        }
    }

    private fun setLoading(loading: Boolean) {
        binding.progressBar.visibility = if (loading) View.VISIBLE else View.GONE
        binding.btnSubmit.isEnabled = !loading
        binding.btnSubmit.text = if (loading) "Sending..." else "Send Verification Code"
    }

    private fun showError(msg: String) {
        binding.tvError.text = msg
        binding.tvError.visibility = View.VISIBLE
    }
}