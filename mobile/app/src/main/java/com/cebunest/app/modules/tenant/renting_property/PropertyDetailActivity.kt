package com.cebunest.app.modules.tenant.renting_property

import android.app.DatePickerDialog
import android.app.Dialog
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.webkit.WebViewClient
import android.widget.ImageView
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.widget.doAfterTextChanged
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.RecyclerView
import com.bumptech.glide.Glide
import com.cebunest.app.R
import com.cebunest.app.core.api.RetrofitClient
import com.cebunest.app.databinding.ActivityPropertyDetailBinding
import com.cebunest.app.modules.tenant.home.Property
import com.cebunest.app.modules.tenant.home.PropertyImage
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONArray
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

class PropertyDetailActivity : AppCompatActivity() {

    private lateinit var binding: ActivityPropertyDetailBinding
    private val api = RetrofitClient.create<PropertyDetailApi>()
    private var propertyId: Int = -1
    private var currentProperty: Property? = null

    private var existingRequest: RentalRequest? = null
    private var nextPaymentId: Int? = null

    // State for Booking Calculation
    private var selectedStartDate: Date = Date()
    private var selectedDuration: Int = 1

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityPropertyDetailBinding.inflate(layoutInflater)
        setContentView(binding.root)

        propertyId = intent.getIntExtra("PROPERTY_ID", -1)
        if (propertyId == -1) {
            finish()
            return
        }

        binding.toolbar.setNavigationOnClickListener { finish() }
        setupClickListeners()

