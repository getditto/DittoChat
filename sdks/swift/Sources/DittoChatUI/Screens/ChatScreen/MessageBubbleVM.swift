//
//  MessageBubbleVM.swift
//  DittoChat
//
//  Created by Eric Turner on 2/27/23.
//  Copyright © 2023 DittoLive Incorporated. All rights reserved.
//

import Combine
import DittoSwift
import SwiftUI
import DittoChatCore

@MainActor
class MessageBubbleVM: ObservableObject {
    @Published private(set) var thumbnailImage: Image?
    @Published var thumbnailProgress: Double = 0
    @Published var fetchProgress: Double = 0
    @Published private(set) var fileURL: URL? = nil
    @Published private(set) var message: Message
    @Published var presentDeleteAlert = false
    private let messagesId: String
    private var tmpStorage: TemporaryFile?
    private let dittoChat: DittoChat

    init(_ msg: Message, messagesId: String, dittoChat: DittoChat) {
        self.message = msg
        self.messagesId = messagesId
        self.dittoChat = dittoChat

        dittoChat.messagePublisher(for: message.id, in: messagesId)
            .receive(on: RunLoop.main)
            .assign(to: &$message)
    }

    func cleanupStorage() async throws {
        if let storage = tmpStorage {
            Task {
                do {
                    try storage.deleteDirectory()
                } catch {
                    throw error
                }
            }
        }
    }

    func fetchAttachment(type: AttachmentType) async {
        guard let token = type == .largeImage
            ? message.largeImageToken
            : message.thumbnailImageToken
        else { return }

        // Bridge Ditto's callback-based fetch into an AsyncStream. The fetch is started here on
        // the main actor; its @Sendable callback — which Ditto may invoke on a background thread —
        // performs the blocking `data()` read off-main and yields Sendable updates. We consume
        // them back on the main actor via `for await`, so UI state is updated with no manual
        // thread hopping or `assumeIsolated` assertions.
        let (updates, continuation) = AsyncStream.makeStream(of: AttachmentUpdate.self)

        let fetcher: DittoAttachmentFetcher?
        do {
            fetcher = try dittoChat.fetchAttachment(token: token) { event in
                switch event {
                case .progress(let downloadedBytes, let totalBytes):
                    let ratio = totalBytes > 0 ? Double(downloadedBytes) / Double(totalBytes) : 0
                    continuation.yield(.progress(ratio))
                case .completed(let attachment):
                    if let data = try? attachment.data() {
                        continuation.yield(.image(data, metadata: attachment.metadata))
                    } else {
                        continuation.yield(.failed)
                    }
                    continuation.finish()
                case .deleted:
                    continuation.yield(.failed)
                    continuation.finish()
                @unknown default:
                    continuation.yield(.failed)
                    continuation.finish()
                }
            }
        } catch {
            print("MessageBubbleVM.fetchAttachment: failed to start fetch: \(error)")
            fetcher = nil
            continuation.yield(.failed)
            continuation.finish()
        }

        // Keep the fetcher alive for the lifetime of the stream.
        continuation.onTermination = { @Sendable _ in _ = fetcher }

        for await update in updates {
            switch update {
            case .progress(let ratio):
                switch type {
                case .thumbnailImage: thumbnailProgress = ratio
                case .largeImage: fetchProgress = ratio
                }

            case .image(let data, let metadata):
                guard let uiImage = UIImage(data: data) else {
                    if type == .thumbnailImage { setThumbnailFailImage() }
                    continue
                }
                switch type {
                case .thumbnailImage:
                    thumbnailImage = Image(uiImage: uiImage)
                case .largeImage:
                    saveLargeImage(uiImage, metadata: metadata)
                }

            case .failed:
                if type == .thumbnailImage { setThumbnailFailImage() }
            }
        }
    }

    private func saveLargeImage(_ uiImage: UIImage, metadata: [String: String]) {
        let fname = metadata[filenameKey] ?? unnamedLargeImageFileKey
        guard let tmp = try? TemporaryFile(creatingTempDirectoryForFilename: fname) else {
            print("MessageBubbleVM.saveLargeImage: ERROR creating tmpStorage")
            return
        }
        tmpStorage = tmp
        if (try? uiImage.jpegData(compressionQuality: 1.0)?.write(to: tmp.fileURL)) != nil {
            fileURL = tmp.fileURL
        } else {
            print("MessageBubbleVM.saveLargeImage: Error writing JPG attachment data to \(tmp.fileURL.path)")
        }
    }

    private func setThumbnailFailImage() {
        thumbnailImage = Image(uiImage: UIImage(systemName: messageImageFailKey)!)
    }

    func closeTemporaryStorage() {
        if let storage = tmpStorage {
            do {
                try storage.deleteDirectory()
            } catch {
                print("MessageBubbleVM.deinit: Error: \(AttachmentError.tmpStorageCleanupFail.localizedDescription)")
            }
        }
    }
}

/// Sendable updates bridged from Ditto's attachment-fetch callback (which may run off the main
/// thread) to the main-actor consumer in `MessageBubbleVM.fetchAttachment(type:)`.
private enum AttachmentUpdate: Sendable {
    case progress(Double)
    case image(Data, metadata: [String: String])
    case failed
}
