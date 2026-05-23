package com.cebunest.app.modules.auth.password_recovery

import android.content.Intent
import android.os.Bundle
import android.os.CountDownTimer
import android.text.Editable
import android.text.TextWatcher
import android.view.View
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.cebunest.app.core.api.RetrofitClient
import com.cebunest.app.databinding.ActivityVerifyCodeBinding
import com.cebunest.app.modules.auth.login.LoginActivity
import kotlinx.coroutines.launch

class VerifyCodeActivity : AppCompatActivity() {

    private lateinit var binding: ActivityVerifyCodeBinding
    private val api = RetrofitClient.create<PasswordApi>()
    private var email = ""
    private var resendTimer: CountDownTimer? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityVerifyCodeBinding.inflate(layoutInflater)
        setContentView(binding.root)

        email = intent.getStringExtra("EXTRA_EMAIL") ?: ""
        binding.tvSubtitle.text = "We sent a 6-digit code to $email."

        wireOtpBoxes()
        startResendTimer()

        binding.btnSubmit.setOnClickListener {
            val code = getOtp()
            if (code.length < 6) {
                showError("Incomplete Code", "Please enter all 6 digits.")
                return@setOnClickListener
            }
            verifyOtpCode(code)
        }

        binding.tvChangeEmail.setOnClickListener {
            finish()
        }

        binding.tvBackToLogin.setOnClickListener {
            val intent = Intent(this, LoginActivity::class.java)
            intent.flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
            startActivity(intent)
            finish()
        }
    }

    private fun wireOtpBoxes() {
        val boxes = listOf(
            binding.etOtp1, binding.etOtp2, binding.etOtp3,
            binding.etOtp4, binding.etOtp5, binding.etOtp6
        )

        boxes.forEachIndexed { i, box ->
            box.addTextChangedListener(object : TextWatcher {
                override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
                override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
                override fun afterTextChanged(s: Editable?) {
                    hideError()
                    if (s?.length == 1 && i < boxes.size - 1) {
                        boxes[i + 1].requestFocus()
                    }
                }
            })

            box.setOnKeyListener { _, keyCode, event ->
                if (keyCode == android.view.KeyEvent.KEYCODE_DEL
                    && event.action == android.view.KeyEvent.ACTION_DOWN
                    && box.text.isEmpty() && i > 0
                ) {
                    boxes[i - 1].requestFocus()
                    boxes[i - 1].setText("")
                    true
                } else false
            }
        }
    }

    private fun getOtp(): String {
        return listOf(
            binding.etOtp1, binding.etOtp2, binding.etOtp3,
            binding.etOtp4, binding.etOtp5, binding.etOtp6
        ).joinToString("") { it.text.toString() }
    }

    private fun startResendTimer() {
        binding.tvResend.isClickable = false
        binding.tvResend.text = "Resend in 59s"

        resendTimer?.cancel()
        resendTimer = object : CountDownTimer(59000, 1000) {
            override fun onTick(millisUntilFinished: Long) {
                val seconds = millisUntilFinished / 1000
                binding.tvResend.text = "Resend in ${seconds}s"
            }

            override fun onFinish() {
                binding.tvResend.text = "Resend Code"
                binding.tvResend.isClickable = true
                binding.tvResend.setOnClickListener {
                    resendCode()
                }
            }
        }.start()
    }

    private fun resendCode() {
        binding.tvResend.isClickable = false
        binding.tvResend.text = "Sending..."

        lifecycleScope.launch {
            try {
                val response = api.requestReset(ForgotPasswordRequest(email))
                if (response.isSuccessful && response.body()?.success == true) {
                    startResendTimer()
                } else {
                    val msg = response.body()?.error?.message ?: "Could not resend code."
                    showError("Resend Failed", msg)
                    binding.tvResend.text = "Resend Code"
                    binding.tvResend.isClickable = true
                }
            } catch (e: Exception) {
                showError("Network Error", "Could not connect. Please try again.")
                binding.tvResend.text = "Resend Code"
                binding.tvResend.isClickable = true
            }
        }
    }

    private fun verifyOtpCode(code: String) {
        setLoading(true)
        lifecycleScope.launch {
            try {
                val response = api.verifyCode(VerifyCodeRequest(email, code))
                if (response.isSuccessful && response.body()?.success == true) {
                    val intent = Intent(this@VerifyCodeActivity, ResetPasswordActivity::class.java)
                    intent.putExtra("EXTRA_EMAIL", email)
                    intent.putExtra("EXTRA_CODE", code)
                    startActivity(intent)
                } else {
                    showError(
                        "Invalid Code",
                        response.body()?.error?.message ?: "Invalid or expired code."
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
        binding.btnSubmit.text = if (loading) "Verifying..." else "Verify Code"
    }

    private fun showError(title: String, msg: String) {
        binding.tvErrorTitle.text = title
        binding.tvError.text = msg
        binding.layoutError.visibility = View.VISIBLE
    }

    private fun hideError() {
        binding.layoutError.visibility = View.GONE
    }

    override fun onDestroy() {
        super.onDestroy()
        resendTimer?.cancel()
    }
}