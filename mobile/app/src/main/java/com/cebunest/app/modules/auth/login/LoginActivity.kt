package com.cebunest.app.modules.auth.login

import android.content.Intent
import android.os.Bundle
import android.view.View
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.cebunest.app.R
import com.cebunest.app.core.api.RetrofitClient
import com.cebunest.app.databinding.ActivityLoginBinding
import com.cebunest.app.modules.auth.password_recovery.ForgotPasswordActivity
import com.cebunest.app.modules.auth.register.RegisterActivity
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

class LoginActivity : AppCompatActivity() {

    private lateinit var binding: ActivityLoginBinding
    private lateinit var googleSignInClient: GoogleSignInClient
    private val loginApi = RetrofitClient.create<LoginApi>()

    // Temporarily hold the token in case the user needs to select a role
    private var pendingGoogleToken: String? = null

    private val googleSignInLauncher = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
        val task = GoogleSignIn.getSignedInAccountFromIntent(result.data)
        try {
            val account = task.getResult(ApiException::class.java)

            if (account?.account != null) {
                lifecycleScope.launch {
                    try {
                        val accessToken = withContext(Dispatchers.IO) {
                            com.google.android.gms.auth.GoogleAuthUtil.getToken(
                                this@LoginActivity, account.account!!, "oauth2:email profile"
                            )
                        }
                        pendingGoogleToken = accessToken
                        attemptGoogleAuth(accessToken, null)
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
        binding = ActivityLoginBinding.inflate(layoutInflater)
        setContentView(binding.root)

        if (SessionManager.isLoggedIn()) {
            goToHome()
            return
        }

        val gso = GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
            .requestIdToken(getString(R.string.default_web_client_id))
            .requestEmail()
            .build()
        googleSignInClient = GoogleSignIn.getClient(this, gso)

        binding.btnLogin.setOnClickListener { attemptLogin() }

        binding.btnGoogleLogin.setOnClickListener {
            setLoading(true)
            googleSignInClient.signOut().addOnCompleteListener {
                googleSignInLauncher.launch(googleSignInClient.signInIntent)
            }
        }

        binding.tvGoToRegister.setOnClickListener {
            startActivity(Intent(this, RegisterActivity::class.java))
        }

        // NEW: Navigate to Forgot Password Screen
        binding.tvForgotPassword.setOnClickListener {
            startActivity(Intent(this, ForgotPasswordActivity::class.java))
        }
    }

    private fun attemptGoogleAuth(token: String, role: String?) {
        lifecycleScope.launch {
            try {
                val response = loginApi.googleLogin(GoogleAuthRequest(token, role))
                handleAuthResponse(response)
            } catch (e: Exception) {
                showError("Unable to connect to server.")
                setLoading(false)
            }
        }
    }

    private fun attemptLogin() {
        val email = binding.etEmail.text.toString().trim()
        val password = binding.etPassword.text.toString().trim()

        if (email.isEmpty()) { binding.etEmail.error = "Required"; return }
        if (password.isEmpty()) { binding.etPassword.error = "Required"; return }

        setLoading(true)
        lifecycleScope.launch {
            try {
                val response = loginApi.login(LoginRequest(email, password))
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

            // Catch brand new Google Users and ask for their role
            if (data.requiresRoleSelection == true) {
                showRoleSelectionDialog()
                return
            }

            // Restrict to Tenant View Only
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
            val msg = body?.error?.message ?: "Login failed. Please try again."
            showError(msg)
            setLoading(false)
        }
    }

    private fun showRoleSelectionDialog() {
        val roles = arrayOf("🏡 Tenant (Looking to rent)", "🔑 Owner (Listing a property)")
        var selectedRoleIndex = 0

        MaterialAlertDialogBuilder(this)
            .setTitle("Welcome to CebuNest! 👋")
            .setMessage("Looks like you're new here. How will you be using CebuNest?")
            .setSingleChoiceItems(roles, selectedRoleIndex) { _, which ->
                selectedRoleIndex = which
            }
            .setPositiveButton("Continue") { _, _ ->
                val chosenRole = if (selectedRoleIndex == 0) "TENANT" else "OWNER"
                pendingGoogleToken?.let { attemptGoogleAuth(it, chosenRole) }
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
            .setTitle("Web Access Only")
            .setMessage("The CebuNest mobile app is designed exclusively for Tenants. To access the Owner dashboard and manage your properties, please log in using our web application.")
            .setPositiveButton("Got it") { dialog, _ ->
                dialog.dismiss()
                setLoading(false)
                googleSignInClient.signOut()
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
        binding.btnLogin.isEnabled = !loading
        binding.btnGoogleLogin.isEnabled = !loading
        binding.tvForgotPassword.isEnabled = !loading
        binding.btnLogin.text = if (loading) "Signing in…" else "Sign In"
    }

    private fun showError(msg: String) {
        binding.tvError.text = msg
        binding.tvError.visibility = View.VISIBLE
        binding.tvSuccess.visibility = View.GONE
    }

    private fun showSuccess() {
        binding.tvSuccess.visibility = View.VISIBLE
        binding.tvError.visibility = View.GONE
        binding.btnLogin.isEnabled = false
        binding.btnGoogleLogin.isEnabled = false
        binding.tvForgotPassword.isEnabled = false
    }
}