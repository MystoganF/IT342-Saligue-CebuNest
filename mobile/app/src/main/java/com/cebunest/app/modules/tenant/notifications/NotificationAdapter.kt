package com.cebunest.app.modules.tenant.notifications

import android.graphics.Color
import android.graphics.Typeface
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.cebunest.app.R

class NotificationAdapter(
    private var notifications: List<AppNotification>,
    private val onNotificationClick: (AppNotification) -> Unit
) : RecyclerView.Adapter<NotificationAdapter.ViewHolder>() {

    class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val iconContainer: View = view.findViewById(R.id.iconContainer)
        val ivIcon: ImageView = view.findViewById(R.id.ivIcon)
        val tvMessage: TextView = view.findViewById(R.id.tvMessage)
        val tvDate: TextView = view.findViewById(R.id.tvDate)
        val unreadDot: View = view.findViewById(R.id.unreadDot)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_notification, parent, false)
        return ViewHolder(view)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val notification = notifications[position]

        holder.tvMessage.text = notification.message
        holder.tvDate.text = notification.createdAt.take(10)

        // Safely uppercase the type
        val typeStr = notification.type.trim().uppercase()

// Use substring matching so it catches everything automatically!
        when {
            typeStr.contains("APPROVED") -> {
                // Catches RENTAL_REQUEST_APPROVED, EXTENSION_APPROVED, etc.
                holder.ivIcon.setImageResource(R.drawable.ic_check_circle)
                holder.ivIcon.setColorFilter(Color.parseColor("#10B981"))
                holder.iconContainer.background.setTint(Color.parseColor("#D1FAE5"))
            }
            typeStr.contains("REJECTED") || typeStr.contains("TERMINATED") -> {
                // Catches RENTAL_REQUEST_REJECTED, EXTENSION_REJECTED, LEASE_TERMINATED
                holder.ivIcon.setImageResource(R.drawable.ic_cancel)
                holder.ivIcon.setColorFilter(Color.parseColor("#EF4444"))
                holder.iconContainer.background.setTint(Color.parseColor("#FEE2E2"))
            }
            typeStr.contains("DUE") || typeStr.contains("PENDING") -> {
                // Catches PAYMENT_DUE, REQUEST_PENDING, EXTENSION_PENDING
                holder.ivIcon.setImageResource(R.drawable.ic_payment)
                holder.ivIcon.setColorFilter(Color.parseColor("#F59E0B"))
                holder.iconContainer.background.setTint(Color.parseColor("#FEF3C7"))
            }
            typeStr.contains("SUCCESS") || typeStr.contains("RECEIVED") || typeStr.contains("PAID") -> {
                // Catches PAYMENT_SUCCESS, PAYMENT_RECEIVED
                holder.ivIcon.setImageResource(R.drawable.ic_check_circle)
                holder.ivIcon.setColorFilter(Color.parseColor("#3B82F6"))
                holder.iconContainer.background.setTint(Color.parseColor("#DBEAFE"))
            }
            typeStr.contains("ADMIN") -> {
                // Catches ADMIN_BROADCAST, ADMIN_MESSAGE
                holder.ivIcon.setImageResource(R.drawable.ic_notifications)
                holder.ivIcon.setColorFilter(Color.parseColor("#8B5CF6"))
                holder.iconContainer.background.setTint(Color.parseColor("#EDE9FE"))
            }
            typeStr.contains("STARTED") -> {
                // Catches LEASE_STARTED
                holder.ivIcon.setImageResource(R.drawable.ic_check_circle)
                holder.ivIcon.setColorFilter(Color.parseColor("#059669"))
                holder.iconContainer.background.setTint(Color.parseColor("#D1FAE5"))
            }
            else -> {
                // Default System Alert (Bell)
                holder.ivIcon.setImageResource(R.drawable.ic_notifications)
                holder.ivIcon.setColorFilter(Color.parseColor("#64748B"))
                holder.iconContainer.background.setTint(Color.parseColor("#F1F5F9"))
            }
        }
        // 2. STYLING FOR READ VS UNREAD
        if (notification.read) {
            holder.tvMessage.setTypeface(null, Typeface.NORMAL)
            holder.tvMessage.setTextColor(Color.parseColor("#64748B")) // Slate grey
            holder.unreadDot.visibility = View.GONE // Hide blue dot
        } else {
            holder.tvMessage.setTypeface(null, Typeface.BOLD)
            holder.tvMessage.setTextColor(Color.parseColor("#0F172A")) // Very dark text
            holder.unreadDot.visibility = View.VISIBLE // Show blue dot
        }

        holder.itemView.setOnClickListener {
            onNotificationClick(notification)
        }
    }

    fun updateData(newNotifications: List<AppNotification>) {
        this.notifications = newNotifications
        notifyDataSetChanged()
    }

    override fun getItemCount() = notifications.size
}