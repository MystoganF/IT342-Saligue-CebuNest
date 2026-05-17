package com.cebunest.app.modules.tenant.my_rentals

import android.content.res.ColorStateList
import android.graphics.Color
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import com.cebunest.app.R
import com.cebunest.app.core.api.RetrofitClient
import com.cebunest.app.databinding.FragmentRentalsBinding
import com.google.android.material.chip.Chip
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class RentalsFragment : Fragment() {

    private var _binding: FragmentRentalsBinding? = null
    private val binding get() = _binding!!

    private val api = RetrofitClient.create<RentalsApi>()
    private lateinit var adapter: RentalsAdapter
    private var allRequests: List<RentalRequest> = emptyList()
    private var currentTab = "ACTIVE"

    // ─── Cache to mimic Web's sessionStorage for instant loading ───
    companion object {
        private var overdueCache: Map<Int, Int>? = null
        private var cacheTimestamp: Long = 0
        private const val CACHE_TTL = 5 * 60 * 1000L // 5 minutes
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentRentalsBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        setupRecyclerView()
        setupTabs()

        binding.chipActive.isChecked = true
        fetchRequests()
    }

    private fun setupRecyclerView() {
        adapter = RentalsAdapter(
            emptyList(),
            emptyMap(), // Initially empty overdue map
            onItemClick = { requestId ->
                val detailFragment = RentalDetailFragment().apply {
                    arguments = Bundle().apply {
                        putInt("REQUEST_ID", requestId)
                    }
                }
                requireActivity().supportFragmentManager.beginTransaction()
                    .replace(R.id.fragmentContainer, detailFragment)
                    .addToBackStack(null)
                    .commit()
            },
            onConfirmClick = { requestId ->
                confirmRental(requestId)
            }
        )
        binding.rvRentals.layoutManager = LinearLayoutManager(requireContext())
        binding.rvRentals.adapter = adapter
    }

    private fun setupTabs() {
        binding.chipGroupTabs.setOnCheckedStateChangeListener { _, checkedIds ->
            val selectedId = checkedIds.firstOrNull() ?: R.id.chipActive
            currentTab = when (selectedId) {
                R.id.chipActive -> "ACTIVE"
                R.id.chipPending -> "PENDING"
                R.id.chipRejected -> "REJECTED"
                R.id.chipPast -> "PAST"
                else -> "ACTIVE"
            }
            filterAndDisplay()
        }
    }

    private fun fetchRequests() {
        binding.progressBar.visibility = View.VISIBLE
        binding.rvRentals.visibility = View.GONE
        binding.tvEmptyState.visibility = View.GONE

        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val res = api.getMyRentalRequests()
                if (res.isSuccessful && res.body()?.success == true) {
                    allRequests = res.body()?.data?.requests ?: emptyList()
                    filterAndDisplay()

                    // Trigger the overdue background fetch
                    fetchOverdueStatuses(allRequests)
                } else {
                    showError("Failed to load rentals.")
                }
            } catch (e: Exception) {
                showError("Network error. Please try again.")
            } finally {
                _binding?.progressBar?.visibility = View.GONE
            }
        }
    }

    // ─── Fast Background Fetch (Replaces Promise.allSettled) ───
    private fun fetchOverdueStatuses(requests: List<RentalRequest>) {
        // If cache is fresh, use it immediately
        if (overdueCache != null && (System.currentTimeMillis() - cacheTimestamp) < CACHE_TTL) {
            applyOverdueData(overdueCache!!)
            return
        }

        // Only check confirmed, completed, or terminated properties
        val eligible = requests.filter {
            it.status == "CONFIRMED" || it.status == "COMPLETED" || it.status == "TERMINATED"
        }

        if (eligible.isEmpty()) return

        viewLifecycleOwner.lifecycleScope.launch(Dispatchers.IO) {
            val results = mutableMapOf<Int, Int>()

            // Launch concurrent network requests (async ensures they run in parallel)
            val deferreds = eligible.map { req ->
                async {
                    try {
                        val res = api.getPaymentsForRequest(req.id)
                        if (res.isSuccessful) {
                            val payments = res.body()?.data?.payments ?: emptyList()
                            val badCount = payments.count { it.status == "OVERDUE" || it.status == "FAILED" }
                            if (badCount > 0) {
                                results[req.id] = badCount
                            }
                        }
                    } catch (e: Exception) {
                        // Silent fail for individual requests, just like web
                    }
                }
            }

            deferreds.awaitAll() // Wait for all parallel requests to finish

            // Switch back to Main thread to update UI
            withContext(Dispatchers.Main) {
                overdueCache = results
                cacheTimestamp = System.currentTimeMillis()
                if (_binding != null) {
                    applyOverdueData(results)
                }
            }
        }
    }

    private fun applyOverdueData(overdueData: Map<Int, Int>) {
        adapter.updateOverdueData(overdueData)
        updateTabWarnings(overdueData)
    }

    private fun updateTabWarnings(overdueData: Map<Int, Int>) {
        val activeOverdue = allRequests.count { it.status == "CONFIRMED" && overdueData.containsKey(it.id) }
        val pastOverdue = allRequests.count { (it.status == "COMPLETED" || it.status == "TERMINATED") && overdueData.containsKey(it.id) }

        styleWarningChip(binding.chipActive, "Active", activeOverdue)
        styleWarningChip(binding.chipPast, "Past", pastOverdue)
    }

    private fun styleWarningChip(chip: Chip, baseText: String, overdueCount: Int) {
        if (overdueCount > 0) {
            chip.text = "$baseText ⚠️"
            chip.chipBackgroundColor = ColorStateList.valueOf(Color.parseColor("#FEF2F2")) // Light red bg
            chip.setTextColor(Color.parseColor("#DC2626")) // Red text
            chip.chipStrokeColor = ColorStateList.valueOf(Color.parseColor("#FCA5A5"))
            chip.chipStrokeWidth = 2f
        } else {
            chip.text = baseText
            chip.chipBackgroundColor = ColorStateList.valueOf(Color.parseColor("#FFFFFF"))
            chip.setTextColor(Color.parseColor("#6E7071"))
            chip.chipStrokeColor = ColorStateList.valueOf(Color.parseColor("#E2E8F0"))
            chip.chipStrokeWidth = 2f
        }
    }

    private fun filterAndDisplay() {
        val filteredList = allRequests.filter { req ->
            when (currentTab) {
                "ACTIVE" -> req.status == "CONFIRMED"
                "PENDING" -> req.status == "PENDING" || req.status == "APPROVED"
                "REJECTED" -> req.status == "REJECTED"
                "PAST" -> req.status == "COMPLETED" || req.status == "TERMINATED"
                else -> false
            }
        }

        if (_binding != null) {
            adapter.updateData(filteredList)

            if (filteredList.isEmpty()) {
                _binding?.rvRentals?.visibility = View.GONE
                _binding?.tvEmptyState?.visibility = View.VISIBLE
                _binding?.tvEmptyState?.text = "No ${currentTab.lowercase()} rentals found.\n\nBrowse properties on the Home tab to get started!"
            } else {
                _binding?.rvRentals?.visibility = View.VISIBLE
                _binding?.tvEmptyState?.visibility = View.GONE
            }
        }
    }

    private fun confirmRental(requestId: Int) {
        lifecycleScope.launch {
            try {
                val res = api.confirmRental(ConfirmPayload(requestId))
                if (res.isSuccessful && res.body()?.success == true) {
                    Toast.makeText(requireContext(), "Rental Confirmed!", Toast.LENGTH_SHORT).show()
                    fetchRequests()
                } else {
                    Toast.makeText(requireContext(), res.body()?.error?.message ?: "Failed to confirm", Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
            }
        }
    }

    private fun showError(message: String) {

        binding.tvEmptyState.visibility = View.VISIBLE
        binding.tvEmptyState.text = message
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}