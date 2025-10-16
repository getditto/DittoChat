//
//  ErrorHandler.swift
//  DittoChat
//
//  Created by Ralf Ebert on 07/29/21.
//  Copyright © 2021 DittoLive Incorporated. All rights reserved.
//
//  https://www.ralfebert.com/swiftui/generic-error-handling/

import SwiftUI
import DittoChatCore

public struct ErrorAlert: Identifiable {
    public var id = UUID()
    public var message: String
    public var title: String?
    public var dismissAction: (() -> Void)?
}

public class ErrorHandler: ObservableObject {
    @Published var currentAlert: ErrorAlert?

    public init(currentAlert: ErrorAlert? = nil) {
        self.currentAlert = currentAlert
    }

    public func handle(error: Error, title: String? = nil) {
        currentAlert = ErrorAlert(message: error.localizedDescription, title: title)
    }
}

struct HandleErrorsByShowingAlertViewModifier: ViewModifier {
    @StateObject var errorHandler = ErrorHandler()

    func body(content: Content) -> some View {
        content
            .environmentObject(errorHandler)
            // Applying the alert for error handling using a background element
            // is a workaround, if the alert would be applied directly,
            // other .alert modifiers inside of content would not work anymore
            .background(
                EmptyView()
                    .alert(item: $errorHandler.currentAlert) { currentAlert in
                        Alert(
                            title: Text(currentAlert.title ?? errorTitleKey),
                            message: Text(currentAlert.message),
                            dismissButton: .default(Text(dismissTitleKey)) {
                                currentAlert.dismissAction?()
                            }
                        )
                    }
            )
    }
}

public extension View {
    @MainActor func withErrorHandling() -> some View {
        modifier(HandleErrorsByShowingAlertViewModifier())
    }
}
