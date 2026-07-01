///
//  Publishers.swift
//  DittoChat
//
//  Created by Walker Erekson on 1/12/24.
//
//  Copyright © 2024 DittoLive Incorporated. All rights reserved.

import Foundation
import Combine
import DittoSwift

typealias DittoQuery = (string: String, args: [String: Any?])

protocol DittoDecodable {
    init(value: [String: Any?])
}

// MARK: - Extensions of `execute`
extension DittoStore {

    // Emit with mapped objects as an array
    func executePublisher<T: DittoDecodable>(query: String, arguments: Dictionary<String, Any?>? = [:], mapTo: T.Type) async -> [T] {
            do {
                let result = try await self.execute(query: query, arguments: arguments ?? [:])
                let items = result.items.compactMap { item -> T? in
                    let mapped = T(value: item.value)
                    item.dematerialize() // v5: free native memory backing the result item
                    return mapped
                }
                return items
            } catch {
                return []
            }
    }

    // Emit with a mapped object as a single value instead of an array
    func executePublisher<T: DittoDecodable>(query: String, arguments: Dictionary<String, Any?>? = [:], mapTo: T.Type, onlyFirst: Bool) async throws ->T? {
        do {
            let result = try await self.execute(query: query, arguments: arguments ?? [:])
            guard let first = result.items.first else { return nil }
            let item = T(value: first.value)
            first.dematerialize() // v5: free native memory backing the result item
            return item
        } catch {
            throw error
        }
    }
}

// MARK: - Extensions of `registerObserver`
extension DittoStore {

    // Send mapped objects as an array
    //
    // NOTE: Despite `deliverOn: .main` being the default, the Ditto runtime delivers callbacks on
    // an internal utility-qos thread in Xcode 26 / Swift 6.3. All callers use the result for
    // @MainActor-isolated state (DittoService.allPublicRooms, ViewModel @Published properties),
    // so we force delivery onto DispatchQueue.main here rather than relying on the Ditto parameter.
    @MainActor
    func observePublisher<T: DittoDecodable>(query: String, arguments: [String : Any?]? = nil, deliverOn queue: DispatchQueue = .main, mapTo: T.Type) -> AnyPublisher<[T], Error> {
        let subject = PassthroughSubject<[T], Error>()

        // v5.1: registerObserver's handler is `@Sendable`, so it can't capture the
        // non-Sendable PassthroughSubject. `DittoQueryResult` and `AsyncStream.Continuation`
        // are both Sendable, so the handler only forwards the raw result into the stream;
        // the @MainActor task below maps it and feeds the subject in a single isolation domain.
        let (stream, continuation) = AsyncStream.makeStream(of: DittoQueryResult.self)

        do {
            try self.registerObserver(query: query, arguments: arguments, deliverOn: queue) { result in
                continuation.yield(result)
            }
        } catch {
            continuation.finish()
            subject.send(completion: .failure(error))
        }

        Task { @MainActor in
            for await result in stream {
                let items = result.items.compactMap { item -> T? in
                    let mapped = T(value: item.value)
                    item.dematerialize() // v5: free native memory backing the result item
                    return mapped
                }
                subject.send(items)
            }
        }

        return subject.eraseToAnyPublisher()
    }

    // Send a mapped object as a single value instead of an array
    @MainActor
    func observePublisher<T: DittoDecodable>(query: String, arguments: [String : Any?]? = nil, deliverOn queue: DispatchQueue = .main, mapTo: T.Type, onlyFirst: Bool) -> AnyPublisher<T?, Error> {
        let subject = PassthroughSubject<T?, Error>()

        // v5.1: see the array variant above — the @Sendable handler only forwards the
        // Sendable result into the stream; mapping and subject delivery happen here.
        let (stream, continuation) = AsyncStream.makeStream(of: DittoQueryResult.self)

        do {
            try self.registerObserver(query: query, arguments: arguments, deliverOn: queue) { result in
                continuation.yield(result)
            }
        } catch {
            continuation.finish()
            subject.send(completion: .failure(error))
        }

        Task { @MainActor in
            for await result in stream {
                guard let first = result.items.first else {
                    subject.send(nil)
                    continue
                }
                let item = T(value: first.value)
                first.dematerialize() // v5: free native memory backing the result item
                subject.send(item)
            }
        }

        return subject.eraseToAnyPublisher()
    }
}
