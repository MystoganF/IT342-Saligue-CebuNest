package com.cebunest.app.modules.tenant.profile

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.bumptech.glide.Glide
import com.cebunest.app.core.api.RetrofitClient
import com.cebunest.app.core.session.SessionManager
import com.cebunest.app.databinding.FragmentProfileBinding
import com.cebunest.app.modules.auth.login.LoginActivity
import com.cebunest.app.modules.auth.shared.UserData
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import java.io.File
import java.io.FileOutputStream
import java.text.SimpleDateFormat
import java.util.Locale

class ProfileFragment : Fragment() {

    private var _binding: FragmentProfileBinding? = null
    private val binding get() = _binding!!

    private val api = RetrofitClient.create<ProfileApi>()
    private var currentUser: UserData? = null

    private val pickImageLauncher = registerForActivityResult(ActivityResultContracts.GetContent()) { uri: Uri? ->
        uri?.let { uploadAvatar(it) }
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentProfileBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        currentUser = SessionManager.getUser()
        populateUI()

        binding.btnChangeAvatar.setOnClickListener { pickImageLauncher.launch("image/*") }
        binding.cardAvatar.setOnClickListener { pickImageLauncher.launch("image/*") }
        binding.btnSave.setOnClickListener { saveProfile() }
        binding.btnLogout.setOnClickListener { showLogoutConfirmation() }
    }

    private fun populateUI() {
        val user = currentUser ?: return

        binding.tvName.text = user.name ?: "No Name"
        binding.tvEmail.text = user.email ?: ""

        // FIXED: Safe calls for initials
        binding.tvInitials.text = user.name?.split(" ")?.take(2)?.mapNotNull { it.firstOrNull()?.uppercaseChar() }?.joinToString("") ?: "UN"

        binding.etName.setText(user.name ?: "")
        binding.etPhone.setText(user.phoneNumber ?: "")
        binding.etFb.setText(user.facebookUrl ?: "")
        binding.etIg.setText(user.instagramUrl ?: "")
        binding.etTw.setText(user.twitterUrl ?: "")

        if (!user.avatarUrl.isNullOrEmpty()) {
            Glide.with(this).load(user.avatarUrl).into(binding.ivAvatar)
        }
    }

    private fun uploadAvatar(uri: Uri) {
        val user = currentUser ?: return
        binding.pbAvatarLoading.visibility = View.VISIBLE
        binding.btnChangeAvatar.isEnabled = false

        lifecycleScope.launch {
            try {
                val contentResolver = requireContext().contentResolver
                val tempFile = File.createTempFile("avatar_upload", ".jpg", requireContext().cacheDir)
                contentResolver.openInputStream(uri)?.use { input ->
                    FileOutputStream(tempFile).use { output -> input.copyTo(output) }
                }

                val requestFile = tempFile.asRequestBody("image/*".toMediaTypeOrNull())
                val body = MultipartBody.Part.createFormData("file", tempFile.name, requestFile)

                val res = api.updateAvatar(user.id, body)

                if (res.isSuccessful && res.body()?.success == true) {
                    val newUrl = res.body()?.data?.avatarUrl
                    val updatedUser = user.copy(avatarUrl = newUrl)
                    SessionManager.saveUser(updatedUser)
                    currentUser = updatedUser

                    Glide.with(requireContext()).load(newUrl).into(binding.ivAvatar)
                    Toast.makeText(requireContext(), "Avatar updated!", Toast.LENGTH_SHORT).show()
                } else {
                    Toast.makeText(requireContext(), "Failed to upload avatar", Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                Toast.makeText(requireContext(), "Error uploading image", Toast.LENGTH_SHORT).show()
            } finally {
                binding.pbAvatarLoading.visibility = View.GONE
                binding.btnChangeAvatar.isEnabled = true
            }
        }
    }

    private fun saveProfile() {
        val user = currentUser ?: return
        val newName = binding.etName.text.toString().trim()

        if (newName.isEmpty()) {
            binding.etName.error = "Name cannot be empty"
            return
        }

        binding.btnSave.isEnabled = false
        binding.btnSave.text = "Saving..."

        val payload = ProfileUpdatePayload(
            name = newName,
            phoneNumber = binding.etPhone.text.toString().takeIf { it.isNotBlank() },
            facebookUrl = binding.etFb.text.toString().takeIf { it.isNotBlank() },
            instagramUrl = binding.etIg.text.toString().takeIf { it.isNotBlank() },
            twitterUrl = binding.etTw.text.toString().takeIf { it.isNotBlank() }
        )

        lifecycleScope.launch {
            try {
                val res = api.updateProfile(user.id, payload)
                if (res.isSuccessful && res.body()?.success == true) {
                    val updatedUser = user.copy(
                        name = payload.name,
                        phoneNumber = payload.phoneNumber,
                        facebookUrl = payload.facebookUrl,
                        instagramUrl = payload.instagramUrl,
                        twitterUrl = payload.twitterUrl
                    )
                    SessionManager.saveUser(updatedUser)
                    currentUser = updatedUser

                    binding.tvName.text = updatedUser.name
                    binding.tvInitials.text = updatedUser.name?.split(" ")?.take(2)?.mapNotNull { it.firstOrNull()?.uppercaseChar() }?.joinToString("") ?: "UN"

                    Toast.makeText(requireContext(), "Changes saved successfully", Toast.LENGTH_SHORT).show()
                } else {
                    Toast.makeText(requireContext(), res.body()?.error?.message ?: "Failed to save", Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                Toast.makeText(requireContext(), "Network error", Toast.LENGTH_SHORT).show()
            } finally {
                binding.btnSave.isEnabled = true
                binding.btnSave.text = "Save Changes"
            }
        }
    }

    private fun showLogoutConfirmation() {
        AlertDialog.Builder(requireContext())
            .setTitle("Sign Out?")
            .setMessage("You'll be logged out of your account and returned to the login page.")
            .setPositiveButton("Yes, Log Out") { _, _ ->
                SessionManager.clear()
                val intent = Intent(requireContext(), LoginActivity::class.java)
                intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                startActivity(intent)
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}