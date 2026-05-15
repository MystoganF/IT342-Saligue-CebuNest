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
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import androidx.core.widget.doAfterTextChanged
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
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
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.*

class PropertyDetailActivity : AppCompatActivity() {

    private lateinit var binding: ActivityPropertyDetailBinding
    private val api = RetrofitClient.create<PropertyDetailApi>()
    private var propertyId: Int = -1
    private var currentProperty: Property? = null

    private var existingRequest: RentalRequest? = null

    // State for Booking Calculation
    private var selectedStartDate: Date = Date()
    private var selectedDuration: Int = 1

    // Parity: Store all reviews to feed the Modal
    private var allReviewsList: List<Review> = emptyList()

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

        // Init RecyclerView for Payment Schedule
        binding.rvPaymentSchedule.layoutManager = LinearLayoutManager(this)

        fetchData()
    }

    private fun setupClickListeners() {
        binding.btnSubmitRequest.setOnClickListener { submitRequest() }
        binding.btnConfirmRental.setOnClickListener { processPaymentAction() }

        binding.tvStartDatePicker.setOnClickListener {
            val calendar = Calendar.getInstance()
            calendar.time = selectedStartDate

            DatePickerDialog(this, { _, year, month, dayOfMonth ->
                val newCalendar = Calendar.getInstance()
                newCalendar.set(year, month, dayOfMonth)
                selectedStartDate = newCalendar.time
                updateBookingCalculations()
            }, calendar.get(Calendar.YEAR), calendar.get(Calendar.MONTH), calendar.get(Calendar.DAY_OF_MONTH)).apply {
                datePicker.minDate = System.currentTimeMillis() - 1000
            }.show()
        }

        binding.etDuration.doAfterTextChanged { text ->
            selectedDuration = text.toString().toIntOrNull() ?: 1
            if (selectedDuration < 1) selectedDuration = 1
            updateBookingCalculations()
        }

        binding.btnViewAllReviews.setOnClickListener {
            showAllReviewsDialog()
        }
    }

    private fun updateBookingCalculations() {
        if (currentProperty == null) return

        val dateFormat = SimpleDateFormat("MMM dd, yyyy", Locale.getDefault())
        val priceFormat = NumberFormat.getCurrencyInstance(Locale("en", "PH"))

        val calendar = Calendar.getInstance()
        calendar.time = selectedStartDate
        calendar.add(Calendar.MONTH, selectedDuration)
        val moveOutDate = calendar.time

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
                val propRes = api.getPropertyById(propertyId)
                if (propRes.isSuccessful) {
                    currentProperty = propRes.body()?.data?.property
                    populateUI(currentProperty)
                    updateBookingCalculations()

                    currentProperty?.location?.let { fetchGeocodeAndMap(it) }
                    fetchReviews()
                }

                val reqRes = api.getMyRentalRequest(propertyId)
                if (reqRes.isSuccessful && reqRes.body()?.data?.request?.status != null) {
                    existingRequest = reqRes.body()?.data?.request
                    updateActionCardState()

                    if (existingRequest?.status == "CONFIRMED") fetchPayments()
                } else {
                    updateActionCardState()
                }
            } catch (e: Exception) {
                Toast.makeText(this@PropertyDetailActivity, "Failed to load data", Toast.LENGTH_SHORT).show()
            }
        }
    }

    // --- Parity: Robust Error Extractor ---
    private fun extractErrorMessage(errorBody: okhttp3.ResponseBody?): String {
        if (errorBody == null) return "Unknown error occurred"
        return try {
            val json = JSONObject(errorBody.string())
            when {
                json.has("error") && json.optJSONObject("error")?.has("message") == true -> {
                    json.getJSONObject("error").getString("message")
                }
                json.has("message") -> json.getString("message")
                json.has("error") && json.optString("error").isNotEmpty() -> {
                    "Server Error: ${json.getString("error")}"
                }
                else -> "An error occurred. Please try again."
            }
        } catch (e: Exception) {
            "Network error or invalid response."
        }
    }

    private fun populateUI(property: Property?) {
        if (property == null) return

        binding.tvTitle.text = property.title
        binding.tvLocation.text = "📍 ${property.location}"
        binding.tvDescription.text = property.description

        val format = NumberFormat.getCurrencyInstance(Locale("en", "PH"))
        binding.tvPrice.text = "${format.format(property.price)} / mo"

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
                allReviewsList = res.body()?.data?.reviews ?: emptyList()

                if (allReviewsList.isEmpty()) {
                    binding.tvReviewsSummary.text = "💬 No reviews yet. Be the first to review after your stay!"
                    binding.btnViewAllReviews.visibility = View.GONE
                } else {
                    val avg = allReviewsList.map { it.rating }.average()
                    binding.tvReviewsSummary.text = "⭐ %.1f Average Rating (${allReviewsList.size} reviews)".format(avg)

                    binding.layoutReviewsList.removeAllViews()
                    val inflater = LayoutInflater.from(this@PropertyDetailActivity)

                    // Parity: Show only top 2 natively
                    allReviewsList.take(2).forEach { review ->
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

                    // Parity: Show modal button if more than 0 reviews
                    if (allReviewsList.isNotEmpty()) {
                        binding.btnViewAllReviews.visibility = View.VISIBLE
                        binding.btnViewAllReviews.text = "View & Filter All ${allReviewsList.size} Reviews"
                    }
                }
            } catch (e: Exception) {
                binding.tvReviewsSummary.text = "Unable to load reviews."
            }
        }
    }

    // --- Parity: View All Reviews Dialog ---
    private fun showAllReviewsDialog() {
        val dialog = Dialog(this, android.R.style.Theme_DeviceDefault_Light_Dialog_NoActionBar_MinWidth)
        dialog.setContentView(R.layout.dialog_all_reviews)

        val spinner = dialog.findViewById<Spinner>(R.id.spinnerRatingFilter)
        val rvReviews = dialog.findViewById<RecyclerView>(R.id.rvAllReviews)
        val btnClose = dialog.findViewById<Button>(R.id.btnCloseReviews)

        val filterOptions = arrayOf("All Ratings", "5 Stars", "4 Stars", "3 Stars", "2 Stars", "1 Star")
        spinner.adapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item, filterOptions)

        rvReviews.layoutManager = LinearLayoutManager(this)

        fun updateDialogList(ratingFilter: Int) {
            val filtered = if (ratingFilter == 0) allReviewsList else allReviewsList.filter { it.rating == ratingFilter }
            rvReviews.adapter = DialogReviewAdapter(filtered)
        }

        spinner.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) {
                val rating = if (position == 0) 0 else 6 - position
                updateDialogList(rating)
            }
            override fun onNothingSelected(parent: AdapterView<*>?) {}
        }

        updateDialogList(0)
        btnClose.setOnClickListener { dialog.dismiss() }
        dialog.show()
    }

    private fun fetchGeocodeAndMap(location: String) {
        lifecycleScope.launch(Dispatchers.IO) {
            try {
                val encodedLoc = URLEncoder.encode(location, "UTF-8")
                val url = URL("https://nominatim.openstreetmap.org/search?q=$encodedLoc&format=json&limit=1")
                val connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "GET"
                connection.setRequestProperty("User-Agent", "CebuNestApp/1.0")
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

                        val htmlContent = """
                            <!DOCTYPE html>
                            <html>
                            <head>
                                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
                                <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
                                <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
                                <style>body { padding: 0; margin: 0; } #map { height: 100vh; width: 100vw; }</style>
                            </head>
                            <body>
                                <div id="map"></div>
                                <script>
                                    var map = L.map('map').setView([$lat, $lon], 15);
                                    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
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
                    withContext(Dispatchers.Main) { binding.tvMapLoading.text = "📍 Map service unavailable" }
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) { binding.tvMapLoading.text = "📍 Failed to load map" }
            }
        }
    }

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
        val status = existingRequest?.status?.uppercase()
        binding.layoutBooking.visibility = View.GONE
        binding.layoutPayments.visibility = View.GONE
        binding.btnConfirmRental.visibility = View.GONE
        binding.rvPaymentSchedule.visibility = View.GONE

        when (status) {
            "PENDING" -> binding.tvActionStatus.text = "Request Pending Owner Review"
            "APPROVED" -> {
                binding.tvActionStatus.text = "Request Approved!\nConfirm below to start."
                binding.layoutPayments.visibility = View.VISIBLE
                binding.btnConfirmRental.visibility = View.VISIBLE
            }
            "CONFIRMED" -> {
                binding.tvActionStatus.text = "You are an active tenant"
                binding.layoutPayments.visibility = View.VISIBLE
                binding.rvPaymentSchedule.visibility = View.VISIBLE
            }
            // Parity: Handle Rejected/Terminated
            "REJECTED", "TERMINATED" -> {
                binding.tvActionStatus.text = "Previous request was ${status?.lowercase()}. You may submit a new request."
                binding.layoutBooking.visibility = View.VISIBLE
            }
            else -> {
                if (currentProperty?.status?.uppercase() == "AVAILABLE") {
                    binding.tvActionStatus.text = "Ready to move in?"
                    binding.layoutBooking.visibility = View.VISIBLE
                } else {
                    binding.tvActionStatus.text = "Not currently available"
                    binding.btnSubmitRequest.isEnabled = false
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
                        extractErrorMessage(res.errorBody())
                    }
                    Toast.makeText(this@PropertyDetailActivity, errorMsg, Toast.LENGTH_LONG).show()
                }
            } catch (e: Exception) {
                Toast.makeText(this@PropertyDetailActivity, "Network Error. Check your connection.", Toast.LENGTH_SHORT).show()
            } finally {
                binding.btnSubmitRequest.isEnabled = true
                binding.btnSubmitRequest.text = "Request to Rent"
            }
        }
    }

    // --- Parity: Full Payment Schedule ---
    private fun fetchPayments() {
        existingRequest?.id?.let { reqId ->
            lifecycleScope.launch {
                val res = api.getPaymentsForRequest(reqId)
                if (res.isSuccessful) {
                    val payments = res.body()?.data?.payments ?: emptyList()
                    val unpaid = payments.filter { it.status == "PENDING" || it.status == "OVERDUE" }
                        .sortedBy { it.installmentNumber }

                    val nextPayablePaymentId = if (unpaid.isNotEmpty()) unpaid[0].id else null

                    // Group by Year to match React logic
                    val groupedItems = mutableListOf<PaymentListItem>()
                    val sdfIncoming = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
                    val sdfYear = SimpleDateFormat("yyyy", Locale.getDefault())

                    val byYear = payments.groupBy {
                        try { sdfYear.format(sdfIncoming.parse(it.dueDate)!!) } catch(e: Exception) { "Unknown" }
                    }

                    byYear.keys.sorted().forEach { year ->
                        groupedItems.add(PaymentListItem.YearHeader(year))
                        byYear[year]?.forEach { payment ->
                            val isPayable = payment.status != "PAID" && payment.id == nextPayablePaymentId
                            groupedItems.add(PaymentListItem.Installment(payment, isPayable))
                        }
                    }

                    binding.rvPaymentSchedule.adapter = PaymentScheduleAdapter(groupedItems) { paymentId ->
                        initiatePaymentRow(paymentId)
                    }
                }
            }
        }
    }

    // Used for the "Confirm Rental" button when status is APPROVED
    private fun processPaymentAction() {
        binding.btnConfirmRental.isEnabled = false
        binding.btnConfirmRental.text = "Confirming..."
        lifecycleScope.launch {
            try {
                val res = api.confirmRental(ConfirmPayload(existingRequest!!.id))
                if (res.isSuccessful && res.body()?.success == true) {
                    Toast.makeText(this@PropertyDetailActivity, "Confirmed!", Toast.LENGTH_SHORT).show()
                    fetchData()
                } else {
                    val errorMsg = if (res.code() == 401 || res.code() == 403) "Session Expired. Please log in again." else extractErrorMessage(res.errorBody())
                    Toast.makeText(this@PropertyDetailActivity, errorMsg, Toast.LENGTH_LONG).show()
                    binding.btnConfirmRental.isEnabled = true
                    binding.btnConfirmRental.text = "Confirm Rental"
                }
            } catch (e: Exception) {
                Toast.makeText(this@PropertyDetailActivity, "Network error", Toast.LENGTH_SHORT).show()
                binding.btnConfirmRental.isEnabled = true
                binding.btnConfirmRental.text = "Confirm Rental"
            }
        }
    }

    // Used by individual rows in the RecyclerView
    private fun initiatePaymentRow(paymentId: Int) {
        lifecycleScope.launch {
            try {
                val res = api.initiatePayment(paymentId)
                val url = res.body()?.data?.payment?.checkoutUrl
                if (res.isSuccessful && url != null) {
                    startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                } else {
                    val errorMsg = if (res.code() == 401 || res.code() == 403) "Session Expired." else extractErrorMessage(res.errorBody())
                    Toast.makeText(this@PropertyDetailActivity, errorMsg, Toast.LENGTH_LONG).show()
                }
            } catch (e: Exception) {
                Toast.makeText(this@PropertyDetailActivity, "Network error while trying to initiate payment.", Toast.LENGTH_SHORT).show()
            }
        }
    }

    // --- Inner Adapters ---

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
            if (!isFullScreen) holder.imageView.setOnClickListener { showLightbox(items, position) }
        }
        override fun getItemCount() = items.size
    }

    // Standard adapter for the Reviews Dialog
    private inner class DialogReviewAdapter(val reviews: List<Review>) : RecyclerView.Adapter<DialogReviewAdapter.ViewHolder>() {
        inner class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
            val tvName: TextView = view.findViewById(R.id.tvReviewerName)
            val tvInitials: TextView = view.findViewById(R.id.tvReviewerInitials)
            val tvRating: TextView = view.findViewById(R.id.tvReviewRating)
            val tvDate: TextView = view.findViewById(R.id.tvReviewDate)
            val tvComment: TextView = view.findViewById(R.id.tvReviewComment)
        }
        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
            val view = LayoutInflater.from(parent.context).inflate(R.layout.item_review, parent, false)
            return ViewHolder(view)
        }
        override fun onBindViewHolder(holder: ViewHolder, position: Int) {
            val review = reviews[position]
            holder.tvName.text = review.tenantName
            holder.tvInitials.text = review.tenantName.split(" ").take(2).joinToString("") { it.first().uppercase() }
            holder.tvRating.text = "★ ${review.rating}"
            holder.tvComment.text = review.comment ?: ""
            try {
                val parsedDate = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault()).parse(review.createdAt)
                holder.tvDate.text = SimpleDateFormat("MMM dd, yyyy", Locale.getDefault()).format(parsedDate!!)
            } catch (e: Exception) {
                holder.tvDate.text = review.createdAt
            }
        }
        override fun getItemCount() = reviews.size
    }
}

// Sealed class & Adapter for Grouped Payments
sealed class PaymentListItem {
    data class YearHeader(val year: String) : PaymentListItem()
    data class Installment(val payment: RentalPayment, val isPayable: Boolean) : PaymentListItem()
}

class PaymentScheduleAdapter(
    private val items: List<PaymentListItem>,
    private val onPayClick: (Int) -> Unit
) : RecyclerView.Adapter<RecyclerView.ViewHolder>() {

    private val TYPE_HEADER = 0
    private val TYPE_ITEM = 1
    private val priceFormat = NumberFormat.getCurrencyInstance(Locale("en", "PH"))
    private val dateIn = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
    private val dateOut = SimpleDateFormat("MMMM dd, yyyy", Locale.getDefault())

    override fun getItemViewType(position: Int): Int = if (items[position] is PaymentListItem.YearHeader) TYPE_HEADER else TYPE_ITEM

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): RecyclerView.ViewHolder {
        val inflater = LayoutInflater.from(parent.context)
        return if (viewType == TYPE_HEADER) {
            HeaderViewHolder(inflater.inflate(R.layout.item_payment_year, parent, false))
        } else {
            ItemViewHolder(inflater.inflate(R.layout.item_payment_row, parent, false))
        }
    }

    override fun onBindViewHolder(holder: RecyclerView.ViewHolder, position: Int) {
        val item = items[position]
        if (holder is HeaderViewHolder && item is PaymentListItem.YearHeader) {
            holder.tvYear.text = "Year ${item.year}"
        } else if (holder is ItemViewHolder && item is PaymentListItem.Installment) {
            holder.tvMonth.text = "Month ${item.payment.installmentNumber}"
            holder.tvAmount.text = priceFormat.format(item.payment.amount)

            try {
                val d = dateIn.parse(item.payment.dueDate)
                holder.tvDate.text = "Due: ${dateOut.format(d!!)}"
            } catch (e: Exception) {
                holder.tvDate.text = "Due: ${item.payment.dueDate}"
            }

            if (item.payment.status == "PAID") {
                holder.btnPay.visibility = View.GONE
                holder.tvPaidStatus.visibility = View.VISIBLE
            } else {
                holder.tvPaidStatus.visibility = View.GONE
                holder.btnPay.visibility = View.VISIBLE

                if (item.isPayable) {
                    holder.btnPay.isEnabled = true
                    holder.btnPay.backgroundTintList = android.content.res.ColorStateList.valueOf(android.graphics.Color.parseColor("#0F766E"))
                } else {
                    // Disable row if it's pending but a prior month is unpaid
                    holder.btnPay.isEnabled = false
                    holder.btnPay.backgroundTintList = android.content.res.ColorStateList.valueOf(android.graphics.Color.parseColor("#E2E8F0"))
                }

                holder.btnPay.setOnClickListener {
                    onPayClick(item.payment.id)
                }
            }
        }
    }

    override fun getItemCount() = items.size

    class HeaderViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val tvYear: TextView = view.findViewById(R.id.tvYearHeader)
    }
    class ItemViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val tvMonth: TextView = view.findViewById(R.id.tvInstallmentMonth)
        val tvDate: TextView = view.findViewById(R.id.tvInstallmentDate)
        val tvAmount: TextView = view.findViewById(R.id.tvInstallmentAmount)
        val btnPay: Button = view.findViewById(R.id.btnPayAction)
        val tvPaidStatus: TextView = view.findViewById(R.id.tvPaidStatus)
    }
}