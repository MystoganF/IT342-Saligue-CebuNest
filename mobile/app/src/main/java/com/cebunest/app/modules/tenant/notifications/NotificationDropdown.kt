package com.cebunest.app.modules.tenant.notifications

import android.app.Dialog
import android.content.res.ColorStateList
import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.PopupWindow
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import com.cebunest.app.R
import com.cebunest.app.core.api.RetrofitClient
import com.cebunest.app.databinding.LayoutNotificationDropdownBinding
import com.cebunest.app.modules.tenant.my_rentals.RentalDetailFragment
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

class NotificationDropdown(private val activity: AppCompatActivity, private val onUnreadCountChanged: (Int) -> Unit) {

    private val binding = LayoutNotificationDropdownBinding.inflate(activity.layoutInflater)
    private val api = RetrofitClient.create<NotificationApi>()
    private lateinit var adapter: NotificationAdapter

    private val density = activity.resources.displayMetrics.density
    private val widthPx = (350 * density).toInt()
    private val heightPx = (450 * density).toInt()

    private val popupWindow = PopupWindow(
        binding.root,
        widthPx,
        heightPx,
        true
    ).apply {
        setBackgroundDrawable(ColorDrawable(Color.TRANSPARENT))
        elevation = 10f
    }

    fun show(anchorView: View) {
        setupRecyclerView()
        fetchNotifications()

        binding.btnMarkAllRead.setOnClickListener {
            markAllAsRead()
        }

        popupWindow.showAsDropDown(anchorView, 0, 10)
    }

    private fun setupRecyclerView() {
        adapter = NotificationAdapter(emptyList()) { notification ->
            // 1. Mark as read on the backend if unread
            if (!notification.read) {
                markAsRead(notification.id)
            }

            // 2. Dismiss popup to prevent WindowLeaked crash
            popupWindow.dismiss()

            // 3. Handle Admin Broadcasts with a Custom Dialog
            if (notification.type.contains("ADMIN") || notification.type.contains("BROADCAST") ||
                notification.type == "EMERGENCY" || notification.type == "MAINTENANCE" || notification.type == "POLICY_UPDATE") {
                showAdminBroadcastDialog(notification)
            }
            // 4. Handle Rental Navigation using FragmentManager
            else if (notification.rentalRequestId != null) {
                val detailFragment = RentalDetailFragment().apply {
                    arguments = Bundle().apply {
                        putInt("REQUEST_ID", notification.rentalRequestId)
                    }
                }

                activity.supportFragmentManager.beginTransaction()
                    .replace(R.id.fragmentContainer, detailFragment)
                    .addToBackStack(null)
                    .commit()
            }
        }

        binding.rvNotifications.layoutManager = LinearLayoutManager(activity)
        binding.rvNotifications.adapter = adapter
    }

