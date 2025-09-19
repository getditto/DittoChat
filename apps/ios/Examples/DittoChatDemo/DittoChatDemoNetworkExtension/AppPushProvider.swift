//
//  AppProxyProvider.swift
//  DittoChatDemoNetworkExtension
//
//  Created by Bryan Malumphy on 9/18/25.
//

import NetworkExtension
import UserNotifications

class AppPushProvider: NEAppPushProvider {

    override func start(completionHandler: @escaping (Error?) -> Void) {
        completionHandler(nil)
    }

    override func start() {

    }
    
    override func wake() {

    }
}

extension AppPushProvider {

    override func reportPushToTalkMessage(userInfo: [AnyHashable : Any]) {
        NSLog("AppPushProvider: Received push with userInfo: \(userInfo)")

        // Process the push notification
        handlePushNotification(userInfo: userInfo)
    }

    private func handlePushNotification(userInfo: [AnyHashable: Any]) {
        // Extract relevant data from the push payload
        guard let aps = userInfo["aps"] as? [String: Any] else {
            NSLog("AppPushProvider: No aps dictionary found")
            return
        }

        // Check if we need to wake the main app
        if shouldWakeMainApp(userInfo: userInfo) {
            wakeMainApp(with: userInfo)
        }

        // Optionally show a local notification
        if shouldShowNotification(userInfo: userInfo) {
            showLocalNotification(from: userInfo)
        }
    }

    private func showLocalNotification(from pushInfo: [AnyHashable: Any]) {
        let content = UNMutableNotificationContent()

        // Configure notification content from push payload
        if let aps = pushInfo["aps"] as? [String: Any] {
            if let alert = aps["alert"] as? [String: Any] {
                content.title = alert["title"] as? String ?? ""
                content.body = alert["body"] as? String ?? ""
            } else if let alertString = aps["alert"] as? String {
                content.body = alertString
            }

            if let badge = aps["badge"] as? NSNumber {
                content.badge = badge
            }

            if let sound = aps["sound"] as? String {
                content.sound = UNNotificationSound(named: UNNotificationSoundName(sound))
            } else {
                content.sound = .default
            }
        }

        // Add custom data to pass to the main app
        content.userInfo = pushInfo

        // Create and deliver the notification
        let request = UNNotificationRequest(
            identifier: UUID().uuidString,
            content: content,
            trigger: nil // Deliver immediately
        )

        let center = UNUserNotificationCenter.current()
        center.add(request) { error in
            if let error = error {
                NSLog("AppPushProvider: Error showing notification: \(error)")
            } else {
                NSLog("AppPushProvider: Notification scheduled successfully")
            }
        }
    }
    
    private func shouldWakeMainApp(userInfo: [AnyHashable: Any]) -> Bool {
        // Implement your logic to determine if the main app should be woken
        // For example, check for specific payload keys or values
        return userInfo["wakeApp"] as? Bool ?? false
    }

    private func shouldShowNotification(userInfo: [AnyHashable: Any]) -> Bool {
        // Determine if a user-facing notification should be shown
        return userInfo["showNotification"] as? Bool ?? true
    }

    private func wakeMainApp(with userInfo: [AnyHashable: Any]) {
        // Share data via App Groups
        if let sharedDefaults = UserDefaults(suiteName: "group.com.ditto.DittoChatDemo") {
            sharedDefaults.set(userInfo, forKey: "pendingPushData")
            sharedDefaults.set(Date(), forKey: "pushReceivedTime")

            // Post a Darwin notification to wake the app
            postDarwinNotification()
        }
    }

    private func postDarwinNotification() {
        let notificationName = "com.ditto.DittoChatDemo.pushReceived" as CFString
        CFNotificationCenterPostNotification(
            CFNotificationCenterGetDarwinNotifyCenter(),
            CFNotificationName(notificationName),
            nil,
            nil,
            true
        )
    }
}
