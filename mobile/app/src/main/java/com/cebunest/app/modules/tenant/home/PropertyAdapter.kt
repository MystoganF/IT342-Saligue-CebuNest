package com.cebunest.app.modules.tenant.home

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.ImageView
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.cebunest.app.R
import java.text.NumberFormat
import java.util.Locale

class PropertyAdapter(
    private var properties: List<Property>,
    private val onItemClick: (Int) -> Unit
) : RecyclerView.Adapter<PropertyAdapter.ViewHolder>() {

    class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val tvTitle: TextView = view.findViewById(R.id.tvTitle)
        val tvLocation: TextView = view.findViewById(R.id.tvLocation)
        val tvPrice: TextView = view.findViewById(R.id.tvPrice)
        val tvStatusBadge: TextView = view.findViewById(R.id.tvStatusBadge)
        val ivImage: ImageView = view.findViewById(R.id.ivPropertyImage)
        val btnView: Button = view.findViewById(R.id.btnView)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_property, parent, false)
        return ViewHolder(view)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val property = properties[position]

        holder.tvTitle.text = property.title
        holder.tvLocation.text = "📍 ${property.location}"

        val format = NumberFormat.getCurrencyInstance(Locale("en", "PH"))
        holder.tvPrice.text = "${format.format(property.price)} / mo"
        holder.tvStatusBadge.text = property.status.uppercase()

        // --- NEW IMAGE LOADING CODE ---
        if (!property.images.isNullOrEmpty()) {
            val imageUrl = property.images[0].imageUrl

            // You will need to import com.bumptech.glide.Glide at the top of the file
            com.bumptech.glide.Glide.with(holder.itemView.context)
                .load(imageUrl)
                .centerCrop() // Makes sure the image fills the box perfectly
                .into(holder.ivImage)
        } else {
            // Clear the image view if there is no image so it doesn't accidentally
            // show an image from a previous recycled card
            com.bumptech.glide.Glide.with(holder.itemView.context)
                .clear(holder.ivImage)
        }

        holder.itemView.setOnClickListener { onItemClick(property.id) }
        holder.btnView.setOnClickListener { onItemClick(property.id) }
    }

    override fun getItemCount() = properties.size

    fun updateData(newProperties: List<Property>) {
        this.properties = newProperties
        notifyDataSetChanged()
    }
}