package com.ditto.dittochatandroiddemo

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import com.ditto.dittochat.ui.DittoChatNavigation
import com.ditto.dittochat.ui.DittoChatUI
import dagger.hilt.android.AndroidEntryPoint
import live.ditto.Ditto
import live.ditto.transports.DittoSyncPermissions
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    @Inject
    lateinit var dittoChatUI: DittoChatUI

    @Inject
    lateinit var ditto: Ditto

    private val requestPermissionLauncher = registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { this.ditto.refreshPermissions() }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        requestPermissions()
        ditto.disableSyncWithV3()
        ditto.startSync()
        setContent {
            DittoChatNavigation(dittoChatUI)
        }
    }

    fun requestPermissions() {
        val missing = DittoSyncPermissions(this).missingPermissions()
        if (missing.isNotEmpty()) {
            this.requestPermissions(missing, 0)
        }
    }
}