package com.cebunest.app.modules.tenant.my_rentals

import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.bumptech.glide.Glide
import com.cebunest.app.R
import com.cebunest.app.databinding.ItemRentalCardBinding
import java.text.NumberFormat
import java.util.Locale

class RentalsAdapter(
    private var requests: List<RentalRequest>,
    private var overdueData: Map<Int, Int>,
    private val onItemClick: (Int) -> Unit,
    private val onConfirmClick: (Int) -> Unit
) : RecyclerView.Adapter<RentalsAdapter.ViewHolder>() {

    fun updateData(newRequests: List<RentalRequest>) {
        requests = newRequests
        notifyDataSetChanged()
    }

    fun updateOverdueData(newOverdueData: Map<Int, Int>) {
        overdueData = newOverdueData
        notifyDataSetChanged() // Rebinds visible cards to show borders/pills instantly
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val binding = ItemRentalCardBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return ViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        holder.bind(requests[position])
    }

    override fun getItemCount() = requests.size

    // FIX 1: Inherit from RecyclerView.ViewHolder (NOT RecyclerView.Adapter)
    inner class ViewHolder(private val binding: ItemRentalCardBinding) : RecyclerView.ViewHolder(binding.root) {

        fun bind(request: RentalRequest) {
            binding.tvPropertyTitle.text = request.propertyTitle
            binding.tvLocation.text = request.propertyLocation

            // Format Price
            val format = NumberFormat.getCurrencyInstance(Locale("en", "PH"))
            binding.tvPrice.text = "${format.format(request.propertyPrice)}/mo"

            // Image loading (Glide)
            // FIX 2: Replaced missing R.color.slate_light with a ColorDrawable that matches the web CSS
            val placeholderColor = ColorDrawable(Color.parseColor("#E2E8F0"))

            Glide.with(binding.root.context)
                .load(request.propertyImage)
                .placeholder(placeholderColor)
                .into(binding.ivPropertyImage)

            // Status Badge
            binding.tvStatus.text = request.status
            when (request.status) {
                "CONFIRMED" -> {
                    binding.tvStatus.setTextColor(Color.parseColor("#059669"))
                    binding.cvStatusBadge.setCardBackgroundColor(Color.parseColor("#D1FAE5"))
                }
                "PENDING", "APPROVED" -> {
                    binding.tvStatus.setTextColor(Color.parseColor("#0284C7"))
                    binding.cvStatusBadge.setCardBackgroundColor(Color.parseColor("#E0F2FE"))
                }
                "REJECTED" -> {
                    binding.tvStatus.setTextColor(Color.parseColor("#DC2626"))
                    binding.cvStatusBadge.setCardBackgroundColor(Color.parseColor("#FEE2E2"))
                }
                else -> {
                    binding.tvStatus.setTextColor(Color.parseColor("#475569"))
                    binding.cvStatusBadge.setCardBackgroundColor(Color.parseColor("#F1F5F9"))
                }
            }

            // ─── Overdue UI Logic ───
            val overdueCount = overdueData[request.id] ?: 0

            if (overdueCount > 0 && request.status != "TERMINATED") {
                // Apply Red Overdue Styling
                binding.cardContainer.strokeColor = Color.parseColor("#DC2626") // Red Border
                binding.cardContainer.strokeWidth = 3

                binding.cvOverduePill.visibility = View.VISIBLE
                binding.tvOverduePillText.text = "$overdueCount overdue payment${if (overdueCount > 1) "s" else ""}"

                binding.ivWarningOverlay.visibility = View.VISIBLE // Thumbnail overlay
            } else {
                // Default Styling
                binding.cardContainer.strokeColor = Color.parseColor("#E2E8F0")
                binding.cardContainer.strokeWidth = 1

                binding.cvOverduePill.visibility = View.GONE
                binding.ivWarningOverlay.visibility = View.GONE
            }

            // Click Listeners
            binding.root.setOnClickListener { onItemClick(request.id) }
        }
    }
}