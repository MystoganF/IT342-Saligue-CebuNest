package com.cebunest.app.modules.tenant.my_rentals

import android.view.ViewGroup
import android.widget.ImageView
import androidx.recyclerview.widget.RecyclerView
import com.bumptech.glide.Glide
import com.cebunest.app.modules.tenant.home.PropertyImage

class GalleryAdapter(private val images: List<PropertyImage>) : RecyclerView.Adapter<GalleryAdapter.GalleryViewHolder>() {

    inner class GalleryViewHolder(val imageView: ImageView) : RecyclerView.ViewHolder(imageView)

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): GalleryViewHolder {
        val imageView = ImageView(parent.context).apply {
            layoutParams = ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
            scaleType = ImageView.ScaleType.CENTER_CROP
        }
        return GalleryViewHolder(imageView)
    }

    override fun onBindViewHolder(holder: GalleryViewHolder, position: Int) {
        Glide.with(holder.imageView.context)
            .load(images[position].imageUrl)
            .into(holder.imageView)
    }

    override fun getItemCount() = images.size
}