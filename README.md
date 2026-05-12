# DittoChat

<div>

<svg width="167" height="64" viewBox="0 0 167 64" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect width="167" height="64" rx="4" fill="#EEEFF1"/>
<g clip-path="url(#clip0_2_20)">
<path d="M139.128 47.2381C131.943 47.2381 127.255 42.6754 127.255 35.8096C127.255 28.9437 131.943 24.381 139.128 24.381C146.312 24.381 151 28.9437 151 35.8096C151 42.7189 146.312 47.2381 139.128 47.2381ZM139.128 41.9048C142.383 41.9048 144.872 39.5901 144.872 35.8096C144.872 32.029 142.239 29.7143 139.128 29.7143C136.016 29.7143 133.383 32.029 133.383 35.8096C133.383 39.5901 135.872 41.9048 139.128 41.9048Z" fill="#0E1012"/>
<path d="M98.5319 39.2726V17.5238H104.66V25.1429H110.021V30.4762H104.66L104.652 38.5277C104.652 40.1048 104.694 41.1429 106.28 41.1429H110.787V46.4762H106.065C101.749 46.4762 98.5319 43.5661 98.5319 39.2726Z" fill="#0E1012"/>
<path d="M113.372 39.2726V17.5238H119.5V25.1429H124.862V30.4762H119.5L119.492 38.5277C119.492 40.1048 119.534 41.1429 121.12 41.1429H125.628V46.4762H120.906C116.589 46.4762 113.372 43.5661 113.372 39.2726Z" fill="#0E1012"/>
<path d="M78.2456 17.5238H84.3617V46.4762H79V44.0477C77.5026 45.9752 75.3656 47.2381 72.1063 47.2381C66.0286 47.2819 60.617 42.9504 60.617 35.8096C60.617 28.8438 65.5958 24.381 72.1063 24.381C74.4042 24.381 76.9414 25.0952 78.234 26.7143L78.2456 17.5238ZM72.5851 41.9048C75.9763 41.9048 78.234 39.621 78.234 35.8096C78.234 31.9543 75.7926 29.7143 72.8244 29.7143C69.4331 29.7143 66.7447 31.9543 66.7447 35.8096C66.7447 39.6648 69.1938 41.9048 72.5851 41.9048Z" fill="#0E1012"/>
<path d="M94.5107 25.9048H88.383V46.4762H94.5107V25.9048Z" fill="#0E1012"/>
<path d="M91.4685 16.7619C93.468 16.7619 94.9893 18.1851 94.9893 20.1689C94.9893 22.1527 93.468 23.619 91.4685 23.619C89.4255 23.619 87.9042 22.1527 87.9042 20.1689C87.9042 18.1851 89.4255 16.7619 91.4685 16.7619Z" fill="#0E1012"/>
<path d="M43.9415 16.189L52.7491 31.2302C53.0275 31.7057 53.0268 32.2939 52.7473 32.7688L43.8939 47.8117C43.8253 47.9283 43.6998 48 43.564 48H32.8265C32.5328 48 32.3488 47.684 32.4944 47.4301L40.9115 32.756C41.1802 32.2875 41.1802 31.7124 40.9115 31.244L32.4944 16.57C32.3487 16.316 32.5328 16 32.8265 16H43.6112C43.7472 16 43.873 16.072 43.9415 16.189Z" fill="#0066FF"/>
<path d="M27.4981 16.189L36.3056 31.2302C36.5841 31.7057 36.5835 32.2939 36.3038 32.7688L27.4504 47.8117C27.3818 47.9283 27.2562 48 27.1205 48H16.383C16.0894 48 15.9053 47.684 16.051 47.4301L24.4681 32.756C24.7368 32.2875 24.7368 31.7124 24.4681 31.244L16.0509 16.57C15.9053 16.316 16.0894 16 16.383 16H27.1678C27.3038 16 27.4296 16.072 27.4981 16.189Z" fill="#0066FF"/>
</g>
<defs>
<clipPath id="clip0_2_20">
<rect width="135" height="32" fill="white" transform="translate(16 16)"/>
</clipPath>
</defs>
</svg>

</div>

# DittoChat Quickstart Guide

This guide walks you through adding DittoChat to an iOS or Android app from scratch. By the end you'll have a working peer-to-peer chat experience that syncs over Bluetooth, Wi-Fi, and the cloud.

---

## Prerequisites (Both Platforms)

Before you begin, make sure you have the following:

