package com.cebunest.app.modules.tenant

import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.view.View
import androidx.appcompat.app.AppCompatActivity
import androidx.fragment.app.Fragment
import com.cebunest.app.R
import com.cebunest.app.databinding.ActivityTenantMainBinding
import com.cebunest.app.modules.tenant.home.HomeFragment
import com.cebunest.app.modules.tenant.notifications.NotificationDropdown
import com.google.android.material.badge.BadgeDrawable
import com.google.android.material.badge.BadgeUtils
import com.google.android.material.badge.ExperimentalBadgeUtils

class TenantMainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityTenantMainBinding

    // 1. Declare the dropdown at the class level so we can reuse it
    private lateinit var notificationDropdown: NotificationDropdown
    private var notificationBadge: BadgeDrawable? = null // Add this line

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityTenantMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        // 2. Initialize the dropdown HERE and link the badge function
        notificationDropdown = NotificationDropdown(this) { unreadCount ->
            updateNotificationBadge(unreadCount)
        }

        binding.topToolbar.inflateMenu(R.menu.top_bar_menu)
        binding.topToolbar.setOnMenuItemClickListener { item ->
            when (item.itemId) {
                R.id.action_notifications -> {
                    // Find the actual bell icon view in the toolbar
                    val anchorView = findViewById<View>(R.id.action_notifications)

                    // 3. Show the dropdown using our reused instance!
                    notificationDropdown.show(anchorView)
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
        notificationDropdown.fetchNotifications()
    }

    private fun loadFragment(fragment: Fragment) {
        supportFragmentManager.beginTransaction()
            .replace(R.id.fragmentContainer, fragment)
            .commit()
    }

    @androidx.annotation.OptIn(ExperimentalBadgeUtils::class)
    private fun updateNotificationBadge(unreadCount: Int) {
        val menuItemId = R.id.action_notifications

        if (unreadCount > 0) {
            // Create the badge if it doesn't exist yet
            if (notificationBadge == null) {
                notificationBadge = BadgeDrawable.create(this).apply {
                    maxCharacterCount = 2 // Turns 10 into "9+"
                    backgroundColor = Color.parseColor("#EF4444") // Red
                    badgeTextColor = Color.WHITE
                }
            }

            // Update the number and attach it to the toolbar icon
            notificationBadge?.let { badge ->
                badge.number = unreadCount
                badge.isVisible = true
                BadgeUtils.attachBadgeDrawable(badge, binding.topToolbar, menuItemId)
            }
        } else {
            // Hide and detach the badge if unread count is 0
            notificationBadge?.let { badge ->
                badge.isVisible = false
                BadgeUtils.detachBadgeDrawable(badge, binding.topToolbar, menuItemId)
            }
        }
    }
}
