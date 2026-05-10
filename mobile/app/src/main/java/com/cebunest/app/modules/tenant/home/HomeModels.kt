package com.cebunest.app.modules.tenant.home

data class HomeResponse<T>(
    val success: Boolean,
    val data: T?,
    val error: ErrorDetail?
)

data class ErrorDetail(val message: String)

data class PropertyTypesData(val types: List<PropertyType>?)
data class PropertiesData(val properties: List<Property>?)

data class PropertyType(
    val id: Int,
    val name: String
)

data class PropertyImage(val imageUrl: String)

data class Property(
    val id: Int,
    val title: String,
    val description: String,
    val price: Double,
    val location: String,
    val type: String,
    val status: String,
    val images: List<PropertyImage>?,
    val ownerId: Int,
    // --- The new fields we added! ---
    val ownerName: String?,
    val ownerFacebookUrl: String?,
    val ownerInstagramUrl: String?,
    val ownerTwitterUrl: String?,
    val beds: Int?,
    val baths: Int?,
    val sqm: Double?
)