1. **A Ditto account** — Sign up free at the [Ditto Portal](https://portal.ditto.live).
2. **An App ID and Online Playground Token** — Create a new app in the portal and copy these credentials. You'll need them to initialize the SDK.

---

## iOS Quickstart (Swift / SwiftUI)

### Step 1 — Create or Open Your Xcode Project

Open an existing iOS project or create a new one in Xcode (**File → New → Project → App**). Select **SwiftUI** as the interface and **Swift** as the language.

### Step 2 — Add the DittoChat Swift Package

1. In Xcode, go to **File → Add Package Dependencies…**
2. In the search bar, paste the DittoChat repository URL:

   ```
   https://github.com/getditto/DittoChat.git
   ```

3. Under **Dependency Rule**, choose **Up to Next Major Version** and set it to the latest release (check the [Releases page](https://github.com/getditto/DittoChat/releases) for the current version).
4. Click **Add Package**.
5. When prompted, select the DittoChat library product and add it to your app target.

### Step 3 — Configure Permissions

Ditto uses Bluetooth LE and local networking for peer-to-peer sync. You need to declare usage descriptions so iOS can prompt the user for permission.

Add the following keys to your project's **Info.plist**:

```xml
<key>NSBluetoothAlwaysUsageDescription</key>
<string>Uses Bluetooth to connect and sync with nearby devices</string>

<key>NSBluetoothPeripheralUsageDescription</key>
<string>Uses Bluetooth to connect and sync with nearby devices</string>

<key>NSLocalNetworkUsageDescription</key>
<string>Uses WiFi to connect and sync with nearby devices</string>

<key>NSBonjourServices</key>
<array>
    <string>_http-alt._tcp.</string>
</array>
```

### Step 4 — Enable Background Modes (Optional but Recommended)

To keep chat syncing when your app is in the background:

1. Select your project in the navigator, then your app target.
2. Go to **Signing & Capabilities → + Capability → Background Modes**.
3. Enable the following:
   - **Uses Bluetooth LE accessories**
   - **Acts as a Bluetooth LE accessory**

### Step 5 — Initialize Ditto and Present the Chat UI

In your SwiftUI app entry point (e.g. `App.swift` or a root view), initialize a Ditto instance with your portal credentials and present the DittoChat view:

```swift
import SwiftUI
import DittoSwift
import DittoChat

@main
struct MyChatApp: App {
    @StateObject private var dittoInstance = DittoManager()

    var body: some Scene {
        WindowGroup {
            // Replace with the DittoChat view provided by the SDK.
            // See the example app in the `apps/` directory for
            // a complete working implementation.
            ContentView()
                .environmentObject(dittoInstance)
        }
    }
}

/// A simple singleton that owns the Ditto instance.
class DittoManager: ObservableObject {
    let ditto: Ditto

    init() {
        ditto = Ditto(
            identity: .onlinePlayground(
                appID: "YOUR_APP_ID",
                token: "YOUR_PLAYGROUND_TOKEN"
            )
        )

        // Start syncing with nearby peers
        do {
            try ditto.startSync()
        } catch {
            print("Failed to start Ditto sync: \(error)")
        }
    }
}
```

> **Important:** Replace `YOUR_APP_ID` and `YOUR_PLAYGROUND_TOKEN` with the credentials from your Ditto Portal app. Never commit these values to source control — use environment variables or a configuration file excluded from Git.

### Step 6 — Build and Run

1. Connect a physical iOS device (Bluetooth is not available in the Simulator).
2. Select your device as the run destination and press **⌘R**.
3. Grant Bluetooth and local network permissions when prompted.
4. Run the app on a second device to see peer-to-peer chat in action.

---

## Android Quickstart (Kotlin)

> **Note:** The DittoChat Android SDK is under active development. The steps below show how to integrate the Ditto SDK in a Kotlin Android project and prepare for the DittoChat library. Check the [Releases page](https://github.com/getditto/DittoChat/releases) and the `sdks/kotlin/` directory for the latest availability.

### Step 1 — Create or Open Your Android Studio Project

Open an existing project or create a new one in Android Studio (**File → New → New Project → Empty Activity**). Choose **Kotlin** as the language and set the minimum SDK to **API 23 (Android 6.0)** or higher.

### Step 2 — Add the Ditto SDK Dependency

1. In your **project-level** `build.gradle` (or `settings.gradle.kts`), make sure Maven Central is included:

   ```groovy
   // build.gradle (project-level)
   allprojects {
       repositories {
           mavenCentral()
       }
   }
   ```

2. In your **app-level** `build.gradle`, add the Ditto SDK:

   ```groovy
   // build.gradle (app-level)
   dependencies {
       implementation "live.ditto:ditto:4.14.1"  // Check docs.ditto.live for the latest version
   }
   ```

3. Sync your project: **File → Sync Project with Gradle Files**.

> Once the DittoChat Android library is published, you will add it alongside the core Ditto SDK. Watch this repo for release announcements.

### Step 3 — Configure Permissions

The Ditto SDK's `AndroidManifest.xml` automatically merges the required Bluetooth and network permissions into your app. However, you should be aware of what's being added:

```xml
<!-- These are automatically merged by the Ditto SDK -->
<uses-permission android:name="android.permission.BLUETOOTH"
    android:maxSdkVersion="30" />
<uses-permission android:name="android.permission.BLUETOOTH_ADMIN"
    android:maxSdkVersion="30" />
<uses-permission android:name="android.permission.BLUETOOTH_ADVERTISE"
    tools:targetApi="s" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT"
    tools:targetApi="s" />
<uses-permission android:name="android.permission.BLUETOOTH_SCAN"
    android:usesPermissionFlags="neverForLocation"
    tools:targetApi="s" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"
    android:maxSdkVersion="32" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION"
    android:maxSdkVersion="30" />
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.NEARBY_WIFI_DEVICES" />
```

### Step 4 — Request Runtime Permissions

Android requires that certain permissions (like Bluetooth and location) be requested from the user at runtime. Use the `DittoSyncPermissions` helper provided by the SDK:

```kotlin
import live.ditto.transports.DittoSyncPermissions

// In your Activity's onCreate or a Composable's LaunchedEffect:
fun requestPermissions() {
    val permissions = DittoSyncPermissions(this)
    val missing = permissions.missingPermissions()
    if (missing.isNotEmpty()) {
        this.requestPermissions(missing, 0)
    }
}
```

Call this early in your app's lifecycle — before starting Ditto sync — so the user sees the permission prompts right away.

### Step 5 — Initialize Ditto

Create a singleton `Application` class (or use your existing one) to initialize Ditto at app startup:

```kotlin
import android.app.Application
import android.util.Log
import live.ditto.*
import live.ditto.android.DefaultAndroidDittoDependencies

class MyChatApplication : Application() {

    lateinit var ditto: Ditto

    override fun onCreate() {
        super.onCreate()

        try {
            DittoLogger.minimumLogLevel = DittoLogLevel.DEBUG

            val androidDependencies = DefaultAndroidDittoDependencies(applicationContext)
            val identity = DittoIdentity.OnlinePlayground(
                androidDependencies,
                appId = "YOUR_APP_ID",
                token = "YOUR_PLAYGROUND_TOKEN"
            )

            ditto = Ditto(androidDependencies, identity)
            ditto.startSync()
        } catch (e: DittoError) {
            Log.e("DittoChat", "Failed to start Ditto: ${e.message}")
        }
    }
}
```

Register the application class in your `AndroidManifest.xml`:

```xml
<application
    android:name=".MyChatApplication"
    ... >
```

> **Important:** Replace `YOUR_APP_ID` and `YOUR_PLAYGROUND_TOKEN` with your portal credentials. Store secrets securely — use `BuildConfig` fields or a `local.properties` file that is excluded from version control.

### Step 6 — Build and Run

1. Connect a physical Android device (Bluetooth is unavailable in the emulator).
2. Run the app and grant all requested permissions.
3. Deploy to a second device on the same network (or within Bluetooth range) to test peer-to-peer sync.

---

## Verifying Peer-to-Peer Sync

Once you have the app running on two or more devices:

1. Make sure both devices have **Bluetooth** and **Wi-Fi** enabled.
2. Both apps must be configured with the **same App ID** from the Ditto Portal.
3. Send a message on one device — it should appear on the other within seconds.
4. To test offline sync, enable **Airplane Mode** on both devices (but keep Bluetooth on). Messages will still sync directly over Bluetooth LE.

---

## Troubleshooting

| Symptom | Possible Cause | Fix |
|---|---|---|
| Devices don't discover each other | Missing permissions | Verify all Bluetooth and network permissions are granted in device settings |
| Sync works on Wi-Fi but not Bluetooth | Background Modes not enabled (iOS) | Enable BLE Background Modes in Xcode capabilities |
| `DittoError` on startup | Invalid App ID or token | Double-check your credentials in the [Ditto Portal](https://portal.ditto.live) |
| Messages appear only on one device | Different App IDs | Ensure both devices use the same App ID |
| Permissions prompt doesn't appear (Android) | `requestPermissions` not called | Call `DittoSyncPermissions.missingPermissions()` before `startSync()` |
| Build fails after adding package (iOS) | Xcode version too old | DittoChat requires Xcode 15.6+; update Xcode |

---

## Next Steps

- **Explore the example apps** in the [`apps/`](https://github.com/getditto/DittoChat/tree/main/apps) directory for complete, runnable implementations.
- **Web integration?** See the [Web (React/TypeScript) section](./README.md#web-react--typescript) in the main README.
- **Customize the UI** — DittoChat components are designed to be themed and extended. Check the platform-specific SDK READMEs in `sdks/` for API details.
- **Go to production** — Replace `OnlinePlayground` authentication with `OnlineWithAuthentication` for production apps. See the [Ditto Cloud Authentication docs](https://docs.ditto.live/auth-and-authorization/cloud-authentication) for a full walkthrough.
- **Learn more about Ditto** — Visit [docs.ditto.live](https://docs.ditto.live) for comprehensive platform documentation.

---

## Support

If you run into issues:

- **GitHub Issues:** [github.com/getditto/DittoChat/issues](https://github.com/getditto/DittoChat/issues)
- **Ditto Support:** [support@ditto.com](mailto:support@ditto.com)
- **Documentation:** [docs.ditto.live](https://docs.ditto.live)
