package com.cebunest.app.modules.tenant.notifications

import android.content.Intent
import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import android.view.View
import android.widget.PopupWindow
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import com.cebunest.app.core.api.RetrofitClient
import com.cebunest.app.databinding.LayoutNotificationDropdownBinding
import com.cebunest.app.modules.tenant.my_rentals.RentalDetailActivity
import kotlinx.coroutines.launch

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

            // 3. Navigate if there is a rental ID attached to this notification
            if (notification.type != "ADMIN_BROADCAST" && notification.rentalRequestId != null) {
                val intent = Intent(activity, RentalDetailActivity::class.java).apply {
                    // We use "REQUEST_ID" here because that is what your RentalDetailActivity is looking for
                    putExtra("REQUEST_ID", notification.rentalRequestId)
                }
                activity.startActivity(intent)
            }
        }

        binding.rvNotifications.layoutManager = LinearLayoutManager(activity)
        binding.rvNotifications.adapter = adapter
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
                            binding.tvEmptyState.text = "You have no notifications yet."
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
        binding.progressBar.visibility = View.VISIBLE
        activity.lifecycleScope.launch {
            try {
                if (api.markAllAsRead().isSuccessful) fetchNotifications()
            } catch (e: Exception) {
                binding.progressBar.visibility = View.GONE
            }
        }
    }
}