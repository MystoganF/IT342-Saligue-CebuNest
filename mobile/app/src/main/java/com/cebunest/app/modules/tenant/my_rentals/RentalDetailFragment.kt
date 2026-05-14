package com.cebunest.app.modules.tenant.my_rentals

import android.app.AlertDialog
import android.content.Intent
import android.content.res.ColorStateList
import android.graphics.Color
import android.graphics.Typeface
import android.net.Uri
import android.os.Bundle
import android.view.Gravity
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.webkit.WebChromeClient
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.viewpager2.widget.ViewPager2
import com.cebunest.app.R
import com.cebunest.app.core.api.RetrofitClient
import com.cebunest.app.core.session.SessionManager
import com.cebunest.app.databinding.ActivityRentalDetailBinding
import com.cebunest.app.modules.tenant.home.Property
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONArray
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.Locale


class RentalDetailFragment : Fragment() {

    private var _binding: ActivityRentalDetailBinding? = null
    private val binding get() = _binding!!
    private val api = RetrofitClient.create<RentalsApi>()
    private var requestId: Int = -1
    private var propertyId: Int = -1
    private var currentRating = 0
    private var loggedInUserId = -1
    private var pendingVerificationPaymentId: Int? = null
    private var extMonthsRequested = 1 // Track extension stepper
    private var allPublicReviews: List<Review> = emptyList()

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = ActivityRentalDetailBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        loggedInUserId = SessionManager.getUser()?.id ?: -1
        requestId = arguments?.getInt("REQUEST_ID", -1) ?: -1

        if (requestId == -1) {
            parentFragmentManager.popBackStack()
            return
        }

        setupReviewPicker()
        setupAccordions()
        setupExtensionStepper()

        binding.btnSubmitExtension.setOnClickListener { submitExtension() }
        binding.btnSubmitReview.setOnClickListener { submitReview() }
        binding.btnViewAllReviews.setOnClickListener { showAllReviewsModal() }

