//
//  Utils.swift
//  DittoChat
//
//  Created by Eric Turner on 12/22/22.
//  Copyright © 2022 DittoLive Incorporated. All rights reserved.
//

import Combine
import CoreImage.CIFilterBuiltins
import UIKit

extension DateFormatter {
    public static var shortTime: DateFormatter {
        let format = DateFormatter()
        format.timeStyle = .short
        return format
    }

    static var isoDate: ISO8601DateFormatter {
        let format = ISO8601DateFormatter()
        return format
    }

    static var isoDateFull: ISO8601DateFormatter {
        let format = self.isoDate
        format.formatOptions = [.withFullDate]
        return format
    }
}

extension String {
    //  Credit to Paul Hudson
    //  https://www.hackingwithswift.com/books/ios-swiftui/generating-and-scaling-up-a-qr-code
    func generateQRCode() -> UIImage {
        let context = CIContext()
        let filter = CIFilter.qrCodeGenerator()

        filter.message = Data(self.utf8)

        if let outputImage = filter.outputImage {
            if let cgimg = context.createCGImage(outputImage, from: outputImage.extent) {
                return UIImage(cgImage: cgimg)
            }
        }
        return UIImage(systemName: "xmark.circle") ?? UIImage()
    }

    public func isValidInput(_ input: String) -> Bool {
        let characterLimit = 2500
        guard input.count <= characterLimit else {
            return false
        }

        let regex = try? NSRegularExpression(pattern: "\\A([\\x09\\x0A\\x0D\\x20-\\x7E]|[\\xC2-\\xDF][\\x80-\\xBF]|\\xE0[\\xA0-\\xBF][\\x80-\\xBF]|[\\xE1-\\xEC\\xEE\\xEF][\\x80-\\xBF]{2}|\\xED[\\x80-\\x9F][\\x80-\\xBF]|\\xF0[\\x90-\\xBF][\\x80-\\xBF]{2}|[\\xF1-\\xF3][\\x80-\\xBF]{3}|\\xF4[\\x80-\\x8F][\\x80-\\xBF]{2})*\\z", options: [])
        return regex?.firstMatch(in: input, options: [], range: NSRange(location: 0, length: input.utf16.count)) != nil
    }
}

extension String {
    func trim() -> String {
        self.trimmingCharacters(in: .whitespacesAndNewlines)
    }
}

extension Bundle {
    var appName: String {
        if let displayName: String = self.infoDictionary?["CFBundleDisplayName"] as? String {
            return displayName
        } else if let name: String = self.infoDictionary?["CFBundleName"] as? String {
            return name
        }
        return "Ditto Chat"
    }

    var appVersion: String {
        Bundle.main.object(
            forInfoDictionaryKey: "CFBundleShortVersionString"
        ) as? String ?? notAvailableLabelKey
    }

    var appBuild: String {
        Bundle.main.object(
            forInfoDictionaryKey: "CFBundleVersion"
        ) as? String ?? notAvailableLabelKey
    }
}

public enum KeyboardChangeEvent {
    case willShow, didShow, willHide, didHide, unchanged
}

#if !os(tvOS)
// https://www.vadimbulavin.com/how-to-move-swiftui-view-when-keyboard-covers-text-field/
extension Publishers {
    @MainActor
    public static var keyboardStatus: AnyPublisher<KeyboardChangeEvent, Never> {
        let willShow = NotificationCenter.default.publisher(for: UIApplication.keyboardWillShowNotification)
            .map { _ in KeyboardChangeEvent.willShow }

        let didShow = NotificationCenter.default.publisher(for: UIApplication.keyboardDidShowNotification)
            .map { _ in KeyboardChangeEvent.didShow }

        let willHide = NotificationCenter.default.publisher(for: UIApplication.keyboardWillHideNotification)
            .map { _ in KeyboardChangeEvent.willHide }

        let didHide = NotificationCenter.default.publisher(for: UIApplication.keyboardDidHideNotification)
            .map { _ in KeyboardChangeEvent.didHide }

        return MergeMany(willShow, didShow, willHide, didHide)
            .eraseToAnyPublisher()
    }
}
#endif
