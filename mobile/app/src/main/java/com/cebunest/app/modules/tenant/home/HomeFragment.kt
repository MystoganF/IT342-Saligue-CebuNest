package com.cebunest.app.modules.tenant.home

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.view.inputmethod.EditorInfo
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.cebunest.app.core.api.RetrofitClient
import com.cebunest.app.databinding.FragmentHomeBinding
import com.cebunest.app.core.session.SessionManager
import com.cebunest.app.modules.tenant.renting_property.PropertyDetailActivity
import com.google.android.material.chip.Chip
import kotlinx.coroutines.launch
import java.util.Calendar

class HomeFragment : Fragment() {

    private var _binding: FragmentHomeBinding? = null
    private val binding get() = _binding!!

    private val homeApi = RetrofitClient.create<HomeApi>()
    private lateinit var propertyAdapter: PropertyAdapter
    private var activeTypeFilter = "ALL"

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentHomeBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        setupGreeting()
        setupRecyclerView()
        setupSearch()

        binding.btnClearFilters.setOnClickListener {
            binding.etSearch.text?.clear()
            activeTypeFilter = "ALL"
            // Find the "All Types" chip and check it visually
            (binding.chipGroupTypes.getChildAt(0) as? Chip)?.isChecked = true
            fetchProperties()
        }

        // Fetch Data
        fetchPropertyTypes()
        fetchProperties()
    }

    private fun setupGreeting() {
        val user = SessionManager.getUser()
        val firstName = user?.name?.split(" ")?.firstOrNull() ?: "Tenant"

        val hour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY)
        val greeting = when {
            hour < 12 -> "Good morning"
            hour < 18 -> "Good afternoon"
            else -> "Good evening"
        }

        binding.tvGreeting.text = "$greeting, $firstName"
    }

    private fun setupRecyclerView() {
        propertyAdapter = PropertyAdapter(emptyList()) { propertyId ->
            val intent = Intent(requireContext(), PropertyDetailActivity::class.java)
            intent.putExtra("PROPERTY_ID", propertyId)
            startActivity(intent)
            Toast.makeText(requireContext(), "Clicked property $propertyId", Toast.LENGTH_SHORT).show()
        }
        binding.rvProperties.adapter = propertyAdapter
    }

    private fun setupSearch() {
        binding.etSearch.setOnEditorActionListener { _, actionId, _ ->
            if (actionId == EditorInfo.IME_ACTION_SEARCH) {
                fetchProperties()
                true
            } else false
        }
    }

    private fun fetchPropertyTypes() {
        lifecycleScope.launch {
            try {
                val response = homeApi.getPropertyTypes()
                if (response.isSuccessful && response.body()?.success == true) {
                    val types = response.body()?.data?.types ?: emptyList()
                    populateChips(types)
                }
            } catch (e: Exception) {
                // Silently fail for chips, not critical
            }
        }
    }

    private fun populateChips(types: List<PropertyType>) {
        binding.chipGroupTypes.removeAllViews()

        // "All Types" Chip
        val allChip = Chip(requireContext()).apply {
            text = "All Types"
            isCheckable = true
            isChecked = true
            setOnClickListener {
                activeTypeFilter = "ALL"
                fetchProperties()
            }
        }
        binding.chipGroupTypes.addView(allChip)

        // Dynamic Chips from API
        types.forEach { type ->
            val chip = Chip(requireContext()).apply {
                text = type.name
                isCheckable = true
                setOnClickListener {
                    activeTypeFilter = type.name
                    fetchProperties()
                }
            }
            binding.chipGroupTypes.addView(chip)
        }
    }

    private fun fetchProperties() {
        // It's safe to use 'binding' here because it runs instantly before any background work
        binding.progressBar.visibility = View.VISIBLE
        binding.rvProperties.visibility = View.GONE
        binding.tvError.visibility = View.GONE
        binding.layoutEmptyState.visibility = View.GONE

        // CRITICAL FIX: Use viewLifecycleOwner so the coroutine dies when the view dies
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val queryParams = mutableMapOf<String, String>()

                // Safe to read synchronously
                val searchParam = binding.etSearch.text.toString().trim()
                if (searchParam.isNotEmpty()) queryParams["search"] = searchParam
                if (activeTypeFilter != "ALL") queryParams["type"] = activeTypeFilter

                // Suspends here (waits for network)
                val response = homeApi.getProperties(queryParams)
                val body = response.body()

                // CRITICAL FIX: Use _binding? for all UI updates below this point
                // because the user might have switched tabs while the network call was running!
                if (response.isSuccessful && body?.success == true) {
                    val properties = body.data?.properties ?: emptyList()
                    propertyAdapter.updateData(properties)

                    _binding?.tvListingsCount?.text = "${properties.size} propert${if (properties.size == 1) "y" else "ies"} found"

                    if (properties.isEmpty()) {
                        _binding?.rvProperties?.visibility = View.GONE
                        _binding?.layoutEmptyState?.visibility = View.VISIBLE
                    } else {
                        _binding?.rvProperties?.visibility = View.VISIBLE
                        _binding?.layoutEmptyState?.visibility = View.GONE
                    }
                } else {
                    showError(body?.error?.message ?: "Failed to load listings.")
                }
            } catch (e: Exception) {
                showError("Unable to reach the server. Please check your connection.")
            } finally {
                // CRITICAL FIX: Safely hide progress bar
                _binding?.progressBar?.visibility = View.GONE
            }
        }
    }

    private fun showError(msg: String) {
        // CRITICAL FIX: Make sure the helper function also uses _binding?
        _binding?.tvError?.text = msg
        _binding?.tvError?.visibility = View.VISIBLE
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}