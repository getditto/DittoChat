//
//  ContentViewModel.swift
//  DittoChatPackage
//
//  Created by Bryan Malumphy on 9/3/25.
//

import SwiftUI
import Combine
import DittoSwift
import DittoChatCore

@MainActor
final class ContentViewModel: ObservableObject {

    @Published private(set) var ditto: Ditto?
    @Published private(set) var dittoChat: DittoChat?
    @Published private(set) var projectMetadata: ProjectMetadata

    init() {
        projectMetadata = ProjectMetadata()
        Task { await setup() }
    }

    private func setup() async {
        do {
            let dittoInstance = try await dittoInstanceForProject(projectMetadata)
            ditto = dittoInstance

            dittoChat = try DittoChat.builder()
                .setDitto(dittoInstance)
                .setUserId(projectMetadata.userId)
                .build()
        } catch {
            #if DEBUG
            print("Error setting up Ditto: \(error)")
            #else
            assertionFailure("Error setting up Ditto: \(error)")
            #endif
        }
    }

    nonisolated func dittoDirectory(forId projectId: String) throws -> URL {
        try FileManager.default.url(
            for: .applicationSupportDirectory,
            in: .userDomainMask,
            appropriateFor: nil,
            create: true
        ).appendingPathComponent(projectId)
    }

    private func dittoInstanceForProject(_ proj: ProjectMetadata) async throws -> Ditto {

        let directory = try dittoDirectory(forId: proj.id)

        if ditto != nil {
            throw DittoError.unsupportedError(message: "Ditto Already Initialized")
        }

        // v5 `.server(url:)` takes the HTTPS base URL of the Ditto Server; the SDK derives the
        // WebSocket (wss) sync transport and the auth challenge endpoint from it internally.
        guard let serverURL = URL(string: "https://" + proj.cloudUrl) else {
            throw DittoError.unsupportedError(message: "Invalid cloud URL: \(proj.cloudUrl)")
        }

        // v5: DittoIdentity / transportConfig / disableSyncWithV3 are removed. The app ID is the
        // databaseID, the Big Peer connection is expressed via `.server(url:)`, and authentication
        // moves to `auth.login(token:provider:)` after the store is opened.
        let config = DittoConfig(
            databaseID: proj.appID,
            connect: .server(url: serverURL),
            persistenceDirectory: directory
        )

        do {
            let dittoInstance = try await Ditto.open(config: config)

            DittoLogger.minimumLogLevel = .debug

            // v5: authentication moves out of the identity and onto an expiration handler.
            // The handler fires once for the initial login (timeUntilExpiration == 0) and again
            // before the session token expires, so it covers both initial auth and refresh.
            let token = proj.token
            dittoInstance.auth?.expirationHandler = { ditto, _ in
                ditto.auth?.login(token: token, provider: .development) { _, error in
                    if let error {
                        print("Ditto auth login error: \(error)")
                    }
                }
            }

            // v5 defaults to DQL_STRICT_MODE = false; set it explicitly before sync starts.
            try await dittoInstance.store.execute(query: "ALTER SYSTEM SET DQL_STRICT_MODE = false")

            try dittoInstance.sync.start()

            return dittoInstance
        } catch {
            throw DittoError.unsupportedError(message: "Ditto setup failed with error: \(error)")
        }
    }
}
