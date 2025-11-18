package com.ditto.dittochatandroiddemo

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.lifecycle.lifecycleScope
import com.ditto.dittochat.ChatConfig
import com.ditto.dittochat.UserConfig
import com.ditto.dittochat.ui.DittoChatNavigation
import com.ditto.dittochat.ui.DittoChatUI
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch
import live.ditto.Ditto
import live.ditto.transports.DittoSyncPermissions
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    lateinit var dittoChatUI: DittoChatUI

    @Inject
    lateinit var ditto: Ditto

    private val requestPermissionLauncher = registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { this.ditto.refreshPermissions() }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        requestPermissions()
        lifecycleScope.launch {
            ditto.store.execute("ALTER SYSTEM SET DQL_STRICT_MODE = false")
        }
        dittoChatUI = DittoChatUI(this, ChatConfig(
            ditto,
            usersCollection = "users",
            userId = "e86547d3-f93c-41c5-8d79-2b446b3ede8a"
        ))
        ditto.disableSyncWithV3()
        ditto.startSync()
        setContent {
            DittoChatNavigation(dittoChatUI)
        }
    }

    fun requestPermissions() {
        val missing = DittoSyncPermissions(this).missingPermissions()
        if (missing.isNotEmpty()) {
            requestPermissionLauncher.launch(missing)
        }
    }
}