        fetchData()
    }

    private fun setupClickListeners() {
        binding.btnSubmitRequest.setOnClickListener { submitRequest() }
        binding.btnPayNext.setOnClickListener { processPaymentAction() }

        // Date Picker for Move-in Date
        binding.tvStartDatePicker.setOnClickListener {
            val calendar = Calendar.getInstance()
            calendar.time = selectedStartDate

            DatePickerDialog(this, { _, year, month, dayOfMonth ->
                val newCalendar = Calendar.getInstance()
                newCalendar.set(year, month, dayOfMonth)
                selectedStartDate = newCalendar.time
                updateBookingCalculations()
            }, calendar.get(Calendar.YEAR), calendar.get(Calendar.MONTH), calendar.get(Calendar.DAY_OF_MONTH)).apply {
                datePicker.minDate = System.currentTimeMillis() - 1000 // Block past dates
            }.show()
        }

        // Listen for changes in Lease Duration
        binding.etDuration.doAfterTextChanged { text ->
            selectedDuration = text.toString().toIntOrNull() ?: 1
            if (selectedDuration < 1) selectedDuration = 1
            updateBookingCalculations()
        }
    }

    private fun updateBookingCalculations() {
        if (currentProperty == null) return

        val dateFormat = SimpleDateFormat("MMM dd, yyyy", Locale.getDefault())
        val priceFormat = NumberFormat.getCurrencyInstance(Locale("en", "PH"))

        // Calculate Move Out
        val calendar = Calendar.getInstance()
        calendar.time = selectedStartDate
        calendar.add(Calendar.MONTH, selectedDuration)
        val moveOutDate = calendar.time

        // Update UI
        binding.tvStartDatePicker.text = dateFormat.format(selectedStartDate)
        binding.tvSumMoveIn.text = dateFormat.format(selectedStartDate)
        binding.tvSumMoveOut.text = dateFormat.format(moveOutDate)

        binding.tvSumMonthly.text = priceFormat.format(currentProperty!!.price)

        val total = currentProperty!!.price * selectedDuration
        binding.tvSumTotal.text = priceFormat.format(total)
    }

    private fun fetchData() {
        lifecycleScope.launch {
            try {
                // 1. Fetch Property
                val propRes = api.getPropertyById(propertyId)
                if (propRes.isSuccessful) {
                    currentProperty = propRes.body()?.data?.property
                    populateUI(currentProperty)
                    updateBookingCalculations() // Calculate default totals

                    // Fetch Map & Reviews in parallel once we have the location
                    currentProperty?.location?.let { fetchGeocodeAndMap(it) }
                    fetchReviews()
                }

                // 2. Fetch Existing Rental Request
                val reqRes = api.getMyRentalRequest(propertyId)
                if (reqRes.isSuccessful && reqRes.body()?.data?.request?.status != null) {
                    existingRequest = reqRes.body()?.data?.request
                    updateActionCardState()

                    // 3. If Confirmed, fetch payments
                    if (existingRequest?.status == "CONFIRMED") fetchPayments()
                } else {
                    updateActionCardState()
                }
            } catch (e: Exception) {
                Toast.makeText(this@PropertyDetailActivity, "Failed to load data", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun populateUI(property: Property?) {
        if (property == null) return

        binding.tvTitle.text = property.title
        binding.tvLocation.text = "📍 ${property.location}"
        binding.tvDescription.text = property.description

        val format = NumberFormat.getCurrencyInstance(Locale("en", "PH"))
        binding.tvPrice.text = "${format.format(property.price)} / mo"

        // Setup Stats
        val statsText = mutableListOf<String>()
        property.beds?.let { statsText.add("🛏️ $it Beds") }
        property.baths?.let { statsText.add("🚿 $it Baths") }
        property.sqm?.let { statsText.add("📐 $it sqm") }

        if (statsText.isNotEmpty()) {
            binding.tvBeds.text = statsText.getOrNull(0) ?: ""
            binding.tvBaths.text = statsText.getOrNull(1) ?: ""
            binding.tvSqm.text = statsText.getOrNull(2) ?: ""
            binding.layoutStats.visibility = View.VISIBLE
        } else {
            binding.layoutStats.visibility = View.GONE
        }

        // Setup Owner
        val ownerName = property.ownerName ?: "Property Owner"
        binding.tvOwnerName.text = ownerName
        binding.tvOwnerInitials.text = ownerName.split(" ").take(2).joinToString("") { it.first().uppercase() }

        property.ownerFacebookUrl?.let { url ->
            binding.btnFb.visibility = View.VISIBLE
            binding.btnFb.setOnClickListener { openUrl(url) }
        }
        property.ownerInstagramUrl?.let { url ->
            binding.btnIg.visibility = View.VISIBLE
            binding.btnIg.setOnClickListener { openUrl(url) }
        }
        property.ownerTwitterUrl?.let { url ->
            binding.btnTw.visibility = View.VISIBLE
            binding.btnTw.setOnClickListener { openUrl(url) }
        }

        // Setup Image Carousel
        val images = property.images ?: emptyList()
        if (images.isNotEmpty()) {
            binding.viewPagerImages.adapter = ImageCarouselAdapter(images, false)
            binding.tvImageCounter.text = "1 / ${images.size}"

            binding.viewPagerImages.registerOnPageChangeCallback(object : androidx.viewpager2.widget.ViewPager2.OnPageChangeCallback() {
                override fun onPageSelected(position: Int) {
                    binding.tvImageCounter.text = "${position + 1} / ${images.size}"
                }
            })
        }
    }

    private fun fetchReviews() {
        lifecycleScope.launch {
            try {
                val res = api.getPropertyReviews(propertyId)
                val reviews = res.body()?.data?.reviews ?: emptyList()

                if (reviews.isEmpty()) {
                    binding.tvReviewsSummary.text = "💬 No reviews yet. Be the first to review after your stay!"
                } else {
                    val avg = reviews.map { it.rating }.average()
                    binding.tvReviewsSummary.text = "⭐ %.1f Average Rating (${reviews.size} reviews)".format(avg)

                    binding.layoutReviewsList.removeAllViews()
                    val inflater = LayoutInflater.from(this@PropertyDetailActivity)

                    // Show top 2 reviews
                    reviews.take(2).forEach { review ->
                        val view = inflater.inflate(R.layout.item_review, binding.layoutReviewsList, false)
                        view.findViewById<TextView>(R.id.tvReviewerName).text = review.tenantName
                        view.findViewById<TextView>(R.id.tvReviewerInitials).text = review.tenantName.split(" ").take(2).joinToString("") { it.first().uppercase() }
                        view.findViewById<TextView>(R.id.tvReviewRating).text = "★ ${review.rating}"

                        try {
                            val parsedDate = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault()).parse(review.createdAt)
                            view.findViewById<TextView>(R.id.tvReviewDate).text = SimpleDateFormat("MMM dd, yyyy", Locale.getDefault()).format(parsedDate!!)
                        } catch (e: Exception) {
                            view.findViewById<TextView>(R.id.tvReviewDate).text = review.createdAt
                        }

                        view.findViewById<TextView>(R.id.tvReviewComment).text = review.comment ?: ""
                        binding.layoutReviewsList.addView(view)
                    }
                }
            } catch (e: Exception) {
                binding.tvReviewsSummary.text = "Unable to load reviews."
            }
        }
    }

    private fun fetchGeocodeAndMap(location: String) {
        lifecycleScope.launch(Dispatchers.IO) {
            try {
                val encodedLoc = URLEncoder.encode(location, "UTF-8")
                val url = URL("https://nominatim.openstreetmap.org/search?q=$encodedLoc&format=json&limit=1")
                val connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "GET"
                connection.setRequestProperty("User-Agent", "CebuNestApp/1.0 (cebunestapp@gmail.com)")
                connection.setRequestProperty("Accept", "application/json")
                connection.connectTimeout = 8000
                connection.readTimeout = 8000

                if (connection.responseCode == 200) {
                    val response = connection.inputStream.bufferedReader().use { it.readText() }
                    val jsonArray = JSONArray(response)

                    if (jsonArray.length() > 0) {
                        val obj = jsonArray.getJSONObject(0)
                        val lat = obj.getDouble("lat")
                        val lon = obj.getDouble("lon")

                        // Injecting Leaflet.js directly into the WebView for perfect map rendering
                        val htmlContent = """
                            <!DOCTYPE html>
                            <html>
                            <head>
                                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
                                <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
                                <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
                                <style>
                                    body { padding: 0; margin: 0; }
                                    #map { height: 100vh; width: 100vw; }
                                </style>
                            </head>
                            <body>
                                <div id="map"></div>
                                <script>
                                    var map = L.map('map').setView([$lat, $lon], 15);
                                    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
                                        maxZoom: 19,
                                        attribution: '© OpenStreetMap'
                                    }).addTo(map);
                                    L.marker([$lat, $lon]).addTo(map);
                                </script>
                            </body>
                            </html>
                        """.trimIndent()

                        withContext(Dispatchers.Main) {
                            binding.webViewMap.apply {
                                setLayerType(View.LAYER_TYPE_HARDWARE, null)
                                settings.javaScriptEnabled = true
                                settings.domStorageEnabled = true
                                settings.useWideViewPort = true
                                settings.loadWithOverviewMode = true
                                settings.mixedContentMode = android.webkit.WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
                                settings.userAgentString = "CebuNestApp/1.0 (cebunestapp@gmail.com)"

                                webChromeClient = android.webkit.WebChromeClient()
                                webViewClient = WebViewClient()
                                loadDataWithBaseURL("https://www.openstreetmap.org/", htmlContent, "text/html", "UTF-8", null)
                            }
                            binding.tvMapLoading.visibility = View.GONE
                            binding.webViewMap.visibility = View.VISIBLE
                        }
                    } else {
                        withContext(Dispatchers.Main) { binding.tvMapLoading.text = "📍 Location not found on map" }
                    }
                } else {
                    withContext(Dispatchers.Main) { binding.tvMapLoading.text = "📍 Map service unavailable (${connection.responseCode})" }
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) { binding.tvMapLoading.text = "📍 Failed to load map" }
            }
        }
    }

    // --- Lightbox Feature ---
    private fun showLightbox(images: List<PropertyImage>, startIndex: Int) {
        val dialog = Dialog(this, android.R.style.Theme_Black_NoTitleBar_Fullscreen)
        val viewPager = androidx.viewpager2.widget.ViewPager2(this).apply {
            adapter = ImageCarouselAdapter(images, isFullScreen = true)
        }
        dialog.setContentView(viewPager)
        viewPager.setCurrentItem(startIndex, false)
        dialog.show()
    }

    private fun openUrl(url: String) {
        try { startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url))) } catch (e: Exception) {}
    }

    private fun updateActionCardState() {
        val status = existingRequest?.status
        binding.layoutBooking.visibility = View.GONE
        binding.layoutPayments.visibility = View.GONE

        when (status) {
            "PENDING" -> binding.tvActionStatus.text = "⏳ Request Pending Owner Review"
            "APPROVED" -> {
                binding.tvActionStatus.text = "✅ Request Approved! Confirm below to start."
                binding.layoutPayments.visibility = View.VISIBLE
                binding.btnPayNext.text = "Confirm Rental"
            }
            "CONFIRMED" -> {
                binding.tvActionStatus.text = "🏠 You are an active tenant"
                binding.layoutPayments.visibility = View.VISIBLE
            }
            else -> {
                if (currentProperty?.status?.uppercase() == "AVAILABLE") {
                    binding.tvActionStatus.text = "Ready to move in?"
                    binding.layoutBooking.visibility = View.VISIBLE
                } else {
                    binding.tvActionStatus.text = "❌ Not currently available"
                }
            }
        }
    }

    private fun submitRequest() {
        val backendDateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(selectedStartDate)

        binding.btnSubmitRequest.isEnabled = false
        binding.btnSubmitRequest.text = "Submitting..."

        lifecycleScope.launch {
            try {
                val payload = RentalRequestPayload(propertyId, backendDateFormat, selectedDuration)
                val res = api.submitRentalRequest(payload)

                if (res.isSuccessful && res.body()?.success == true) {
                    Toast.makeText(this@PropertyDetailActivity, "Request Sent!", Toast.LENGTH_SHORT).show()
                    fetchData()
                } else {
                    val errorMsg = if (res.code() == 401 || res.code() == 403) {
                        "Session Expired! Please log out and log in again."
                    } else {
                        res.body()?.error?.message ?: "Server Error: ${res.code()}"
                    }
                    Toast.makeText(this@PropertyDetailActivity, errorMsg, Toast.LENGTH_LONG).show()

                    binding.btnSubmitRequest.isEnabled = true
                    binding.btnSubmitRequest.text = "Request to Rent"
                }
            } catch (e: Exception) {
                Toast.makeText(this@PropertyDetailActivity, "Network Error. Check your connection.", Toast.LENGTH_SHORT).show()
                binding.btnSubmitRequest.isEnabled = true
                binding.btnSubmitRequest.text = "Request to Rent"
            }
        }
    }

    private fun fetchPayments() {
        existingRequest?.id?.let { reqId ->
            lifecycleScope.launch {
                val res = api.getPaymentsForRequest(reqId)
                if (res.isSuccessful) {
                    val payments = res.body()?.data?.payments ?: emptyList()
                    val unpaid = payments.filter { it.status == "PENDING" || it.status == "OVERDUE" }
                        .sortedBy { it.installmentNumber }

                    if (unpaid.isNotEmpty()) {
                        nextPaymentId = unpaid[0].id
                        binding.btnPayNext.text = "Pay Month ${unpaid[0].installmentNumber}"
                    } else {
                        binding.btnPayNext.text = "All Caught Up!"
                        binding.btnPayNext.isEnabled = false
                    }
                }
            }
        }
    }

    private fun processPaymentAction() {
        if (existingRequest?.status == "APPROVED") {
            binding.btnPayNext.isEnabled = false
            lifecycleScope.launch {
                try {
                    val res = api.confirmRental(ConfirmPayload(existingRequest!!.id))
                    if (res.isSuccessful && res.body()?.success == true) {
                        Toast.makeText(this@PropertyDetailActivity, "Confirmed!", Toast.LENGTH_SHORT).show()
                        fetchData()
                    } else {
                        val errorMsg = if (res.code() == 401 || res.code() == 403) "Session Expired. Please log in again." else "Failed to confirm"
                        Toast.makeText(this@PropertyDetailActivity, errorMsg, Toast.LENGTH_LONG).show()
                        binding.btnPayNext.isEnabled = true
                    }
                } catch (e: Exception) {
                    Toast.makeText(this@PropertyDetailActivity, "Network error", Toast.LENGTH_SHORT).show()
                    binding.btnPayNext.isEnabled = true
                }
            }
        } else if (existingRequest?.status == "CONFIRMED" && nextPaymentId != null) {
            binding.btnPayNext.isEnabled = false
            lifecycleScope.launch {
                try {
                    val res = api.initiatePayment(nextPaymentId!!)
                    val url = res.body()?.data?.payment?.checkoutUrl
                    if (res.isSuccessful && url != null) {
                        startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                    } else {
                        val errorMsg = if (res.code() == 401 || res.code() == 403) "Session Expired." else "Failed to initiate payment"
                        Toast.makeText(this@PropertyDetailActivity, errorMsg, Toast.LENGTH_LONG).show()
                    }
                } catch (e: Exception) {
                    Toast.makeText(this@PropertyDetailActivity, "Network error", Toast.LENGTH_SHORT).show()
                } finally {
                    binding.btnPayNext.isEnabled = true
                }
            }
        }
    }

    // --- Inner Adapter for ViewPager Images ---
    private inner class ImageCarouselAdapter(
        val items: List<PropertyImage>,
        val isFullScreen: Boolean
    ) : RecyclerView.Adapter<ImageCarouselAdapter.ImageViewHolder>() {

        inner class ImageViewHolder(val imageView: ImageView) : RecyclerView.ViewHolder(imageView)

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ImageViewHolder {
            val iv = ImageView(parent.context).apply {
                layoutParams = ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
                scaleType = if (isFullScreen) ImageView.ScaleType.FIT_CENTER else ImageView.ScaleType.CENTER_CROP
            }
            return ImageViewHolder(iv)
        }

        override fun onBindViewHolder(holder: ImageViewHolder, position: Int) {
            Glide.with(holder.imageView.context).load(items[position].imageUrl).into(holder.imageView)

            if (!isFullScreen) {
                holder.imageView.setOnClickListener { showLightbox(items, position) }
            }
        }
        override fun getItemCount() = items.size
    }
}