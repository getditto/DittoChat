package com.ditto.dittochatandroiddemo

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.lifecycle.lifecycleScope
import com.ditto.dittochat.DittoChat
import com.ditto.dittochat.DittoChatImpl
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch
import live.ditto.Ditto
import live.ditto.DittoIdentity
import live.ditto.android.DefaultAndroidDittoDependencies
import live.ditto.transports.DittoSyncPermissions
import java.io.File
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    @Inject
    lateinit var dittoChatBuilder: DittoChatImpl.Builder

    lateinit var dittoChat: DittoChat
    lateinit var ditto: Ditto
    private val requestPermissionLauncher = registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { this.ditto.refreshPermissions() }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        requestPermissions()
        val baseDir = File(this.filesDir, "ditto")
        val userDir = File(baseDir, "user_ditto_chat_demo")

        // Ensure directory exists
        userDir.mkdirs()
        val userDependencies = DefaultAndroidDittoDependencies(this)
        val playgroundToken = ""
        val appId = ""
        val cloudEndpoint = ""
        val userId = ""
        // Create user Ditto instance with appropriate identity
        val userIdentity =
            // Use playground identity when playground token is available
            DittoIdentity.OnlinePlayground(
                dependencies = userDependencies,
                appId = appId,
                token = playgroundToken,
                enableDittoCloudSync = false,
                customAuthUrl = "https://${cloudEndpoint}"
            )

        ditto = Ditto(userDependencies, userIdentity)
        lifecycleScope.launch {
            ditto.store.execute("ALTER SYSTEM SET DQL_STRICT_MODE = false")
        }
        dittoChat = dittoChatBuilder.setDitto(ditto).setUserId(userId).build()
        ditto.disableSyncWithV3()
        ditto.startSync()

        enableEdgeToEdge()

        setContent {
            MyAppNavigation(dittoChat)
        }
    }

    fun requestPermissions() {
        val missing = DittoSyncPermissions(this).missingPermissions()
        if (missing.isNotEmpty()) {
            requestPermissionLauncher.launch(missing)
        }
    }
}