        fetchData()
    }

    override fun onResume() {
        super.onResume()
        if (requestId != -1) {
            val paymentToVerify = pendingVerificationPaymentId
            if (paymentToVerify != null) {
                pendingVerificationPaymentId = null
                binding.pbPaymentProgress.visibility = View.VISIBLE
                viewLifecycleOwner.lifecycleScope.launch {
                    try { api.verifyPayment(paymentToVerify) } catch (e: Exception) {}
                    finally { fetchData() }
                }
            } else {
                fetchData()
            }
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }

    private fun setupAccordions() {
        binding.btnToggleHistory.setOnClickListener {
            val isVisible = binding.containerPaymentHistory.visibility == View.VISIBLE
            binding.containerPaymentHistory.visibility = if (isVisible) View.GONE else View.VISIBLE
            binding.tvHistoryChevron.text = if (isVisible) "▼" else "▲"
        }

        binding.btnToggleExtensions.setOnClickListener {
            val isVisible = binding.containerExtensionsBody.visibility == View.VISIBLE
            binding.containerExtensionsBody.visibility = if (isVisible) View.GONE else View.VISIBLE
            binding.tvExtensionsChevron.text = if (isVisible) "▼" else "▲"
        }

        binding.btnRequestExtension.setOnClickListener {
            binding.layoutExtensionForm.visibility = View.VISIBLE
            binding.btnRequestExtension.visibility = View.GONE
        }
    }

    private fun setupExtensionStepper() {
        binding.btnExtMinus.setOnClickListener {
            if (extMonthsRequested > 1) {
                extMonthsRequested--
                binding.tvExtMonths.text = extMonthsRequested.toString()
            }
        }
        binding.btnExtPlus.setOnClickListener {
            extMonthsRequested++
            binding.tvExtMonths.text = extMonthsRequested.toString()
        }
    }

    private fun fetchData() {
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val reqRes = api.getMyRentalRequests()
                val request = reqRes.body()?.data?.requests?.find { it.id == requestId } ?: return@launch
                propertyId = request.propertyId

                populateSummary(request)
                fetchMap(request.propertyLocation)

                val propRes = api.getPropertyById(propertyId)
                if (propRes.isSuccessful) {
                    val propData = propRes.body()?.data?.property
                    if (propData != null) {
                        populatePropertyDetails(propData, request)
                    }
                }

                if (request.status == "CONFIRMED" || request.status == "COMPLETED" || request.status == "TERMINATED") {
                    binding.layoutActionAccordions.visibility = View.VISIBLE

                    val payDeferred = async { api.getPaymentsForRequest(requestId) }
                    val extDeferred = async { api.getLeaseExtensions(requestId) }
                    val revDeferred = async { api.getPropertyReviews(propertyId) }

                    val paymentsRes = payDeferred.await()
                    val extsRes = extDeferred.await()
                    val revsRes = revDeferred.await()

                    if (paymentsRes.isSuccessful) populatePayments(paymentsRes.body()?.data?.payments ?: emptyList(), request)
                    if (extsRes.isSuccessful) populateExtensions(extsRes.body()?.data?.extensionRequests ?: emptyList())
                    if (revsRes.isSuccessful) populateReviews(revsRes.body()?.data?.reviews ?: emptyList())
                }
            } catch (e: Exception) {}
        }
    }

    private fun populatePropertyDetails(prop: Property, req: RentalRequest) {
        // Image Gallery
        if (!prop.images.isNullOrEmpty()) {
            binding.vpPropertyImages.adapter = GalleryAdapter(prop.images)
            binding.tvNoImage.visibility = View.GONE
            if (prop.images.size > 1) {
                binding.tvGalleryCounter.visibility = View.VISIBLE
                binding.tvGalleryCounter.text = "1 / ${prop.images.size}"
                binding.vpPropertyImages.registerOnPageChangeCallback(object : ViewPager2.OnPageChangeCallback() {
                    override fun onPageSelected(position: Int) {
                        binding.tvGalleryCounter.text = "${position + 1} / ${prop.images.size}"
                    }
                })
            }
        } else {
            binding.tvNoImage.visibility = View.VISIBLE
        }

        // Stats & Description
        if (prop.beds != null || prop.baths != null || prop.sqm != null) {
            binding.layoutPropertyStats.visibility = View.VISIBLE
            binding.tvBeds.text = "${prop.beds ?: 0} Beds"
            binding.tvBaths.text = "${prop.baths ?: 0} Baths"
            binding.tvSqm.text = "${prop.sqm ?: 0} sqm"
        }

        if (!prop.description.isNullOrEmpty()) {
            binding.tvDescription.visibility = View.VISIBLE
            binding.tvDescription.text = prop.description
        }

        // Owner Avatar & Socials
        val ownerName = req.ownerName ?: "Unknown"
        binding.tvOwnerName.text = ownerName
        binding.tvOwnerAvatar.text = ownerName.take(1).uppercase()

        if (!req.ownerFacebookUrl.isNullOrEmpty()) {
            binding.btnFacebook.visibility = View.VISIBLE
            binding.btnFacebook.setOnClickListener { startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(req.ownerFacebookUrl))) }
        }
        if (!req.ownerInstagramUrl.isNullOrEmpty()) {
            binding.btnInstagram.visibility = View.VISIBLE
            binding.btnInstagram.setOnClickListener { startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(req.ownerInstagramUrl))) }
        }
    }

    private fun populateSummary(req: RentalRequest) {
        binding.tvPropertyTitle.text = req.propertyTitle
        binding.tvLocation.text = "📍 ${req.propertyLocation}"

        val priceFmt = NumberFormat.getCurrencyInstance(Locale("en", "PH"))
        binding.tvPrice.text = "${priceFmt.format(req.propertyPrice)} / mo"

        val details = """
            Status: ${req.status.replace("_", " ")}
            Move-in: ${formatDate(req.startDate)}
            Duration: ${req.leaseDurationMonths} months
            Total Value: ${priceFmt.format(req.propertyPrice * req.leaseDurationMonths)}
            Listed By: ${req.ownerName}
        """.trimIndent()
        binding.tvSummaryDetails.text = details

        // Hide Extensions Accordion if Completed/Terminated
        if (req.status == "COMPLETED" || req.status == "TERMINATED") {
            binding.cardExtensions.visibility = View.GONE
        }
    }

    private fun populatePayments(payments: List<Payment>, req: RentalRequest) {
        binding.containerPaymentSchedule.removeAllViews()
        binding.containerPaymentHistory.removeAllViews()

        var paidCount = 0
        var paidAmount = 0.0

        val format = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
        val yearFormat = SimpleDateFormat("yyyy", Locale.getDefault())

        val unpaid = payments.filter { it.status == "PENDING" || it.status == "OVERDUE" || it.status == "FAILED" }
            .sortedBy { it.installmentNumber }
        val nextPayablePaymentId = unpaid.firstOrNull()?.id

        // Outstanding Balance Logic
        val overduePayments = payments.filter { it.status == "OVERDUE" }
        val totalOverdueAmount = overduePayments.sumOf { it.amount }

        if ((req.status == "COMPLETED" || req.status == "TERMINATED") && totalOverdueAmount > 0) {
            binding.bannerOverdueBalance.visibility = View.VISIBLE
            binding.tvOverdueBannerText.text = "Your lease has ended, but you have an overdue balance of ${NumberFormat.getCurrencyInstance(Locale("en", "PH")).format(totalOverdueAmount)}. Please settle below."
        }

        val schedulePayments = payments.filter { it.status != "PAID" }
        val historyPayments = payments.filter { it.status == "PAID" }

        val scheduleByYear = schedulePayments.groupBy { p ->
            if (p.dueDate != null) {
                try { yearFormat.format(format.parse(p.dueDate)!!) } catch(e: Exception) { "Unknown" }
            } else "Unknown"
        }.toSortedMap()

        if (scheduleByYear.isEmpty()) {
            binding.containerPaymentSchedule.addView(TextView(requireContext()).apply { text = "All payments complete."; setPadding(16,16,16,16); setTextColor(Color.GRAY) })
        } else {
            scheduleByYear.forEach { (year, yearPayments) ->
                val yearHeader = TextView(requireContext()).apply {
                    text = "▼ Year $year"
                    setTypeface(null, Typeface.BOLD)
                    setTextColor(Color.parseColor("#1F5D71"))
                    setPadding(16, 24, 16, 16)
                }
                val yearBody = LinearLayout(requireContext()).apply { orientation = LinearLayout.VERTICAL }

                yearPayments.forEach { p ->
                    val isNext = p.id == nextPayablePaymentId
                    val isLocked = !isNext
                    val row = buildPaymentRow(p, false, req, isNext, isLocked)
                    yearBody.addView(row)
                }

                yearHeader.setOnClickListener {
                    val isVisible = yearBody.visibility == View.VISIBLE
                    yearBody.visibility = if (isVisible) View.GONE else View.VISIBLE
                    yearHeader.text = if (isVisible) "▶ Year $year" else "▼ Year $year"
                }

                binding.containerPaymentSchedule.addView(yearHeader)
                binding.containerPaymentSchedule.addView(yearBody)
            }
        }

        if (historyPayments.isEmpty()) {
            binding.containerPaymentHistory.addView(TextView(requireContext()).apply { text = "No past payments."; setTextColor(Color.GRAY) })
        } else {
            historyPayments.forEach { p ->
                paidCount++
                paidAmount += p.amount
                val row = buildPaymentRow(p, true, req, false, false)
                binding.containerPaymentHistory.addView(row)
            }
        }

        if (payments.isNotEmpty()) {
            binding.pbPaymentProgress.max = payments.size
            binding.pbPaymentProgress.progress = paidCount
            binding.tvProgressText.text = "$paidCount of ${payments.size} months paid"
        }
    }

    private fun buildPaymentRow(p: Payment, isHistory: Boolean, req: RentalRequest, isNext: Boolean, isLocked: Boolean): View {
        val row = LinearLayout(requireContext()).apply {
            orientation = LinearLayout.HORIZONTAL
            setPadding(16, 24, 16, 24)
            gravity = Gravity.CENTER_VERTICAL

            if (!isHistory) {
                if (isNext) setBackgroundColor(Color.parseColor("#0A53A4A3")) // Light Aero
                else if (p.status == "OVERDUE" || p.status == "FAILED") setBackgroundColor(Color.parseColor("#08C0392B")) // Light Red
                if (isLocked && !isNext) alpha = 0.5f
            }
        }

        val infoLayout = LinearLayout(requireContext()).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
        }

        val info = TextView(requireContext()).apply {
            text = "Month ${p.installmentNumber}"
            setTypeface(null, Typeface.BOLD)
            setTextColor(Color.parseColor("#1F5D71"))
            textSize = 14f
        }

        val dateInfo = TextView(requireContext()).apply {
            text = if (isHistory) "Paid: ${formatDate(p.paidAt)}" else "Due: ${formatDate(p.dueDate)}"
            setTextColor(Color.parseColor("#6E7071"))
            textSize = 12f
        }

        infoLayout.addView(info)
        infoLayout.addView(dateInfo)

        // Reset Link for Expired Pending
        if (!isHistory && !isLocked && p.status == "PENDING" && p.checkoutUrl != null) {
            val resetLink = TextView(requireContext()).apply {
                text = "Link expired? Click to reset"
                textSize = 11f
                setTextColor(Color.parseColor("#B78E42"))
                paintFlags = paintFlags or android.graphics.Paint.UNDERLINE_TEXT_FLAG
                setPadding(0, 4, 0, 0)
                setOnClickListener { initiatePayment(p.id, true) }
            }
            infoLayout.addView(resetLink)
        }

        val actionLayout = LinearLayout(requireContext()).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL }

        if (isHistory) {
            val amountTv = TextView(requireContext()).apply { text = NumberFormat.getCurrencyInstance(Locale("en", "PH")).format(p.amount); setTypeface(null, Typeface.BOLD); setPadding(0,0,16,0); setTextColor(Color.parseColor("#1F5D71")) }
            val btnReceipt = Button(requireContext(), null, android.R.attr.buttonStyleSmall).apply {
                text = "Receipt"
                setTextColor(Color.parseColor("#1F5D71"))
                setBackgroundColor(Color.TRANSPARENT)
                setOnClickListener { showReceiptModal(p, req) }
            }
            actionLayout.addView(amountTv)
            actionLayout.addView(btnReceipt)
        } else {
            val hasError = p.status == "OVERDUE" || p.status == "FAILED"

            // Overdue warning text below dates if overdue
            if (p.status == "OVERDUE" && !isLocked) {
                val overduePill = TextView(requireContext()).apply {
                    text = "⚠ OVERDUE"
                    setTextColor(Color.parseColor("#C0392B"))
                    textSize = 10f
                    setTypeface(null, Typeface.BOLD)
                    setPadding(16, 4, 16, 4)
                    background = ContextCompat.getDrawable(requireContext(), R.drawable.bg_dark_overlay)?.apply { setTint(Color.parseColor("#1AC0392B")) }
                    layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply { topMargin = 8 }
                }
                infoLayout.addView(overduePill)
            }

            if (isLocked) {
                actionLayout.addView(TextView(requireContext()).apply {
                    text = "LOCKED"
                    setTextColor(Color.parseColor("#94A3B8"))
                    textSize = 10f
                    setTypeface(null, Typeface.BOLD)
                    setPadding(24, 8, 24, 8)
                    background = ContextCompat.getDrawable(requireContext(), R.drawable.bg_dark_overlay)?.apply { setTint(Color.parseColor("#176E7071")) }
                })
            } else {
                val btnPay = Button(requireContext(), null, android.R.attr.buttonStyleSmall).apply {
                    text = "Pay Now"
                    setBackgroundColor(if (hasError) Color.parseColor("#C0392B") else Color.parseColor("#1F5D71"))
                    setTextColor(Color.WHITE)
                    setOnClickListener { initiatePayment(p.id, false) }
                }
                actionLayout.addView(btnPay)
            }
        }

        row.addView(infoLayout)
        row.addView(actionLayout)

        val divider = View(requireContext()).apply { layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 2); setBackgroundColor(Color.parseColor("#F0F4F5")) }

        val wrapper = LinearLayout(requireContext()).apply { orientation = LinearLayout.VERTICAL }
        wrapper.addView(row)
        wrapper.addView(divider)
        return wrapper
    }

    private fun showReceiptModal(payment: Payment, req: RentalRequest) {
        val message = """
            Property: ${req.propertyTitle}
            Installment: Month ${payment.installmentNumber}
            Amount Paid: ${NumberFormat.getCurrencyInstance(Locale("en", "PH")).format(payment.amount)}
            Date Paid: ${formatDate(payment.paidAt ?: payment.dueDate)}
            Ref ID: ${payment.paymongoPaymentId ?: "MANUAL-${payment.id}"}
            Status: ✓ COMPLETED
        """.trimIndent()

        AlertDialog.Builder(requireContext())
            .setTitle("Transaction Receipt")
            .setMessage(message)
            .setPositiveButton("Close", null)
            .show()
    }

    private fun initiatePayment(paymentId: Int, isReset: Boolean) {
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                if (isReset) {
                    Toast.makeText(requireContext(), "Resetting payment link...", Toast.LENGTH_SHORT).show()
                    api.cancelPayment(paymentId)
                }
                val res = api.initiatePayment(paymentId)
                val url = res.body()?.data?.payment?.checkoutUrl
                if (res.isSuccessful && url != null) {
                    pendingVerificationPaymentId = paymentId
                    startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                } else {
                    Toast.makeText(requireContext(), "Failed to load payment link.", Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                Toast.makeText(requireContext(), "Network error. Please try again.", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun populateExtensions(exts: List<LeaseExtension>) {
        binding.containerExtensionsList.removeAllViews()
        var hasPending = false
        exts.forEach { ext ->
            if (ext.status == "PENDING") hasPending = true

            val extView = LinearLayout(requireContext()).apply {
                orientation = LinearLayout.VERTICAL
                setPadding(0, 16, 0, 16)
            }

            val headerTxt = TextView(requireContext()).apply {
                text = "+${ext.requestedMonths} months [${ext.status}]"
                textSize = 14f
                setTypeface(null, Typeface.BOLD)
                setTextColor(
                    when (ext.status) {
                        "PENDING" -> Color.parseColor("#B78E42")
                        "APPROVED" -> Color.parseColor("#1A7A4A")
                        else -> Color.parseColor("#C0392B")
                    }
                )
            }
            extView.addView(headerTxt)

            if (!ext.reason.isNullOrEmpty()) {
                val reasonTxt = TextView(requireContext()).apply {
                    text = "\"${ext.reason}\""
                    textSize = 12f
                    setTextColor(Color.parseColor("#6E7071"))
                    setPadding(0, 4, 0, 0)
                }
                extView.addView(reasonTxt)
            }

            binding.containerExtensionsList.addView(extView)
        }

        if (hasPending) {
            binding.btnRequestExtension.visibility = View.GONE
            binding.layoutExtensionForm.visibility = View.GONE
        }
    }

    private fun submitExtension() {
        val reason = binding.etExtReason.text.toString().trim()

        binding.btnSubmitExtension.isEnabled = false
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val payload = ExtensionPayload(requestId, extMonthsRequested, reason.ifEmpty { null })
                val res = api.submitLeaseExtension(payload)
                if (res.isSuccessful) {
                    Toast.makeText(requireContext(), "Extension Requested!", Toast.LENGTH_SHORT).show()
                    binding.layoutExtensionForm.visibility = View.GONE
                    val extsRes = api.getLeaseExtensions(requestId)
                    populateExtensions(extsRes.body()?.data?.extensionRequests ?: emptyList())
                }
            } catch (e: Exception) {}
            finally { binding.btnSubmitExtension.isEnabled = true }
        }
    }

    private fun populateReviews(reviews: List<Review>) {
        allPublicReviews = reviews
        binding.containerPublicReviews.removeAllViews()

        if (reviews.isEmpty()) {
            binding.tvReviewsSummary.text = "No reviews yet."
            binding.layoutReviewStats.visibility = View.GONE
            binding.btnViewAllReviews.visibility = View.GONE
        } else {
            binding.layoutReviewStats.visibility = View.VISIBLE
            val avg = reviews.map { it.rating }.average()
            binding.tvAverageRating.text = String.format(Locale.US, "%.1f", avg)
            binding.tvTotalReviews.text = "${reviews.size} review${if(reviews.size > 1) "s" else ""}"
            binding.tvReviewsSummary.visibility = View.GONE

            // Build the 5-star progress breakdown
            binding.containerStarBars.removeAllViews()
            for (star in 5 downTo 1) {
                val count = reviews.count { it.rating == star }
                val pct = if (reviews.isNotEmpty()) (count.toFloat() / reviews.size * 100).toInt() else 0

                val row = LinearLayout(requireContext()).apply {
                    orientation = LinearLayout.HORIZONTAL
                    gravity = Gravity.CENTER_VERTICAL
                    layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply { bottomMargin = 4 }
                }

                row.addView(TextView(requireContext()).apply { text = "$star ★"; textSize = 10f; setTextColor(Color.parseColor("#1F5D71")); setTypeface(null, Typeface.BOLD); width = 80 })

                val progress = ProgressBar(requireContext(), null, android.R.attr.progressBarStyleHorizontal).apply {
                    layoutParams = LinearLayout.LayoutParams(0, 16, 1f)
                    progressDrawable = ContextCompat.getDrawable(requireContext(), R.drawable.bg_dark_overlay)?.apply { setTint(Color.parseColor("#E2E8F0")) }
                    progressTintList = ColorStateList.valueOf(Color.parseColor("#F59E0B")) // Amber
                    max = 100
                    this.progress = pct
                }
                row.addView(progress)
                row.addView(TextView(requireContext()).apply { text = count.toString(); textSize = 10f; setTextColor(Color.GRAY); setPadding(16, 0, 0, 0) })
                binding.containerStarBars.addView(row)
            }

            // Show top 2 reviews
            reviews.take(2).forEach { rev ->
                val v = LinearLayout(requireContext()).apply { orientation = LinearLayout.VERTICAL; setPadding(0, 16, 0, 16) }
                val header = TextView(requireContext()).apply { text = "${rev.tenantName}  •  ${"★".repeat(rev.rating)}"; setTypeface(null, Typeface.BOLD); setTextColor(Color.parseColor("#1F5D71")) }
                v.addView(header)
                if (!rev.comment.isNullOrEmpty()) {
                    v.addView(TextView(requireContext()).apply { text = rev.comment; setTextColor(Color.DKGRAY); setPadding(0, 8, 0, 0) })
                }
                binding.containerPublicReviews.addView(v)
            }

            if (reviews.size > 2) {
                binding.btnViewAllReviews.visibility = View.VISIBLE
            }
        }

        // My review state
        val myReview = reviews.find { it.tenantId == loggedInUserId }
        if (myReview != null) {
            binding.layoutReviewForm.visibility = View.GONE
            binding.layoutReviewSubmitted.visibility = View.VISIBLE
            binding.tvMyReviewStars.text = "★".repeat(myReview.rating)
            binding.tvMyReviewComment.text = myReview.comment ?: ""
        }
    }

    private fun showAllReviewsModal() {
        val listLayout = LinearLayout(requireContext()).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(40, 20, 40, 20)
        }
        allPublicReviews.forEach { rev ->
            val v = LinearLayout(requireContext()).apply { orientation = LinearLayout.VERTICAL; setPadding(0, 16, 0, 24) }
            v.addView(TextView(requireContext()).apply { text = "${rev.tenantName}  •  ${"★".repeat(rev.rating)}"; setTypeface(null, Typeface.BOLD); setTextColor(Color.parseColor("#1F5D71")) })
            if (!rev.comment.isNullOrEmpty()) {
                v.addView(TextView(requireContext()).apply { text = rev.comment; setTextColor(Color.DKGRAY); setPadding(0, 8, 0, 0) })
            }
            listLayout.addView(v)
        }

        val scroll = androidx.core.widget.NestedScrollView(requireContext()).apply { addView(listLayout) }

        AlertDialog.Builder(requireContext())
            .setTitle("All Tenant Reviews")
            .setView(scroll)
            .setPositiveButton("Close", null)
            .show()
    }

    private fun setupReviewPicker() {
        val stars = listOf(binding.star1, binding.star2, binding.star3, binding.star4, binding.star5)
        stars.forEachIndexed { index, imageView ->
            imageView.setOnClickListener {
                currentRating = index + 1
                stars.forEachIndexed { i, star ->
                    star.setColorFilter(if (i < currentRating) Color.parseColor("#B78E42") else Color.parseColor("#DDDDDD"))
                }
            }
        }
    }

    private fun submitReview() {
        if (currentRating == 0) { Toast.makeText(requireContext(), "Select a rating", Toast.LENGTH_SHORT).show(); return }
        val comment = binding.etReviewComment.text.toString().trim()
        binding.btnSubmitReview.isEnabled = false

        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val res = api.submitPropertyReview(ReviewPayload(requestId, currentRating, comment.ifEmpty { null }))
                if (res.isSuccessful) {
                    Toast.makeText(requireContext(), "Review Submitted!", Toast.LENGTH_SHORT).show()
                    val revsRes = api.getPropertyReviews(propertyId)
                    populateReviews(revsRes.body()?.data?.reviews ?: emptyList())
                }
            } catch (e: Exception) {}
            finally { binding.btnSubmitReview.isEnabled = true }
        }
    }

    private fun fetchMap(location: String) {
        viewLifecycleOwner.lifecycleScope.launch(Dispatchers.IO) {
            try {
                val enc = URLEncoder.encode(location, "UTF-8")
                val url = URL("https://nominatim.openstreetmap.org/search?q=$enc&format=json&limit=1")
                val conn = url.openConnection() as HttpURLConnection
                conn.requestMethod = "GET"
                conn.setRequestProperty("User-Agent", "CebuNestApp/1.0 (cebunestapp@gmail.com)")
                conn.setRequestProperty("Accept", "application/json")
                conn.connectTimeout = 8000
                conn.readTimeout = 8000

                if (conn.responseCode == 200) {
                    val resp = conn.inputStream.bufferedReader().use { it.readText() }
                    val arr = JSONArray(resp)
                    if (arr.length() > 0) {
                        val lat = arr.getJSONObject(0).getDouble("lat")
                        val lon = arr.getJSONObject(0).getDouble("lon")

                        val htmlContent = """
                            <!DOCTYPE html>
                            <html>
                            <head>
                                <title>Map</title>
                                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
                                <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossorigin=""/>
                                <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" crossorigin=""></script>
                                <style>
                                    body { padding: 0; margin: 0; }
                                    html, body, #map { height: 100%; width: 100vw; }
                                </style>
                            </head>
                            <body>
                                <div id="map"></div>
                                <script>
                                    var map = L.map('map').setView([$lat, $lon], 15);
                                    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
                                        maxZoom: 19,
                                        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                    }).addTo(map);
                                    var marker = L.marker([$lat, $lon]).addTo(map);
                                </script>
                            </body>
                            </html>
                        """.trimIndent()

                        withContext(Dispatchers.Main) {
                            binding.webViewMap.apply {
                                setLayerType(View.LAYER_TYPE_HARDWARE, null)
                                settings.javaScriptEnabled = true
                                settings.domStorageEnabled = true
                                webChromeClient = WebChromeClient()
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
                    withContext(Dispatchers.Main) { binding.tvMapLoading.text = "📍 Map service unavailable (${conn.responseCode})" }
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) { binding.tvMapLoading.text = "📍 Failed to load map" }
            }
        }
    }

    private fun formatDate(dateStr: String?): String {
        if (dateStr.isNullOrEmpty()) return "—"
        return try {
            val date = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).parse(dateStr)
            SimpleDateFormat("MMM dd, yyyy", Locale.getDefault()).format(date!!)
        } catch (e: Exception) { dateStr }
    }
}