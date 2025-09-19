//
//  AppDelegate.swift
//  DittoChatDemo
//
//  Created by Bryan Malumphy on 9/18/25.
//

import UIKit
import UserNotifications
import NetworkExtension

class AppDelegate: UIResponder, UIApplicationDelegate {

    func application(_ application: UIApplication,
                    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {

        configureAppPushProvider()

        // Configure notification handling
        configureNotifications()

        // Listen for Darwin notifications from extension
        registerForDarwinNotifications()


        return true
    }

    private func configureNotifications() {
        UNUserNotificationCenter.current().delegate = self

        // Request notification permissions
        UNUserNotificationCenter.current().requestAuthorization(
            options: [.alert, .badge, .sound]
        ) { granted, error in
            print("Notification permission granted: \(granted)")
        }
    }

    private func registerForDarwinNotifications() {
        let notificationName = "com.yourcompany.yourapp.pushReceived" as CFString

        CFNotificationCenterAddObserver(
            CFNotificationCenterGetDarwinNotifyCenter(),
            Unmanaged.passUnretained(self).toOpaque(),
            { center, observer, name, object, userInfo in
                // Handle notification from extension
                DispatchQueue.main.async {
                    self.handleExtensionNotification()
                }
            },
            notificationName,
            nil,
            .deliverImmediately
        )
    }

    private func handleExtensionNotification() {
        // Retrieve shared data from App Groups
        if let sharedDefaults = UserDefaults(suiteName: "group.com.yourcompany.yourapp"),
           let pushData = sharedDefaults.dictionary(forKey: "pendingPushData") {

            print("Received push data from extension: \(pushData)")

            // Process the push data
            processPushData(pushData)

            // Clean up
            sharedDefaults.removeObject(forKey: "pendingPushData")
        }
    }
}

// MARK: - UNUserNotificationCenterDelegate
extension AppDelegate: UNUserNotificationCenterDelegate {

    func userNotificationCenter(_ center: UNUserNotificationCenter,
                               willPresent notification: UNNotification,
                               withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        // Handle notification while app is in foreground
        completionHandler([.banner, .badge, .sound])
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter,
                               didReceive response: UNNotificationResponse,
                               withCompletionHandler completionHandler: @escaping () -> Void) {
        // Handle notification tap
        let userInfo = response.notification.request.content.userInfo
        processPushData(userInfo)
        completionHandler()
    }

    func configureAppPushProvider() {
        let manager = NEAppPushManager()
        manager.loadFromPreferences { error in
            if let error = error {
                print("Error loading preferences: \(error)")
            }

            manager.providerConfiguration = [
                "serverAddress": "your-server.com"
            ]
            manager.isEnabled = true

            manager.saveToPreferences { error in
                if let error = error {
                    print("Error saving configuration: \(error)")
                } else {
                    print("App Push Provider configured successfully")
                }
            }
        }
    }
}
