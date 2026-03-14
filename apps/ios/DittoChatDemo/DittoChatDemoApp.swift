//
//  DittoChatDemoApp.swift
//  DittoChatDemo
//
//  Created by Bryan Malumphy on 9/3/25.
//

import SwiftUI
import UserNotifications
import DittoChatCore

// MARK: - Notification name used to route a notification tap to ContentView

extension Notification.Name {
    /// Posted by AppDelegate when the user taps a DittoChat notification.
    /// `userInfo` contains `"roomId": String`.
    static let dittoChatOpenRoom = Notification.Name("dittoChatOpenRoom")
}

// MARK: - App Delegate

/// Handles UIKit lifecycle callbacks that SwiftUI's `@main App` cannot intercept directly:
/// - Sets this class as the `UNUserNotificationCenter` delegate so the SDK's local
///   notifications display correctly both in the foreground and on tap.
/// - Broadcasts a `dittoChatOpenRoom` notification when the user taps a message banner,
///   which `ContentView` observes to navigate to the appropriate room.
class AppDelegate: NSObject, UIApplicationDelegate {

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        UNUserNotificationCenter.current().delegate = self
        return true
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
