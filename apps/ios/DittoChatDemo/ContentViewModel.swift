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

final class ContentViewModel: ObservableObject {

    @Published private(set) var ditto: Ditto?
    @Published private(set) var projectMetadata: ProjectMetadata

    init() {
        projectMetadata = ProjectMetadata()
        setup()
    }

    private func setup() {
        do {
            let dittoInstance = try dittoInstanceForProject(projectMetadata)
            ditto = dittoInstance
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
            for:
            .applicationSupportDirectory,
            in: .userDomainMask,
            appropriateFor: nil,
            create: true
        ).appendingPathComponent(projectId)
    }

    private func dittoInstanceForProject(_ proj: ProjectMetadata) throws -> Ditto {

        let directory = try dittoDirectory(forId: proj.id)

        if ditto != nil {
            throw DittoError.unsupportedError(message: "Ditto Already Initialized")
        }

        let dittoIdentity: DittoIdentity =
            .onlinePlayground(appID: proj.appID,
                              token: proj.token,
                              enableDittoCloudSync: true,
                              customAuthURL: URL(string: "https://" + proj.cloudUrl))

        let dittoInstance = Ditto(identity: dittoIdentity, persistenceDirectory: directory)

        dittoInstance.transportConfig.connect.webSocketURLs = ["wss://" + proj.cloudUrl]

        do {
            try dittoInstance.disableSyncWithV3()
            DittoLogger.minimumLogLevel = .debug
            try dittoInstance.sync.start()

            return dittoInstance
        } catch {
            throw DittoError.unsupportedError(message: "Ditto setup failed with error: \(error)")
        }
    }
}
