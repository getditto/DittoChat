//
//  DittoChatDemoApp.swift
//  DittoChatDemo
//
//  Created by Bryan Malumphy on 9/3/25.
//

import SwiftUI
import UserNotifications
import BackgroundTasks
import DittoChatCore

// MARK: - Notification name used to route a notification tap to ContentView

extension Notification.Name {
    /// Posted by AppDelegate when the user taps a DittoChat notification.
    /// `userInfo` contains `"roomId": String`.
    static let dittoChatOpenRoom = Notification.Name("dittoChatOpenRoom")
}

// MARK: - App Delegate

/// Handles UIKit lifecycle callbacks that SwiftUI's `@main App` cannot intercept directly:
///
/// - Sets this class as the `UNUserNotificationCenter` delegate so the SDK's local
///   notifications display correctly both in the foreground and on tap.
/// - Broadcasts a `dittoChatOpenRoom` notification when the user taps a message banner,
///   which `ContentView` observes to navigate to the appropriate room.
/// - Registers and schedules a `BGAppRefreshTask` so iOS wakes the app periodically on
///   WiFi-only networks (where no BLE event would trigger a natural wakeup). This gives
///   Ditto's sync engine time to pull in new messages and fire `DittoStoreObserver`
///   callbacks even when the app has been backgrounded for an extended period.
class AppDelegate: NSObject, UIApplicationDelegate {

    // MARK: - Task identifier

    /// Must match an entry in `BGTaskSchedulerPermittedIdentifiers` inside Info.plist.
    private static let refreshTaskIdentifier = "com.ditto.DittoChatDemo.refresh"

    // MARK: - UIApplicationDelegate

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        UNUserNotificationCenter.current().delegate = self
        registerBackgroundRefreshTask()
        return true
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        scheduleAppRefresh()
    }

    // MARK: - BGTaskScheduler

    /// Registers the handler that iOS calls when it wakes the app for a background refresh.
    ///
    /// The handler keeps Ditto's sync engine running for up to 20 seconds, which is enough
    /// time for Ditto to connect to nearby peers, exchange pending documents, and fire any
    /// waiting `DittoStoreObserver` callbacks — posting local notifications for new messages.
    private func registerBackgroundRefreshTask() {
        BGTaskScheduler.shared.register(
            forTaskWithIdentifier: AppDelegate.refreshTaskIdentifier,
            using: nil
        ) { task in
            guard let refreshTask = task as? BGAppRefreshTask else { return }
            self.handleAppRefresh(refreshTask)
        }
    }

    /// Schedules the next background refresh. iOS decides the exact wakeup time; requesting
    /// a short `earliestBeginDate` signals that responsiveness matters but does not guarantee
    /// the interval. Call this both at launch and at the end of each refresh handler so iOS
    /// always has a pending request queued.
    func scheduleAppRefresh() {
        let request = BGAppRefreshTaskRequest(identifier: AppDelegate.refreshTaskIdentifier)
        // Ask iOS to wake the app no later than 3 minutes from now.
        request.earliestBeginDate = Date(timeIntervalSinceNow: 3 * 60)
        do {
            try BGTaskScheduler.shared.submit(request)
        } catch {
            print("AppDelegate: could not schedule app refresh — \(error)")
        }
    }

    /// Called by iOS when it wakes the app for a background refresh.
    ///
    /// We simply give Ditto ~20 seconds of execution time. During that window Ditto's sync
    /// engine reconnects to peers, syncs pending changes, and triggers any
    /// `DittoStoreObserver` callbacks, which in turn post local notifications via
    /// `ChatNotificationManager`. After the wait we schedule the next refresh and signal
    /// completion.
    private func handleAppRefresh(_ task: BGAppRefreshTask) {
        scheduleAppRefresh()     // always queue the next request first

        // Give Ditto time to sync before we signal completion.
        let syncDeadline = DispatchTime.now() + 20

        task.expirationHandler = {
            // iOS is revoking our background time early — complete immediately.
            task.setTaskCompleted(success: false)
        }

        DispatchQueue.global(qos: .utility).asyncAfter(deadline: syncDeadline) {
            task.setTaskCompleted(success: true)
        }
    }
}

// MARK: - UNUserNotificationCenterDelegate

extension AppDelegate: UNUserNotificationCenterDelegate {

    /// Display notifications as banners with sound even while the app is in the foreground.
    /// Without this, iOS suppresses banner presentation when the app is active.
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        completionHandler([.banner, .sound])
    }

    /// Handle a notification tap: extract the DittoChat room ID and broadcast it so
    /// `ContentView` can navigate to the correct chat room.
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        let userInfo = response.notification.request.content.userInfo
        if let roomId = userInfo[DittoChatNotificationKey.roomId] as? String {
            NotificationCenter.default.post(
                name: .dittoChatOpenRoom,
                object: nil,
                userInfo: ["roomId": roomId]
            )
        }
        completionHandler()
    }
}

// MARK: - App Entry Point

@main
struct DittoChatDemoApp: App {

    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
