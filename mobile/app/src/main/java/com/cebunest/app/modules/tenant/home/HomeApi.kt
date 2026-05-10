package com.cebunest.app.modules.tenant.home

import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.QueryMap

interface HomeApi {
    @GET("api/properties/types")
    suspend fun getPropertyTypes(): Response<HomeResponse<PropertyTypesData>>

    @GET("api/properties")
    suspend fun getProperties(
        @QueryMap params: Map<String, String>
    ): Response<HomeResponse<PropertiesData>>
}