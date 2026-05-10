package com.cebunest.app.modules.tenant.notifications

import android.graphics.Color
import android.graphics.Typeface
import android.util.Log
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
        val iconContainer: View = view.findViewById(R.id.iconContainer) // <-- Add this line
        val ivIcon: ImageView = view.findViewById(R.id.ivIcon)
        val tvMessage: TextView = view.findViewById(R.id.tvMessage)
        val tvDate: TextView = view.findViewById(R.id.tvDate)
        val unreadDot: View = view.findViewById(R.id.unreadDot)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        // Use our sleek new custom layout!
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_notification, parent, false)
        return ViewHolder(view)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val notification = notifications[position]
        Log.d("NotificationDebug", "Received type: '${notification.type}'")


        holder.tvMessage.text = notification.message
        holder.tvDate.text = notification.createdAt.take(10)

        val typeStr = notification.type.trim().uppercase()

        when (typeStr) {
            "RENTAL_REQUEST_APPROVED", "REQUEST_APPROVED" -> {
                holder.ivIcon.setImageResource(R.drawable.ic_check_circle)
                holder.ivIcon.setColorFilter(Color.parseColor("#10B981")) // Emerald Green
                holder.iconContainer.background.setTint(Color.parseColor("#D1FAE5")) // Light Green Bg
            }
            "RENTAL_REQUEST_REJECTED", "REQUEST_REJECTED" -> {
                holder.ivIcon.setImageResource(R.drawable.ic_cancel)
                holder.ivIcon.setColorFilter(Color.parseColor("#EF4444")) // Red
                holder.iconContainer.background.setTint(Color.parseColor("#FEE2E2")) // Light Red Bg
            }
            "PAYMENT_DUE" -> {
                holder.ivIcon.setImageResource(R.drawable.ic_payment)
                holder.ivIcon.setColorFilter(Color.parseColor("#F59E0B")) // Amber/Orange
                holder.iconContainer.background.setTint(Color.parseColor("#FEF3C7")) // Light Amber Bg
            }
            "PAYMENT_SUCCESS", "PAYMENT_RECEIVED", "PAYMENT_PAID" -> {
                holder.ivIcon.setImageResource(R.drawable.ic_check_circle)
                holder.ivIcon.setColorFilter(Color.parseColor("#3B82F6")) // Blue
                holder.iconContainer.background.setTint(Color.parseColor("#DBEAFE")) // Light Blue Bg
            }

            // --- NEW TYPES FROM BACKEND ---

            "ADMIN_BROADCAST" -> {
                // Suggested: A megaphone or announcement icon if you have one
                holder.ivIcon.setImageResource(R.drawable.ic_notifications)
                holder.ivIcon.setColorFilter(Color.parseColor("#8B5CF6")) // Purple
                holder.iconContainer.background.setTint(Color.parseColor("#EDE9FE")) // Light Purple Bg
            }
            "REQUEST_PENDING" -> {
                // Suggested: A clock or hourglass icon
                holder.ivIcon.setImageResource(R.drawable.ic_payment)
                holder.ivIcon.setColorFilter(Color.parseColor("#F59E0B")) // Amber
                holder.iconContainer.background.setTint(Color.parseColor("#FEF3C7")) // Light Amber Bg
            }
            "LEASE_STARTED" -> {
                // Suggested: A home or key icon
                holder.ivIcon.setImageResource(R.drawable.ic_check_circle)
                holder.ivIcon.setColorFilter(Color.parseColor("#059669")) // Darker Green
                holder.iconContainer.background.setTint(Color.parseColor("#D1FAE5")) // Light Green Bg
            }
            "LEASE_TERMINATED" -> {
                // Suggested: A block or document-off icon
                holder.ivIcon.setImageResource(R.drawable.ic_cancel)
                holder.ivIcon.setColorFilter(Color.parseColor("#9CA3AF")) // Slate/Gray
                holder.iconContainer.background.setTint(Color.parseColor("#F3F4F6")) // Light Gray Bg
            }

            // ------------------------------

            else -> {
                // Default System Alert (Bell)
                holder.ivIcon.setImageResource(R.drawable.ic_notifications)
                holder.ivIcon.setColorFilter(Color.parseColor("#64748B")) // Slate Gray
                holder.iconContainer.background.setTint(Color.parseColor("#F1F5F9")) // Light Gray Bg
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