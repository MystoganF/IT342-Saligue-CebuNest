package com.cebunest.app.modules.tenant

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.fragment.app.Fragment
import com.cebunest.app.R
import com.cebunest.app.databinding.ActivityTenantMainBinding
import com.cebunest.app.modules.tenant.home.HomeFragment

class TenantMainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityTenantMainBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityTenantMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        // Add Notification Bell to the Top Toolbar
        binding.topToolbar.inflateMenu(R.menu.top_bar_menu) // We'll create this menu next!
        binding.topToolbar.setOnMenuItemClickListener { item ->
            when (item.itemId) {
                R.id.action_notifications -> {
                    // TODO: Open Notifications BottomSheet
                    true
                }
                else -> false
            }
        }

        // Setup Bottom Navigation routing
        binding.bottomNavigation.setOnItemSelectedListener { item ->
            when (item.itemId) {
                R.id.nav_home -> {
                    loadFragment(HomeFragment())
                    true
                }
                R.id.nav_rentals -> {
                    loadFragment(com.cebunest.app.modules.tenant.my_rentals.RentalsFragment())
                    true
                }
                R.id.nav_profile -> {


                    loadFragment(com.cebunest.app.modules.tenant.profile.ProfileFragment())
                    true
                }
                else -> false
            }
        }

        // Load the Home Fragment by default when the app opens
        if (savedInstanceState == null) {
            binding.bottomNavigation.selectedItemId = R.id.nav_home
        }
    }

    private fun loadFragment(fragment: Fragment) {
        supportFragmentManager.beginTransaction()
            .replace(R.id.fragmentContainer, fragment)
            .commit()
    }
}