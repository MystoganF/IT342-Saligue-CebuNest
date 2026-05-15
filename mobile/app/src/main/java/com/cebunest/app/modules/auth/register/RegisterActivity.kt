package com.cebunest.app.modules.auth.register

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.view.View
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.cebunest.app.R
import com.cebunest.app.core.api.RetrofitClient
import com.cebunest.app.databinding.ActivityRegisterBinding
import com.cebunest.app.modules.auth.shared.AuthResponse
import com.cebunest.app.modules.auth.shared.GoogleAuthRequest
import com.cebunest.app.modules.tenant.TenantMainActivity
import com.cebunest.app.core.session.SessionManager
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInClient
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.android.gms.auth.api.signin.GoogleSignInStatusCodes
import com.google.android.gms.common.api.ApiException
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class RegisterActivity : AppCompatActivity() {

    private lateinit var binding: ActivityRegisterBinding
    private lateinit var googleSignInClient: GoogleSignInClient
    private val registerApi = RetrofitClient.create<RegisterApi>()

    private val googleSignInLauncher = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
        val task = GoogleSignIn.getSignedInAccountFromIntent(result.data)
        try {
            val account = task.getResult(ApiException::class.java)

            if (account?.account != null) {
                lifecycleScope.launch {
                    try {
                        val accessToken = withContext(Dispatchers.IO) {
                            com.google.android.gms.auth.GoogleAuthUtil.getToken(
                                this@RegisterActivity, account.account!!, "oauth2:email profile"
                            )
                        }
                        attemptGoogleAuth(accessToken)
                    } catch (e: Exception) {
                        showError("Failed to fetch Google Token: ${e.message}")
                        setLoading(false)
                    }
                }
            } else {
                showError("Google Sign-In failed: No account returned.")
                setLoading(false)
            }
        } catch (e: ApiException) {
            val statusCode = e.statusCode
            if (statusCode == GoogleSignInStatusCodes.SIGN_IN_CANCELLED) {
                setLoading(false)
            } else if (statusCode == 10) {
                showError("Google Auth Error 10: SHA-1 fingerprint is not registered.")
                setLoading(false)
            } else {
                showError("Google Sign-In failed (Code $statusCode): ${e.message}")
                setLoading(false)
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityRegisterBinding.inflate(layoutInflater)
        setContentView(binding.root)

        val gso = GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
            .requestIdToken(getString(R.string.default_web_client_id))
            .requestEmail()
            .build()
        googleSignInClient = GoogleSignIn.getClient(this, gso)

        // Click Listeners
        binding.btnRegister.setOnClickListener { attemptRegister() }

        binding.btnGoogleLogin.setOnClickListener {
            setLoading(true)
            googleSignInClient.signOut().addOnCompleteListener {
                googleSignInLauncher.launch(googleSignInClient.signInIntent)
            }
        }

        binding.tvGoToLogin.setOnClickListener { finish() }
    }

    private fun attemptGoogleAuth(token: String) {
        lifecycleScope.launch {
            try {
                // Hardcoded to TENANT for mobile app
                val response = registerApi.googleRegister(GoogleAuthRequest(token, "TENANT"))
                handleAuthResponse(response)
            } catch (e: Exception) {
                showError("Unable to connect to server.")
                setLoading(false)
            }
        }
    }

    private fun attemptRegister() {
        val name = binding.etName.text.toString().trim()
        val email = binding.etEmail.text.toString().trim()
        val phone = binding.etPhoneNumber.text.toString().trim()
        val password = binding.etPassword.text.toString().trim()
        val confirm = binding.etConfirmPassword.text.toString().trim()

        if (name.isEmpty() || email.isEmpty() || password.isEmpty() || confirm.isEmpty()) {
            showError("Please fill in all required fields.")
            return
        }
        if (password != confirm) {
            showError("Passwords do not match.")
            return
        }

        setLoading(true)
        lifecycleScope.launch {
            try {
                // Hardcoded to TENANT for mobile app
                val response = registerApi.register(RegisterRequest(name, email, password, confirm, phone, "TENANT"))
                handleAuthResponse(response)
            } catch (e: Exception) {
                showError("Unable to connect to server.")
                setLoading(false)
            }
        }
    }

    private fun handleAuthResponse(response: retrofit2.Response<AuthResponse>) {
        val body = response.body()

        if (response.isSuccessful && body?.success == true) {
            val data = body.data!!

            // WEB FEATURE: Check if user already exists during Google Register
            if (data.alreadyExists == true) {
                showAlreadyExistsDialog()
                return
            }

            // WEB FEATURE: Restrict to Tenant View Only (Safety net just in case)
            val userRole = data.user?.role?.uppercase()
            if (userRole == "OWNER" || userRole == "ADMIN") {
                showWebOnlyDialog()
                return
            }

            SessionManager.saveTokens(data.accessToken ?: "", data.refreshToken ?: "")
            data.user?.let { SessionManager.saveUser(it) }

            showSuccess()
            window.decorView.postDelayed({ goToHome() }, 1000)
        } else {
            val msg = body?.error?.message ?: "Registration failed."
            showError(msg)
            setLoading(false)
        }
    }

    private fun showAlreadyExistsDialog() {
        MaterialAlertDialogBuilder(this)
            .setTitle("Account Already Exists ⚠️")
            .setMessage("This Google account is already registered with CebuNest. Please sign in instead.")
            .setPositiveButton("Go to Sign In") { _, _ ->
                finish() // Takes them back to LoginActivity
            }
            .setNegativeButton("Cancel") { dialog, _ ->
                dialog.dismiss()
                setLoading(false)
            }
            .setCancelable(false)
            .show()
    }

    private fun showWebOnlyDialog() {
        MaterialAlertDialogBuilder(this)
            .setTitle("Web Access Only 💻")
            .setMessage("Account created successfully! However, the CebuNest mobile app is designed exclusively for Tenants. To manage your properties, please log in using our web application.")
            .setPositiveButton("Got it") { dialog, _ ->
                dialog.dismiss()
                finish() // Send back to login, DO NOT enter the app
            }
            .setCancelable(false)
            .show()
    }

    private fun goToHome() {
        startActivity(Intent(this, TenantMainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        })
        finish()
    }

    private fun setLoading(loading: Boolean) {
        binding.progressBar.visibility = if (loading) View.VISIBLE else View.GONE
        binding.btnRegister.isEnabled = !loading
        binding.btnGoogleLogin.isEnabled = !loading
        binding.btnRegister.text = if (loading) "Creating Account…" else "Create Account"
    }

    private fun showError(msg: String) {
        binding.tvError.text = msg
        binding.tvError.visibility = View.VISIBLE
        binding.tvSuccess.visibility = View.GONE
    }

    private fun showSuccess() {
        binding.tvSuccess.visibility = View.VISIBLE
        binding.tvError.visibility = View.GONE
        binding.btnRegister.isEnabled = false
        binding.btnGoogleLogin.isEnabled = false
    }
}