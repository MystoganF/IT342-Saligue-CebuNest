package com.cebunest.app.modules.tenant.my_rentals

import android.graphics.Color
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.ImageView
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.bumptech.glide.Glide
import com.cebunest.app.R
import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.Locale

class RentalsAdapter(
    private var items: List<RentalRequest>,
    private val onItemClick: (Int) -> Unit,
    private val onConfirmClick: (Int) -> Unit
) : RecyclerView.Adapter<RentalsAdapter.ViewHolder>() {

    inner class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val ivThumb: ImageView = view.findViewById(R.id.ivThumbnail)
        val tvThumbPlaceholder: TextView = view.findViewById(R.id.tvThumbnailPlaceholder)
        val tvTitle: TextView = view.findViewById(R.id.tvTitle)
        val tvLocation: TextView = view.findViewById(R.id.tvLocation)
        val tvPrice: TextView = view.findViewById(R.id.tvPrice)
        val tvMeta: TextView = view.findViewById(R.id.tvMeta)
        val tvStatus: TextView = view.findViewById(R.id.tvStatus)
        val btnConfirm: Button = view.findViewById(R.id.btnConfirm)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_rental, parent, false)
        return ViewHolder(view)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val request = items[position]

        holder.tvTitle.text = request.propertyTitle
        holder.tvLocation.text = "📍 ${request.propertyLocation}"

        val priceFormat = NumberFormat.getCurrencyInstance(Locale("en", "PH"))
        holder.tvPrice.text = "${priceFormat.format(request.propertyPrice)} / mo"

        // Format Date
        var formattedDate = request.startDate
        try {
            val date = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).parse(request.startDate)
            if (date != null) formattedDate = SimpleDateFormat("MMM dd, yyyy", Locale.getDefault()).format(date)
        } catch (e: Exception) {}

        holder.tvMeta.text = "📅 Move in: $formattedDate\n🗓 ${request.leaseDurationMonths} mo • 👤 ${request.ownerName}"

        // Handle Image
        if (!request.propertyImage.isNullOrEmpty()) {
            Glide.with(holder.itemView.context).load(request.propertyImage).centerCrop().into(holder.ivThumb)
            holder.tvThumbPlaceholder.visibility = View.GONE
        } else {
            Glide.with(holder.itemView.context).clear(holder.ivThumb)
            holder.tvThumbPlaceholder.visibility = View.VISIBLE
        }

        // Handle Status and Colors
        holder.btnConfirm.visibility = View.GONE
        var statusText = request.status
        var bgColor = "#E8F0FE"
        var textColor = "#1877F2"

        when (request.status) {
            "CONFIRMED" -> { statusText = "Active Rental"; bgColor = "#E8F5E9"; textColor = "#1A7A4A" }
            "PENDING" -> { statusText = "Awaiting Approval"; bgColor = "#FFF8E1"; textColor = "#B78E42" }
            "APPROVED" -> {
                statusText = "Action Required"; bgColor = "#E0F2F1"; textColor = "#1F5D71"
                holder.btnConfirm.visibility = View.VISIBLE
            }
            "REJECTED" -> { statusText = "Rejected"; bgColor = "#FDEDEC"; textColor = "#C0392B" }
            "TERMINATED" -> { statusText = "Lease Terminated"; bgColor = "#F5EEF8"; textColor = "#7D3C98" }
            "COMPLETED" -> { statusText = "Completed"; bgColor = "#F2F3F4"; textColor = "#6E7071" }
        }

        holder.tvStatus.text = statusText
        holder.tvStatus.setTextColor(Color.parseColor(textColor))
        holder.tvStatus.background.setTint(Color.parseColor(bgColor))

        holder.itemView.setOnClickListener { onItemClick(request.id) }
        holder.btnConfirm.setOnClickListener { onConfirmClick(request.id) }
    }

    override fun getItemCount() = items.size

    fun updateData(newItems: List<RentalRequest>) {
        items = newItems
        notifyDataSetChanged()
    }
}