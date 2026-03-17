package com.ditto.dittochatandroiddemo

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import com.ditto.dittochat.DittoChat
import com.ditto.dittochat.DittoChatImpl
import com.ditto.dittochat.DittoChatNotificationKey
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.flow.MutableStateFlow
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

    /**
     * Emits the room ID extracted from a notification tap. Collected by [MyAppNavigation] via
     * [LaunchedEffect] so the nav controller can navigate to the correct chat room.
     *
     * Set in both [onCreate] (cold start from tap) and [onNewIntent] (tap while app is running).
     */
    val notificationRoomId = MutableStateFlow<String?>(null)

    private val requestPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { this.ditto.refreshPermissions() }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        requestPermissions()

        val baseDir = File(this.filesDir, "ditto")
        val userDir = File(baseDir, "user_ditto_chat_demo")
        userDir.mkdirs()

        val userDependencies = DefaultAndroidDittoDependencies(this)
        val playgroundToken = ""
        val appId = ""
        val cloudEndpoint = ""
        val userId = ""

        val userIdentity = DittoIdentity.OnlinePlayground(
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

        // If this Activity was launched by tapping a DittoChat notification, extract the
        // room ID and make it available to the Compose navigation graph.
        handleNotificationIntent(intent)

        setContent {
            MyAppNavigation(dittoChat, notificationRoomId)
        }
    }

    /**
     * Called when the Activity is already running and a notification is tapped
     * ([Intent.FLAG_ACTIVITY_SINGLE_TOP] is set in the PendingIntent).
     */
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleNotificationIntent(intent)
    }

    // -----------------------------------------------------------------------------------------
    // Permission handling
    // -----------------------------------------------------------------------------------------

    fun requestPermissions() {
        val missing = DittoSyncPermissions(this).missingPermissions().toMutableList()

        // Android 13+ requires POST_NOTIFICATIONS at runtime.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(
                    this, Manifest.permission.POST_NOTIFICATIONS
                ) != PackageManager.PERMISSION_GRANTED
            ) {
                missing.add(Manifest.permission.POST_NOTIFICATIONS)
            }
        }

        if (missing.isNotEmpty()) {
            requestPermissionLauncher.launch(missing.toTypedArray())
        }
    }

    // -----------------------------------------------------------------------------------------
    // Notification deep-link
    // -----------------------------------------------------------------------------------------

    private fun handleNotificationIntent(intent: Intent?) {
        val roomId = intent?.getStringExtra(DittoChatNotificationKey.ROOM_ID) ?: return
        notificationRoomId.value = roomId
    }
}
