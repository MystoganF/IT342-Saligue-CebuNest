package com.cebunest.app.modules.tenant.notifications

import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import android.view.View
import android.widget.PopupWindow
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import com.cebunest.app.core.api.RetrofitClient
import com.cebunest.app.databinding.LayoutNotificationDropdownBinding
import kotlinx.coroutines.launch

class NotificationDropdown(private val activity: AppCompatActivity) {

    private val binding = LayoutNotificationDropdownBinding.inflate(activity.layoutInflater)
    private val api = RetrofitClient.create<NotificationApi>()
    private lateinit var adapter: NotificationAdapter

    // 1. Convert DP to exact Pixels so the popup doesn't squash the RecyclerView
    private val density = activity.resources.displayMetrics.density
    private val widthPx = (350 * density).toInt()  // Was 320
    private val heightPx = (450 * density).toInt() // Was 400

    // 2. Force the explicit width and height instead of WRAP_CONTENT
    private val popupWindow = PopupWindow(
        binding.root,
        widthPx,
        heightPx,
        true
    ).apply {
        // This makes the background transparent so the rounded corners of your CardView look good!
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
            if (!notification.read) {
                markAsRead(notification.id)
            }
        }
        binding.rvNotifications.layoutManager = LinearLayoutManager(activity)
        binding.rvNotifications.adapter = adapter
    }

    private fun fetchNotifications() {
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
                        adapter.updateData(list)

                        if (list.isEmpty()) {
                            binding.tvEmptyState.text = "You have no notifications yet."
                            binding.tvEmptyState.visibility = View.VISIBLE
                        } else {
                            // Because we forced the heightPx above, this will now display perfectly!
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