package com.cebunest.app.modules.tenant.my_rentals

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import com.cebunest.app.R
import com.cebunest.app.core.api.RetrofitClient
import com.cebunest.app.databinding.FragmentRentalsBinding
import com.cebunest.app.modules.tenant.my_rentals.RentalDetailActivity
import kotlinx.coroutines.launch

class RentalsFragment : Fragment() {

    private var _binding: FragmentRentalsBinding? = null
    private val binding get() = _binding!!

    private val api = RetrofitClient.create<RentalsApi>()
    private lateinit var adapter: RentalsAdapter
    private var allRequests: List<RentalRequest> = emptyList()
    private var currentTab = "ACTIVE"

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
        adapter = RentalsAdapter(emptyList(),
            onItemClick = { requestId ->
                val intent = Intent(requireContext(), RentalDetailActivity::class.java)
                intent.putExtra("REQUEST_ID", requestId)
                startActivity(intent)
            },
            onConfirmClick = { requestId ->
                confirmRental(requestId)
            }
        )
        binding.rvRentals.layoutManager = LinearLayoutManager(requireContext())
        binding.rvRentals.adapter = adapter
    }

    private fun setupTabs() {
        // Change 'checkedId' to 'checkedIds' (it's a list now!)
        binding.chipGroupTabs.setOnCheckedStateChangeListener { _, checkedIds ->

            // Grab the first selected ID from the list, or default to chipActive if empty
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
        // Safe to use 'binding' here because it runs synchronously before the background work
        binding.progressBar.visibility = View.VISIBLE
        binding.rvRentals.visibility = View.GONE
        binding.tvEmptyState.visibility = View.GONE

        // CRITICAL FIX: Use viewLifecycleOwner.lifecycleScope
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val res = api.getMyRentalRequests()
                if (res.isSuccessful && res.body()?.success == true) {
                    allRequests = res.body()?.data?.requests ?: emptyList()
                    filterAndDisplay()
                    // Note: If filterAndDisplay updates UI, ensure it also uses _binding?,
                    // OR just rely on the fact that if the view is dead, we don't care if data updates in the background.
                } else {
                    showError("Failed to load rentals.")
                }
            } catch (e: Exception) {
                showError("Loading..")
            } finally {
                // CRITICAL FIX: Safely hide progress bar using _binding?
                _binding?.progressBar?.visibility = View.GONE
            }
        }
    }

    // You should also update filterAndDisplay to be safe:
    private fun filterAndDisplay() {
        val filteredList = mutableListOf<RentalRequest>()

        for (req in allRequests) {
            val status = req.status
            val shouldInclude = when (currentTab) {
                "ACTIVE" -> status == "CONFIRMED"
                "PENDING" -> status == "PENDING" || status == "APPROVED"
                "REJECTED" -> status == "REJECTED"
                "PAST" -> status == "COMPLETED" || status == "TERMINATED"
                else -> false
            }
            if (shouldInclude) {
                filteredList.add(req)
            }
        }

        // Only update the adapter if the view is still alive
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
                    fetchRequests() // Refresh the list
                } else {
                    Toast.makeText(requireContext(), res.body()?.error?.message ?: "Failed to confirm", Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                Toast.makeText(requireContext(), "Network error", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun showError(message: String) {
        Toast.makeText(requireContext(), message, Toast.LENGTH_SHORT).show()
        binding.tvEmptyState.visibility = View.VISIBLE
        binding.tvEmptyState.text = message
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}