    private fun showAdminBroadcastDialog(notification: AppNotification) {
        val dialog = Dialog(activity)
        dialog.setContentView(R.layout.dialog_admin_broadcast)

        dialog.window?.setLayout(
            (activity.resources.displayMetrics.widthPixels * 0.9).toInt(),
            ViewGroup.LayoutParams.WRAP_CONTENT
        )
        dialog.window?.setBackgroundDrawableResource(android.R.color.transparent)

        val tvTitle = dialog.findViewById<TextView>(R.id.tvAdminTitle)
        val tvMessage = dialog.findViewById<TextView>(R.id.tvAdminMessage)
        val tvDate = dialog.findViewById<TextView>(R.id.tvAdminDate)
        val tvTypeTag = dialog.findViewById<TextView>(R.id.tvAdminTypeTag)
        val ivIcon = dialog.findViewById<ImageView>(R.id.ivAdminIcon)
        val iconContainer = dialog.findViewById<FrameLayout>(R.id.iconAdminContainer)
        val btnClose = dialog.findViewById<Button>(R.id.btnAdminClose)

        val type = notification.type ?: "ADMIN_BROADCAST"

        // Matching Web Colors and Icons
        var iconRes = android.R.drawable.ic_dialog_info
        var tintColor = Color.parseColor("#1f5d71")
        var bgColor = Color.parseColor("#0F1F5D71")
        var titleText = "General Broadcast"

        when (type) {
            "EMERGENCY" -> {
                iconRes = android.R.drawable.ic_dialog_alert
                tintColor = Color.parseColor("#c0392b")
                bgColor = Color.parseColor("#14C0392B")
                titleText = "Emergency Alert"
            }
            "MAINTENANCE" -> {
                iconRes = android.R.drawable.ic_menu_manage
                tintColor = Color.parseColor("#b78e42")
                bgColor = Color.parseColor("#14B78E42")
                titleText = "Maintenance Notice"
            }
            "POLICY_UPDATE" -> {
                iconRes = android.R.drawable.ic_menu_agenda
                tintColor = Color.parseColor("#1f5d71")
                bgColor = Color.parseColor("#0F1F5D71")
                titleText = "Policy Update"
            }
            "ADMIN_BROADCAST" -> {
                iconRes = android.R.drawable.ic_dialog_info
                tintColor = Color.parseColor("#1f5d71")
                bgColor = Color.parseColor("#0F1F5D71")
                titleText = "General Broadcast"
            }
        }

        // Apply dynamic styling
        tvTitle.text = titleText
        tvTypeTag.text = "🛡️ ${type.replace("_", " ")}"
        tvTypeTag.setTextColor(tintColor)

        ivIcon.setImageResource(iconRes)
        ivIcon.setColorFilter(tintColor)
        iconContainer.backgroundTintList = ColorStateList.valueOf(bgColor)
        btnClose.setTextColor(tintColor)

        // Set text content
        tvMessage.text = notification.message

        try {
            val parsedDate = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault()).parse(notification.createdAt)
            tvDate.text = "Sent " + SimpleDateFormat("MMM dd, yyyy - hh:mm a", Locale.getDefault()).format(parsedDate!!)
        } catch (e: Exception) {
            tvDate.text = "Sent " + notification.createdAt
        }

        btnClose.setOnClickListener { dialog.dismiss() }
        dialog.show()
    }

    fun fetchNotifications(){
        binding.progressBar.visibility = View.VISIBLE
        binding.tvEmptyState.visibility = View.GONE
        binding.rvNotifications.visibility = View.GONE

        activity.lifecycleScope.launch {
            try {
                val response = api.getMyNotifications()
                if (response.isSuccessful) {
                    val body = response.body()
                    if (body?.success == true) {
                        val list = body.data?.notifications ?: emptyList()
                        val unreadCount = list.count { !it.read }
                        onUnreadCountChanged(unreadCount)
                        adapter.updateData(list)

                        if (list.isEmpty()) {
                            binding.tvEmptyState.text = "All caught up!\nNo notifications yet."
                            binding.tvEmptyState.visibility = View.VISIBLE
                        } else {
                            binding.rvNotifications.visibility = View.VISIBLE
                        }
                    } else {
                        binding.tvEmptyState.text = body?.error?.message ?: "Failed to load."
                        binding.tvEmptyState.visibility = View.VISIBLE
                    }
                } else {
                    binding.tvEmptyState.text = "Server Error: ${response.code()}"
                    binding.tvEmptyState.visibility = View.VISIBLE
                }
            } catch (e: Exception) {
                binding.tvEmptyState.text = "Network error. Is the server running?"
                binding.tvEmptyState.visibility = View.VISIBLE
            } finally {
                binding.progressBar.visibility = View.GONE
            }
        }
    }

    private fun markAsRead(id: Int) {
        activity.lifecycleScope.launch {
            try {
                if (api.markAsRead(id).isSuccessful) fetchNotifications()
            } catch (e: Exception) { /* Ignored */ }
        }
    }

    private fun markAllAsRead() {
        binding.btnMarkAllRead.text = "Marking..."
        binding.btnMarkAllRead.isEnabled = false
        activity.lifecycleScope.launch {
            try {
                if (api.markAllAsRead().isSuccessful) fetchNotifications()
            } catch (e: Exception) {
                // Ignore
            } finally {
                binding.btnMarkAllRead.text = "Mark all read"
                binding.btnMarkAllRead.isEnabled = true
            }
        }
    }
}